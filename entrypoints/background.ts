import { getApiKey, getSettings } from '@/lib/storage';
import type { AnalysisResult } from '@/lib/types';
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, buildSelectionAnalysisPrompt } from '@/lib/prompts';
import type {
  Message,
  AnalyzeTextResponse,
  ExtractContentResponse,
  HighlightTextResponse,
  ClearHighlightsResponse,
  AnalyzeSelectionRequest,
  AnalyzeSelectionResponse,
  UpdateContextMenusMessage,
} from '@/lib/messages';

const MENU_TITLES = {
  en: {
    main: 'Nuance AI Analysis',
    vocab: 'Add to Vocabulary',
    idiom: 'Add to Idioms',
    syntax: 'Add to Syntax',
  },
  zh: {
    main: 'Nuance AI 分析',
    vocab: '添加到词汇',
    idiom: '添加到习语',
    syntax: '添加到语法',
  },
};

function createContextMenus(lang: 'en' | 'zh') {
  const titles = MENU_TITLES[lang];
  
  browser.contextMenus.create({
    id: 'nuance-analyze-selection',
    title: titles.main,
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'nuance-add-vocabulary',
    parentId: 'nuance-analyze-selection',
    title: titles.vocab,
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'nuance-add-idioms',
    parentId: 'nuance-analyze-selection',
    title: titles.idiom,
    contexts: ['selection'],
  });

  browser.contextMenus.create({
    id: 'nuance-add-syntax',
    parentId: 'nuance-analyze-selection',
    title: titles.syntax,
    contexts: ['selection'],
  });
}

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

// Analyze selected text with context-aware prompting
async function analyzeSelection(text: string, targetCategory: 'vocabulary' | 'idioms' | 'syntax'): Promise<AnalyzeSelectionResponse> {
  const apiKey = await getApiKey();
  
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
            content: buildSelectionAnalysisPrompt(text, targetCategory),
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
    
    const parsed = JSON.parse(content);
    return {
      success: true,
      data: {
        selection: text,
        category: targetCategory,
        result: parsed,
      },
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
  // Create context menus for right-click analysis
  // Use removeAll first to avoid duplicate menu items on service worker restart
  // Default to English, will be updated when sidepanel loads
  browser.contextMenus.removeAll(() => {
    createContextMenus('en');
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    const menuItemId = info.menuItemId;
    let targetCategory: 'vocabulary' | 'idioms' | 'syntax' | null = null;

    if (menuItemId === 'nuance-add-vocabulary') {
      targetCategory = 'vocabulary';
    } else if (menuItemId === 'nuance-add-idioms') {
      targetCategory = 'idioms';
    } else if (menuItemId === 'nuance-add-syntax') {
      targetCategory = 'syntax';
    }

    if (!targetCategory || !info.selectionText) return;

    // Send message to sidepanel to show analysis modal
    await browser.runtime.sendMessage({
      type: 'SHOW_SELECTION_ANALYSIS',
      selection: info.selectionText,
      targetCategory,
      tabId: tab.id,
    });
  });

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
          
          case 'ANALYZE_SELECTION': {
            const response = await analyzeSelection(message.text, message.category);
            sendResponse(response);
            break;
          }
          
          case 'UPDATE_CONTEXT_MENUS': {
            const lang = message.language;
            browser.contextMenus.removeAll(() => {
              createContextMenus(lang);
            });
            sendResponse({ success: true });
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
