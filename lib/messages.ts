import type { 
  AnalysisResult, 
  VocabularyBookItem, 
  VocabularyBookIdiom,
  LearningStatistics,
  StudySession,
  LearningNote,
  ReminderSettings,
  PanelStyleSettings,
  ExportOptions,
  OnboardingState
} from './types';

// Message types for communication between extension components
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_TEXT'
  | 'HIGHLIGHT_TEXT'
  | 'CLEAR_HIGHLIGHTS'
  | 'CANCEL_ANALYSIS'
  | 'ADD_TO_VOCAB_BOOK'
  | 'REMOVE_FROM_VOCAB_BOOK'
  | 'UPDATE_VOCAB_ITEM'
  | 'START_STUDY_SESSION'
  | 'END_STUDY_SESSION'
  | 'UPDATE_REMINDER'
  | 'CHECK_REMINDER'
  | 'SAVE_NOTE'
  | 'DELETE_NOTE'
  | 'GET_NOTES'
  | 'UPDATE_STYLE_SETTINGS'
  | 'EXPORT_DATA'
  | 'UPDATE_ONBOARDING'
  | 'GET_STATISTICS';

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
  requestId?: string;
}

export interface AnalyzeTextResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
  errorType?: 'timeout' | 'cancelled' | 'network' | 'api_error' | 'invalid_key' | 'rate_limit' | 'unknown';
  retryAfter?: number;
}

export interface CancelAnalysisRequest {
  type: 'CANCEL_ANALYSIS';
  requestId: string;
}

export interface CancelAnalysisResponse {
  success: boolean;
}

export interface HighlightTextRequest {
  type: 'HIGHLIGHT_TEXT';
  text: string;
  options?: {
    scrollToView?: boolean;
    highlightColor?: string;
  };
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

export interface AddToVocabBookRequest {
  type: 'ADD_TO_VOCAB_BOOK';
  item: VocabularyBookItem | VocabularyBookIdiom;
  itemType: 'vocabulary' | 'idiom';
}

export interface AddToVocabBookResponse {
  success: boolean;
  error?: string;
}

export interface RemoveFromVocabBookRequest {
  type: 'REMOVE_FROM_VOCAB_BOOK';
  itemId: string;
  itemType: 'vocabulary' | 'idiom';
}

export interface RemoveFromVocabBookResponse {
  success: boolean;
  error?: string;
}

export interface UpdateVocabItemRequest {
  type: 'UPDATE_VOCAB_ITEM';
  itemId: string;
  itemType: 'vocabulary' | 'idiom';
  updates: Partial<VocabularyBookItem | VocabularyBookIdiom>;
}

export interface UpdateVocabItemResponse {
  success: boolean;
  error?: string;
}

export interface StartStudySessionRequest {
  type: 'START_STUDY_SESSION';
  articleUrl?: string;
  articleTitle?: string;
}

export interface StartStudySessionResponse {
  success: boolean;
  sessionId: string;
  startTime: number;
}

export interface EndStudySessionRequest {
  type: 'END_STUDY_SESSION';
  sessionId: string;
  vocabularyLearned?: number;
  idiomsLearned?: number;
  syntaxLearned?: number;
}

export interface EndStudySessionResponse {
  success: boolean;
  duration: number;
}

export interface UpdateReminderRequest {
  type: 'UPDATE_REMINDER';
  settings: Partial<ReminderSettings>;
}

export interface UpdateReminderResponse {
  success: boolean;
}

export interface CheckReminderRequest {
  type: 'CHECK_REMINDER';
}

export interface CheckReminderResponse {
  success: boolean;
  shouldRemind: boolean;
}

export interface SaveNoteRequest {
  type: 'SAVE_NOTE';
  note: Partial<LearningNote>;
}

export interface SaveNoteResponse {
  success: boolean;
  noteId: string;
}

export interface DeleteNoteRequest {
  type: 'DELETE_NOTE';
  noteId: string;
}

export interface DeleteNoteResponse {
  success: boolean;
}

export interface GetNotesRequest {
  type: 'GET_NOTES';
  recordId?: string;
}

export interface GetNotesResponse {
  success: boolean;
  notes: LearningNote[];
}

export interface UpdateStyleSettingsRequest {
  type: 'UPDATE_STYLE_SETTINGS';
  settings: Partial<PanelStyleSettings>;
}

export interface UpdateStyleSettingsResponse {
  success: boolean;
}

export interface ExportDataRequest {
  type: 'EXPORT_DATA';
  options: ExportOptions;
}

export interface ExportDataResponse {
  success: boolean;
  data: string;
  mimeType: string;
  filename: string;
}

export interface UpdateOnboardingRequest {
  type: 'UPDATE_ONBOARDING';
  state: Partial<OnboardingState>;
}

export interface UpdateOnboardingResponse {
  success: boolean;
}

export interface GetStatisticsRequest {
  type: 'GET_STATISTICS';
}

export interface GetStatisticsResponse {
  success: boolean;
  statistics: LearningStatistics;
}

export type Message = 
  | ExtractContentRequest 
  | AnalyzeTextRequest 
  | CancelAnalysisRequest
  | HighlightTextRequest 
  | ClearHighlightsRequest
  | AddToVocabBookRequest
  | RemoveFromVocabBookRequest
  | UpdateVocabItemRequest
  | StartStudySessionRequest
  | EndStudySessionRequest
  | UpdateReminderRequest
  | CheckReminderRequest
  | SaveNoteRequest
  | DeleteNoteRequest
  | GetNotesRequest
  | UpdateStyleSettingsRequest
  | ExportDataRequest
  | UpdateOnboardingRequest
  | GetStatisticsRequest;

export type MessageResponse = 
  | ExtractContentResponse 
  | AnalyzeTextResponse 
  | CancelAnalysisResponse
  | HighlightTextResponse 
  | ClearHighlightsResponse
  | AddToVocabBookResponse
  | RemoveFromVocabBookResponse
  | UpdateVocabItemResponse
  | StartStudySessionResponse
  | EndStudySessionResponse
  | UpdateReminderResponse
  | CheckReminderResponse
  | SaveNoteResponse
  | DeleteNoteResponse
  | GetNotesResponse
  | UpdateStyleSettingsResponse
  | ExportDataResponse
  | UpdateOnboardingResponse
  | GetStatisticsResponse;

