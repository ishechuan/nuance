import type { AnalysisResult } from './types';

// Message types for communication between extension components
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_TEXT'
  | 'HIGHLIGHT_TEXT'
  | 'CLEAR_HIGHLIGHTS'
  | 'ANALYZE_SELECTION'
  | 'CANCEL_ANALYSIS'
  | 'SHOW_SELECTION_ANALYSIS';

export type ErrorCode =
  | 'NO_API_KEY'
  | 'NO_ACTIVE_TAB'
  | 'CONTENT_SCRIPT_UNAVAILABLE'
  | 'EXTRACT_NO_ARTICLE'
  | 'EXTRACT_FAILED'
  | 'DEEPSEEK_HTTP_ERROR'
  | 'DEEPSEEK_EMPTY_RESPONSE'
  | 'DEEPSEEK_INVALID_JSON'
  | 'DEEPSEEK_INVALID_FORMAT'
  | 'DEEPSEEK_ANALYSIS_FAILED'
  | 'ANALYSIS_CANCELLED'
  | 'UNKNOWN_ERROR';

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
  errorCode?: ErrorCode;
  errorDetail?: string;
}

export interface AnalyzeTextRequest {
  type: 'ANALYZE_TEXT';
  text: string;
  requestId?: string;
}

export interface AnalyzeTextResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
  errorCode?: ErrorCode;
  errorDetail?: string;
  requestId?: string;
}

export interface HighlightTextRequest {
  type: 'HIGHLIGHT_TEXT';
  text: string;
}

export interface HighlightTextResponse {
  success: boolean;
  found: boolean;
  errorCode?: ErrorCode;
  errorDetail?: string;
}

export interface ClearHighlightsRequest {
  type: 'CLEAR_HIGHLIGHTS';
}

export interface ClearHighlightsResponse {
  success: boolean;
  errorCode?: ErrorCode;
  errorDetail?: string;
}

export interface CancelAnalysisRequest {
  type: 'CANCEL_ANALYSIS';
  requestId: string;
}

export interface CancelAnalysisResponse {
  success: boolean;
  errorCode?: ErrorCode;
  errorDetail?: string;
}

export interface AnalyzeSelectionRequest {
  type: 'ANALYZE_SELECTION';
  text: string;
  category: 'vocabulary' | 'idioms' | 'syntax';
  requestId?: string;
}

export interface AnalyzeSelectionResponse {
  success: boolean;
  data?: {
    selection: string;
    category: 'vocabulary' | 'idioms' | 'syntax';
    result: {
      expression?: string;
      meaning?: string;
      example?: string;
      sentence?: string;
      structure?: string;
      explanation?: string;
      word?: string;
      level?: string;
      definition?: string;
      context?: string;
    };
  };
  error?: string;
  errorCode?: ErrorCode;
  errorDetail?: string;
  requestId?: string;
}

export interface ShowSelectionAnalysisMessage {
  type: 'SHOW_SELECTION_ANALYSIS';
  selection: string;
  targetCategory: 'vocabulary' | 'idioms' | 'syntax';
  tabId: number;
}

export interface UpdateContextMenusMessage {
  type: 'UPDATE_CONTEXT_MENUS';
  language: 'en' | 'zh';
}

export type Message = 
  | ExtractContentRequest 
  | AnalyzeTextRequest 
  | HighlightTextRequest 
  | ClearHighlightsRequest
  | CancelAnalysisRequest
  | AnalyzeSelectionRequest
  | UpdateContextMenusMessage;

export type MessageResponse = 
  | ExtractContentResponse 
  | AnalyzeTextResponse 
  | HighlightTextResponse 
  | ClearHighlightsResponse
  | CancelAnalysisResponse
  | AnalyzeSelectionResponse;

