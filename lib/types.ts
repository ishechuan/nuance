export interface SyncSettings {
  githubToken: string;
  gistId: string | null;
  lastSyncTime: number;
  autoSync: boolean;
  syncOnAnalyze: boolean;
}

export interface LearningStatistics {
  totalArticlesAnalyzed: number;
  totalWordsLearned: number;
  totalIdiomsLearned: number;
  totalSyntaxLearned: number;
  streakDays: number;
  lastStudyDate: number;
  weeklyProgress: WeeklyProgress[];
  monthlyProgress: MonthlyProgress[];
}

export interface WeeklyProgress {
  date: string;
  articlesAnalyzed: number;
  wordsLearned: number;
  studyDuration: number;
}

export interface MonthlyProgress {
  month: string;
  articlesAnalyzed: number;
  wordsLearned: number;
  activeDays: number;
}

export interface VocabularyItemExtended extends VocabularyItem {
  mastered: boolean;
  reviewCount: number;
  nextReviewDate: number;
  addedToVocabBook: boolean;
  notes: string;
}

export interface IdiomItemExtended extends IdiomItem {
  mastered: boolean;
  reviewCount: number;
  addedToVocabBook: boolean;
  notes: string;
}

export interface VocabularyBook {
  id: string;
  createdAt: number;
  updatedAt: number;
  vocabularyItems: VocabularyBookItem[];
  idiomItems: VocabularyBookIdiom[];
}

export interface VocabularyBookItem {
  id: string;
  word: string;
  level: 'B1' | 'B2' | 'C1' | 'C2';
  definition: string;
  context: string;
  sourceUrl: string;
  sourceTitle: string;
  addedAt: number;
  mastered: boolean;
  reviewCount: number;
  lastReviewedAt: number;
  nextReviewDate: number;
  easeFactor: number;
  interval: number;
  repetitions: number;
  notes: string;
  tags: string[];
}

export interface VocabularyBookIdiom {
  id: string;
  expression: string;
  meaning: string;
  example: string;
  sourceUrl: string;
  sourceTitle: string;
  addedAt: number;
  mastered: boolean;
  reviewCount: number;
  lastReviewedAt: number;
  notes: string;
  tags: string[];
}

export interface ReminderSettings {
  enabled: boolean;
  reminderTime: string;
  reminderDays: boolean[];
  reminderType: 'notification' | 'badge' | 'both';
  lastReminderDate: number;
}

export interface StudySession {
  id: string;
  startTime: number;
  endTime: number;
  articleUrl: string;
  articleTitle: string;
  vocabularyLearned: number;
  idiomsLearned: number;
  syntaxLearned: number;
}

export interface LearningNote {
  id: string;
  recordId: string;
  articleTitle: string;
  articleUrl: string;
  createdAt: number;
  updatedAt: number;
  content: string;
  tags: string[];
  highlightedItems: HighlightedItem[];
}

export interface HighlightedItem {
  type: 'vocabulary' | 'idiom' | 'syntax';
  itemId: string;
  text: string;
  note: string;
}

export interface PanelStyleSettings {
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  accentColor: string;
  cardSpacing: 'compact' | 'normal' | 'comfortable';
}

export interface ApiRequestConfig {
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  retryOnStatusCodes: number[];
}

export interface ApiRequestState {
  id: string;
  status: 'idle' | 'loading' | 'success' | 'error' | 'cancelled';
  progress: number;
  error: string | null;
  startTime: number;
  endTime?: number;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'markdown';
  includeVocabulary: boolean;
  includeIdioms: boolean;
  includeSyntax: boolean;
  includeNotes: boolean;
  dateRange: {
    start: number;
    end: number;
  } | null;
}

export interface HistoryIndex {
  recordsByUrl: Record<string, string>;
  recordsByDate: Record<string, string[]>;
  recordsByDomain: Record<string, string[]>;
  vocabularyIndex: Record<string, string[]>;
  idiomIndex: Record<string, string[]>;
  lastUpdated: number;
}

export interface OnboardingState {
  completed: boolean;
  step: number;
  apiKeyConfigured: boolean;
  syncConfigured: boolean;
  preferencesSet: boolean;
  dismissedAt: number | null;
}

export interface ConflictRecord {
  local: AnalysisRecord;
  remote: AnalysisRecord;
  localTimestamp: number;
  remoteTimestamp: number;
}

export interface SyncStatus {
  isConfigured: boolean;
  gistId: string | null;
  lastSyncTime: number;
  pendingConflicts: number;
  syncError: string | null;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  pushed?: number;
  pulled?: number;
  conflicts?: ConflictRecord[];
}

export interface AnalysisRecord {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  analysis: AnalysisResult;
}

export interface AnalysisResult {
  idioms: IdiomItem[];
  syntax: SyntaxItem[];
  vocabulary: VocabularyItem[];
}

export interface IdiomItem {
  expression: string;
  meaning: string;
  example: string;
}

export interface SyntaxItem {
  sentence: string;
  structure: string;
  explanation: string;
}

export interface VocabularyItem {
  word: string;
  level: 'B1' | 'B2' | 'C1' | 'C2';
  definition: string;
  context: string;
}

export interface GistHistoryData {
  version: string;
  lastSync: number;
  data: AnalysisRecord[];
}

export interface UserSettings {
  vocabLevels: ('B1' | 'B2' | 'C1' | 'C2')[];
  maxIdioms: number;
  maxSyntax: number;
  maxVocabulary: number;
  language: 'en' | 'zh';
}

export interface SearchMatch {
  type: 'idiom' | 'syntax' | 'vocabulary';
  expression?: string;
  word?: string;
  sentence?: string;
  meaning: string;
  example?: string;
}

export interface SearchResult {
  recordId: string;
  title: string;
  url: string;
  timestamp: number;
  matchCount: number;
  matches: SearchMatch[];
}
