export interface SyncSettings {
  githubToken: string;
  gistId: string | null;
  lastSyncTime: number;
  autoSync: boolean;
  syncOnAnalyze: boolean;
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
