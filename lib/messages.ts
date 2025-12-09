import type { AnalysisResult, IdiomItem, SyntaxItem, VocabularyItem } from './storage';

export type FavoriteType = 'idiom' | 'syntax' | 'vocabulary';

// Message types for communication between extension components
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_TEXT'
  | 'HIGHLIGHT_TEXT'
  | 'CLEAR_HIGHLIGHTS'
  | 'SIGN_IN_EMAIL'
  | 'SIGN_OUT'
  | 'GET_AUTH_STATE'
  | 'AUTH_STATE_CHANGED'
  | 'ADD_FAVORITE'
  | 'REMOVE_FAVORITE'
  | 'CHECK_IS_FAVORITED'
  | 'GET_FAVORITES_BY_ARTICLE'
  | 'GET_FAVORITES_BY_EXPRESSION'
  | 'SEARCH_FAVORITES'
  | 'GET_ARTICLE_FAVORITES';

export interface ExtractContentRequest {
  type: 'EXTRACT_CONTENT';
}

export interface ExtractContentResponse {
  success: boolean;
  data?: {
    title: string;
    content: string;
    textContent: string;
    url: string;
  };
  error?: string;
}

export interface AnalyzeTextRequest {
  type: 'ANALYZE_TEXT';
  text: string;
}

export interface UsageInfo {
  used: number;
  limit: number | null;
  isPro: boolean;
}

export interface AnalyzeTextResponse {
  success: boolean;
  data?: AnalysisResult;
  usage?: UsageInfo;
  error?: string;
  code?: string;
}

export interface HighlightTextRequest {
  type: 'HIGHLIGHT_TEXT';
  text: string;
}

export interface HighlightTextResponse {
  success: boolean;
  found: boolean;
}

export interface ClearHighlightsRequest {
  type: 'CLEAR_HIGHLIGHTS';
}

export interface ClearHighlightsResponse {
  success: boolean;
}

export interface SignInEmailRequest {
  type: 'SIGN_IN_EMAIL';
  email: string;
  password: string;
}

export interface SignInEmailResponse {
  success: boolean;
  error?: string;
}

export interface SignOutRequest {
  type: 'SIGN_OUT';
}

export interface SignOutResponse {
  success: boolean;
}

export interface GetAuthStateRequest {
  type: 'GET_AUTH_STATE';
}

export interface GetAuthStateResponse {
  success: boolean;
  isAuthenticated: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  };
  profile?: {
    isPro: boolean;
  };
  usage?: UsageInfo;
}

// Auth state change notification (sent from background to sidepanel)
export type AuthStateChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';

export interface AuthStateChangedMessage {
  type: 'AUTH_STATE_CHANGED';
  event: AuthStateChangeEvent;
  isAuthenticated: boolean;
}

// Favorites message types
export interface FavoriteItem {
  id: string;
  type: FavoriteType;
  content: IdiomItem | SyntaxItem | VocabularyItem;
  articleId: string;
  articleUrl: string;
  articleTitle: string;
  createdAt: string;
}

export interface ArticleWithFavorites {
  id: string;
  url: string;
  title: string;
  favorites: FavoriteItem[];
  createdAt: string;
}

export interface ExpressionWithArticles {
  expression: string;
  type: FavoriteType;
  articles: Array<{
    id: string;
    url: string;
    title: string;
    favoriteId: string;
    content: IdiomItem | SyntaxItem | VocabularyItem;
  }>;
}

export interface AddFavoriteRequest {
  type: 'ADD_FAVORITE';
  articleUrl: string;
  articleTitle: string;
  favoriteType: FavoriteType;
  content: IdiomItem | SyntaxItem | VocabularyItem;
}

export interface AddFavoriteResponse {
  success: boolean;
  id?: string;
  error?: string;
}

export interface RemoveFavoriteRequest {
  type: 'REMOVE_FAVORITE';
  favoriteId: string;
}

export interface RemoveFavoriteResponse {
  success: boolean;
  error?: string;
}

export interface CheckIsFavoritedRequest {
  type: 'CHECK_IS_FAVORITED';
  articleUrl: string;
  favoriteType: FavoriteType;
  content: IdiomItem | SyntaxItem | VocabularyItem;
}

export interface CheckIsFavoritedResponse {
  success: boolean;
  isFavorited: boolean;
  favoriteId?: string;
  error?: string;
}

export interface GetFavoritesByArticleRequest {
  type: 'GET_FAVORITES_BY_ARTICLE';
}

export interface GetFavoritesByArticleResponse {
  success: boolean;
  data?: ArticleWithFavorites[];
  error?: string;
}

export interface GetFavoritesByExpressionRequest {
  type: 'GET_FAVORITES_BY_EXPRESSION';
}

export interface GetFavoritesByExpressionResponse {
  success: boolean;
  data?: ExpressionWithArticles[];
  error?: string;
}

export interface SearchFavoritesRequest {
  type: 'SEARCH_FAVORITES';
  query: string;
}

export interface SearchFavoritesResponse {
  success: boolean;
  data?: FavoriteItem[];
  error?: string;
}

// Batch get favorites for an article (for Card components)
export interface ArticleFavoriteInfo {
  favoriteId: string;
  type: FavoriteType;
}

export interface GetArticleFavoritesRequest {
  type: 'GET_ARTICLE_FAVORITES';
  articleUrl: string;
}

export interface GetArticleFavoritesResponse {
  success: boolean;
  // Map key format: `${type}:${expression}` (e.g., "idiom:break a leg", "vocabulary:ubiquitous")
  favorites?: Record<string, ArticleFavoriteInfo>;
  error?: string;
}

export type Message = 
  | ExtractContentRequest 
  | AnalyzeTextRequest 
  | HighlightTextRequest 
  | ClearHighlightsRequest
  | SignInEmailRequest
  | SignOutRequest
  | GetAuthStateRequest
  | AuthStateChangedMessage
  | AddFavoriteRequest
  | RemoveFavoriteRequest
  | CheckIsFavoritedRequest
  | GetFavoritesByArticleRequest
  | GetFavoritesByExpressionRequest
  | SearchFavoritesRequest
  | GetArticleFavoritesRequest;

export type MessageResponse = 
  | ExtractContentResponse 
  | AnalyzeTextResponse 
  | HighlightTextResponse 
  | ClearHighlightsResponse
  | SignInEmailResponse
  | SignOutResponse
  | GetAuthStateResponse
  | AddFavoriteResponse
  | RemoveFavoriteResponse
  | CheckIsFavoritedResponse
  | GetFavoritesByArticleResponse
  | GetFavoritesByExpressionResponse
  | SearchFavoritesResponse
  | GetArticleFavoritesResponse;
