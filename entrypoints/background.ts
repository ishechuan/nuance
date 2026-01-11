import { getApiKey, getSettings, type AnalysisResult } from '@/lib/storage';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from '@/lib/prompts';
import type { 
  Message, 
  AnalyzeTextResponse, 
  ExtractContentResponse,
  HighlightTextResponse,
  ClearHighlightsResponse
} from '@/lib/messages';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// Call DeepSeek API for analysis
async function analyzeWithDeepSeek(text: string): Promise<AnalyzeTextResponse> {
  const apiKey = await getApiKey();
  const settings = await getSettings();
  
  if (!apiKey) {
    return {
      success: false,
      error: 'API Key not configured. Please set your DeepSeek API key in settings.',
    };
  }
  
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
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
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API request failed with status ${response.status}`;
      return {
        success: false,
        error: errorMessage,
      };
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return {
        success: false,
        error: 'No response content from DeepSeek API',
      };
    }
    
    // Parse the JSON response
    const analysis: AnalysisResult = JSON.parse(content);
    
    // Validate the structure
    if (!analysis.idioms || !analysis.syntax || !analysis.vocabulary) {
      return {
        success: false,
        error: 'Invalid analysis format received from API',
      };
    }
    const allowed = new Set(settings.vocabLevels);
    analysis.vocabulary = (analysis.vocabulary || []).filter((v) => allowed.has(v.level));
    analysis.idioms = (analysis.idioms || []).slice(0, settings.maxIdioms);
    analysis.syntax = (analysis.syntax || []).slice(0, settings.maxSyntax);
    analysis.vocabulary = (analysis.vocabulary || []).slice(0, settings.maxVocabulary);
    
    return {
      success: true,
      data: analysis,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Failed to parse API response as JSON',
      };
    }
    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Send message to content script in active tab
async function sendToContentScript<T>(message: Message): Promise<T> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  
  return await browser.tabs.sendMessage(tab.id, message);
}

export default defineBackground(() => {
  // Handle extension icon click - open side panel
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      // Open the side panel for this tab
      await browser.sidePanel.open({ tabId: tab.id });
    }
  });
  
  // Handle messages from sidepanel
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
            const response = await analyzeWithDeepSeek(message.text);
            sendResponse(response);
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
    
    // Return true to indicate async response
    return true;
  });
  
  console.log('[Nuance] Background service worker started');
});
