import { getApiKey, getSettings, addAnalysisRecord } from '@/lib/storage';
import { updateStatisticsAfterAnalysis } from '@/lib/storage';
import { shouldRemindToday, markReminderShown } from '@/lib/storage';
import type { AnalysisResult } from '@/lib/types';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '@/lib/prompts';
import { makeRequest, cancelRequest, createRequestId } from '@/lib/network';
import type {
  Message,
  AnalyzeTextResponse,
  ExtractContentResponse,
  HighlightTextResponse,
  ClearHighlightsResponse,
} from '@/lib/messages';
import { syncAfterAnalysis } from '@/lib/github-sync';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const activeAnalysisRequests: Map<string, string> = new Map();

async function analyzeWithDeepSeek(text: string, requestId?: string): Promise<AnalyzeTextResponse> {
  const apiKey = await getApiKey();
  const settings = await getSettings();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'API Key not configured. Please set your DeepSeek API key in settings.',
      errorType: 'invalid_key',
    };
  }

  const analysisRequestId = requestId || createRequestId();
  activeAnalysisRequests.set(analysisRequestId, analysisRequestId);

  try {
    const response = await makeRequest<{
      choices: Array<{
        message: {
          content: string;
        };
      }>;
      error?: {
        message: string;
      };
    }>(
      DEEPSEEK_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: ANALYSIS_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: buildAnalysisPrompt(text, {
                vocabLevels: settings.vocabLevels,
                maxIdioms: settings.maxIdioms,
                maxSyntax: settings.maxSyntax,
                maxVocabulary: settings.maxVocabulary,
              }),
            },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        }),
      },
      {
        requestId: analysisRequestId,
        config: {
          timeout: 120000,
          maxRetries: 2,
          retryDelay: 2000,
          retryOnStatusCodes: [429, 500, 502, 503, 504],
        },
      }
    );

    activeAnalysisRequests.delete(analysisRequestId);

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Analysis failed',
        errorType: response.errorType,
        retryAfter: response.retryAfter,
      };
    }

    const data = response.data;
    const content = data?.choices?.[0]?.message?.content;
    
    if (!content) {
      return {
        success: false,
        error: 'No response content from DeepSeek API',
        errorType: 'api_error',
      };
    }

    const analysis: AnalysisResult = JSON.parse(content);

    if (!analysis.idioms || !analysis.syntax || !analysis.vocabulary) {
      return {
        success: false,
        error: 'Invalid analysis format received from API',
        errorType: 'api_error',
      };
    }

    const allowed = new Set(settings.vocabLevels);
    analysis.vocabulary = (analysis.vocabulary || []).filter((v) => allowed.has(v.level));
    analysis.idioms = (analysis.idioms || []).slice(0, settings.maxIdioms);
    analysis.syntax = (analysis.syntax || []).slice(0, settings.maxSyntax);
    analysis.vocabulary = analysis.vocabulary.slice(0, settings.maxVocabulary);

    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    activeAnalysisRequests.delete(analysisRequestId);

    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Failed to parse API response as JSON',
        errorType: 'api_error',
      };
    }
    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      errorType: 'unknown',
    };
  }
}

async function sendToContentScript<T>(message: Message): Promise<T> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  
  return await browser.tabs.sendMessage(tab.id, message);
}

async function checkAndSendReminder(): Promise<void> {
  const shouldRemind = await shouldRemindToday();
  if (shouldRemind) {
    try {
      await browser.notifications.create({
        type: 'basic',
        iconUrl: '/icon/128.png',
        title: 'Nuance - Time to Learn',
        message: 'Don\'t forget to practice your English today! Open an article and start learning.',
      });
      await markReminderShown();
    } catch (e) {
      console.log('Notification not available, skipping reminder');
    }
  }
}

export default defineBackground(() => {
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });

  browser.alarms?.onAlarm?.addListener(async (alarm) => {
    if (alarm.name === 'nuance-reminder-check') {
      await checkAndSendReminder();
    }
  });

  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case 'EXTRACT_CONTENT': {
            const response = await sendToContentScript<ExtractContentResponse>(message);
            sendResponse(response);
            break;
          }
          
          case 'ANALYZE_TEXT': {
            const response = await analyzeWithDeepSeek(message.text, message.requestId);
            
            if (response.success && response.data) {
              const articleData = {
                title: 'Analyzed Content',
                url: _sender.tab?.url || '',
                analysis: response.data,
              };
              
              try {
                await addAnalysisRecord(articleData);
                await updateStatisticsAfterAnalysis(
                  response.data.vocabulary.length,
                  response.data.idioms.length,
                  response.data.syntax.length
                );
                await syncAfterAnalysis();
              } catch (error) {
                console.error('Failed to save analysis record:', error);
              }
            }
            
            sendResponse(response);
            break;
          }

          case 'CANCEL_ANALYSIS': {
            const cancelled = cancelRequest(message.requestId);
            activeAnalysisRequests.delete(message.requestId);
            sendResponse({ success: cancelled });
            break;
          }
          
          case 'HIGHLIGHT_TEXT': {
            const response = await sendToContentScript<HighlightTextResponse>(message);
            sendResponse(response);
            break;
          }
          
          case 'CLEAR_HIGHLIGHTS': {
            const response = await sendToContentScript<ClearHighlightsResponse>(message);
            sendResponse(response);
            break;
          }
          
          default:
            sendResponse({ success: false, error: 'Unknown message type' });
        }
      } catch (error) {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })();
    
    return true;
  });

  browser.runtime.onInstalled.addListener(async () => {
    try {
      await browser.alarms?.create?.('nuance-reminder-check', {
        periodInMinutes: 60,
        delayInMinutes: 1,
      });
    } catch (e) {
      console.log('Alarms API not available');
    }
  });

  console.log('[Nuance] Background service worker started');
});
