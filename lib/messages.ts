import type { AnalysisResult } from './storage';

// Message types for communication between extension components
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_TEXT'
  | 'HIGHLIGHT_TEXT'
  | 'CLEAR_HIGHLIGHTS';

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

export type Message = 
  | ExtractContentRequest 
  | AnalyzeTextRequest 
  | HighlightTextRequest 
  | ClearHighlightsRequest;

export type MessageResponse = 
  | ExtractContentResponse 
  | AnalyzeTextResponse 
  | HighlightTextResponse 
  | ClearHighlightsResponse;

