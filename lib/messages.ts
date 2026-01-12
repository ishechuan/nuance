import type { AnalysisResult } from './types';

// Message types for communication between extension components
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_TEXT'
  | 'HIGHLIGHT_TEXT'
  | 'CLEAR_HIGHLIGHTS'
  | 'ANALYZE_SELECTION'
  | 'SHOW_SELECTION_ANALYSIS';

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

export interface AnalyzeTextResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
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

export interface AnalyzeSelectionRequest {
  type: 'ANALYZE_SELECTION';
  text: string;
  category: 'vocabulary' | 'idioms' | 'syntax';
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
  | AnalyzeSelectionRequest
  | UpdateContextMenusMessage;

export type MessageResponse = 
  | ExtractContentResponse 
  | AnalyzeTextResponse 
  | HighlightTextResponse 
  | ClearHighlightsResponse
  | AnalyzeSelectionResponse;

