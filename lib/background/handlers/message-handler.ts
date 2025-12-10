import { resolveAuthContext } from '../middleware/auth-middleware';
import { AppError, AuthError, UsageLimitError, ExternalServiceError } from '../errors';
import * as authService from '../services/auth-service';
import * as analysisService from '../services/analysis-service';
import * as favoriteService from '../services/favorite-service';
import type { FavoriteContent } from '../utils/content-helpers';
import type { 
  Message, 
  MessageResponse,
  ExtractContentResponse,
  HighlightTextResponse,
  ClearHighlightsResponse,
} from '@/lib/messages';

/**
 * Send message to content script in active tab
 */
async function sendToContentScript<T>(message: Message): Promise<T> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('未找到活动标签页');
  }

  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || 
      url.startsWith('edge://') || url.startsWith('about:') ||
      url.startsWith('file://') || url === '') {
    throw new Error('此页面不支持分析，请在普通网页上使用');
  }
  
  try {
    return await browser.tabs.sendMessage(tab.id, message);
  } catch (error) {
    if (String(error).includes('Receiving end does not exist') ||
        String(error).includes('Could not establish connection')) {
      throw new Error('请刷新页面后重试（扩展更新后需要刷新页面）');
    }
    throw error;
  }
}

/**
 * Main message handler - routes messages to appropriate services
 */
export async function handleMessage(message: Message): Promise<MessageResponse> {
  try {
    // Resolve auth context (throws if auth required but not present)
    const { userId } = await resolveAuthContext(message.type);
    
    switch (message.type) {
      // Content script operations (no auth required)
      case 'EXTRACT_CONTENT': {
        return await sendToContentScript<ExtractContentResponse>(message);
      }
      
      case 'HIGHLIGHT_TEXT': {
        return await sendToContentScript<HighlightTextResponse>(message);
      }
      
      case 'CLEAR_HIGHLIGHTS': {
        return await sendToContentScript<ClearHighlightsResponse>(message);
      }

      // Auth operations
      case 'SIGN_IN_EMAIL': {
        return await authService.handleSignIn(message.email, message.password);
      }

      case 'SIGN_OUT': {
        return await authService.handleSignOut();
      }

      case 'GET_AUTH_STATE': {
        return await authService.handleGetAuthState();
      }

      // Analysis operations (require auth)
      case 'ANALYZE_TEXT': {
        return await analysisService.analyzeText(message.text, message.url, message.title);
      }

      case 'GET_CACHED_ANALYSIS': {
        return await analysisService.getCachedAnalysis(message.url);
      }

      // Favorites operations (all require auth, userId guaranteed non-null by middleware)
      case 'ADD_FAVORITE': {
        return await favoriteService.addFavorite(
          userId!,
          message.articleUrl,
          message.articleTitle,
          message.favoriteType,
          message.content as FavoriteContent
        );
      }

      case 'REMOVE_FAVORITE': {
        return await favoriteService.removeFavorite(message.favoriteId);
      }

      case 'CHECK_IS_FAVORITED': {
        return await favoriteService.checkIsFavorited(
          userId!,
          message.articleUrl,
          message.favoriteType,
          message.content as FavoriteContent
        );
      }

      case 'GET_FAVORITES_BY_ARTICLE': {
        return await favoriteService.getFavoritesByArticle(userId!);
      }

      case 'GET_FAVORITES_BY_EXPRESSION': {
        return await favoriteService.getFavoritesByExpression(userId!);
      }

      case 'SEARCH_FAVORITES': {
        return await favoriteService.searchFavorites(userId!, message.query);
      }

      case 'GET_ARTICLE_FAVORITES': {
        return await favoriteService.getArticleFavorites(userId!, message.articleUrl);
      }

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    // Unified error handling - convert typed errors to response format
    // Order matters: check subclasses before parent classes
    
    // Auth errors (e.g., not logged in, session expired)
    if (error instanceof AuthError) {
      return { success: false, error: error.message, code: error.code };
    }
    
    // Usage limit errors (e.g., daily limit exceeded)
    if (error instanceof UsageLimitError) {
      return { 
        success: false, 
        error: error.message, 
        code: error.code, 
        usage: error.usage 
      };
    }
    
    // External service errors (e.g., Supabase Edge Function failures)
    if (error instanceof ExternalServiceError) {
      return { success: false, error: error.message, code: error.code };
    }
    
    // Other application errors (ValidationError, etc.)
    if (error instanceof AppError) {
      return { success: false, error: error.message, code: error.code };
    }
    
    // Standard JavaScript errors
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    
    // Unknown errors (non-Error thrown values)
    return { success: false, error: '发生未知错误' };
  }
}
