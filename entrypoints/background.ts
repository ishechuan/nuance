import { signInWithEmail, signOut, getAuthState } from '@/lib/auth';
import { supabase, initializeSession, getStoredSession, getCurrentUser, SUPABASE_URL } from '@/lib/supabase';
import {
  addFavorite,
  removeFavorite,
  checkIsFavorited,
  getFavoritesByArticle,
  getFavoritesByExpression,
  searchFavorites,
  getArticleFavorites,
} from '@/lib/favorites';
import type { 
  Message, 
  AnalyzeTextResponse, 
  ExtractContentResponse,
  HighlightTextResponse,
  ClearHighlightsResponse,
  SignInEmailResponse,
  SignOutResponse,
  GetAuthStateResponse,
  AddFavoriteResponse,
  RemoveFavoriteResponse,
  CheckIsFavoritedResponse,
  GetFavoritesByArticleResponse,
  GetFavoritesByExpressionResponse,
  SearchFavoritesResponse,
  GetArticleFavoritesResponse,
} from '@/lib/messages';
import type { AnalysisResult } from '@/lib/storage';

// Call Supabase Edge Function for analysis
async function analyzeWithEdgeFunction(text: string): Promise<AnalyzeTextResponse> {
  const session = await getStoredSession();
  
  if (!session) {
    return {
      success: false,
      error: '请先登录后再进行分析',
    };
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error codes
      if (data.code === 'DAILY_LIMIT_EXCEEDED') {
        return {
          success: false,
          error: data.message || '今日免费次数已用完',
          code: data.code,
          usage: data.usage,
        };
      }
      return {
        success: false,
        error: data.error || `请求失败: ${response.status}`,
      };
    }
    
    return {
      success: true,
      data: data.data as AnalysisResult,
      usage: data.usage,
    };
  } catch (error) {
    return {
      success: false,
      error: `分析失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

// Send message to content script in active tab
async function sendToContentScript<T>(message: Message): Promise<T> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('未找到活动标签页');
  }

  // Check if it's a special page that doesn't allow content scripts
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || 
      url.startsWith('edge://') || url.startsWith('about:') ||
      url.startsWith('file://') || url === '') {
    throw new Error('此页面不支持分析，请在普通网页上使用');
  }
  
  try {
    return await browser.tabs.sendMessage(tab.id, message);
  } catch (error) {
    // Content script not loaded - try to inject it
    if (String(error).includes('Receiving end does not exist') ||
        String(error).includes('Could not establish connection')) {
      throw new Error('请刷新页面后重试（扩展更新后需要刷新页面）');
    }
    throw error;
  }
}

// Handle sign in with email
async function handleSignIn(email: string, password: string): Promise<SignInEmailResponse> {
  const { session, error } = await signInWithEmail(email, password);
  
  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }
  
  return {
    success: Boolean(session),
    error: session ? undefined : '登录失败',
  };
}

// Handle sign out
async function handleSignOut(): Promise<SignOutResponse> {
  await signOut();
  return { success: true };
}

// Handle get auth state
async function handleGetAuthState(): Promise<GetAuthStateResponse> {
  try {
    const authState = await getAuthState();
    
    if (!authState.isAuthenticated || !authState.user) {
      return {
        success: true,
        isAuthenticated: false,
      };
    }

    // Get usage count
    let usage = { used: 0, limit: 5, isPro: authState.profile?.is_pro || false };
    
    if (authState.profile) {
      const session = await getStoredSession();
      if (session) {
        try {
          const { data } = await supabase.rpc('get_daily_usage_count', { 
            p_user_id: authState.user.id 
          });
          usage.used = data || 0;
          if (authState.profile.is_pro) {
            usage.limit = null as unknown as number;
          }
        } catch (e) {
          console.error('Error fetching usage:', e);
        }
      }
    }

    return {
      success: true,
      isAuthenticated: true,
      user: {
        id: authState.user.id,
        email: authState.user.email || '',
        name: authState.user.user_metadata?.full_name || authState.user.user_metadata?.name,
        avatarUrl: authState.user.user_metadata?.avatar_url,
      },
      profile: {
        isPro: authState.profile?.is_pro || false,
      },
      usage,
    };
  } catch (error) {
    console.error('Error getting auth state:', error);
    return {
      success: false,
      isAuthenticated: false,
    };
  }
}

export default defineBackground(() => {
  // Initialize session on startup
  initializeSession().then((session) => {
    console.log('[Nuance] Session initialized:', session ? 'logged in' : 'not logged in');
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
            const response = await analyzeWithEdgeFunction(message.text);
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

          case 'SIGN_IN_EMAIL': {
            const response = await handleSignIn(message.email, message.password);
            sendResponse(response);
            break;
          }

          case 'SIGN_OUT': {
            const response = await handleSignOut();
            sendResponse(response);
            break;
          }

          case 'GET_AUTH_STATE': {
            const response = await handleGetAuthState();
            sendResponse(response);
            break;
          }

          case 'ADD_FAVORITE': {
            const user = await getCurrentUser();
            if (!user) {
              sendResponse({ success: false, error: '请先登录' } as AddFavoriteResponse);
              break;
            }
            const result = await addFavorite(
              user.id,
              message.articleUrl,
              message.articleTitle,
              message.favoriteType,
              message.content
            );
            sendResponse(result as AddFavoriteResponse);
            break;
          }

          case 'REMOVE_FAVORITE': {
            const result = await removeFavorite(message.favoriteId);
            sendResponse(result as RemoveFavoriteResponse);
            break;
          }

          case 'CHECK_IS_FAVORITED': {
            const user = await getCurrentUser();
            if (!user) {
              sendResponse({ success: true, isFavorited: false } as CheckIsFavoritedResponse);
              break;
            }
            const result = await checkIsFavorited(
              user.id,
              message.articleUrl,
              message.favoriteType,
              message.content
            );
            sendResponse({ success: true, ...result } as CheckIsFavoritedResponse);
            break;
          }

          case 'GET_FAVORITES_BY_ARTICLE': {
            const user = await getCurrentUser();
            if (!user) {
              sendResponse({ success: false, error: '请先登录' } as GetFavoritesByArticleResponse);
              break;
            }
            const data = await getFavoritesByArticle(user.id);
            sendResponse({ success: true, data } as GetFavoritesByArticleResponse);
            break;
          }

          case 'GET_FAVORITES_BY_EXPRESSION': {
            const user = await getCurrentUser();
            if (!user) {
              sendResponse({ success: false, error: '请先登录' } as GetFavoritesByExpressionResponse);
              break;
            }
            const data = await getFavoritesByExpression(user.id);
            sendResponse({ success: true, data } as GetFavoritesByExpressionResponse);
            break;
          }

          case 'SEARCH_FAVORITES': {
            const user = await getCurrentUser();
            if (!user) {
              sendResponse({ success: false, error: '请先登录' } as SearchFavoritesResponse);
              break;
            }
            const data = await searchFavorites(user.id, message.query);
            sendResponse({ success: true, data } as SearchFavoritesResponse);
            break;
          }

          case 'GET_ARTICLE_FAVORITES': {
            const user = await getCurrentUser();
            if (!user) {
              sendResponse({ success: true, favorites: {} } as GetArticleFavoritesResponse);
              break;
            }
            const favorites = await getArticleFavorites(user.id, message.articleUrl);
            sendResponse({ success: true, favorites } as GetArticleFavoritesResponse);
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
