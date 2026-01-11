// Types
export interface AnalysisRecord {
  id: string;
  title: string;
  url: string;
  timestamp: number;
  analysis: AnalysisResult;
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

export interface AnalysisResult {
  idioms: IdiomItem[];
  syntax: SyntaxItem[];
  vocabulary: VocabularyItem[];
}

export interface UserSettings {
  vocabLevels: ('B1' | 'B2' | 'C1' | 'C2')[];
  maxIdioms: number;
  maxSyntax: number;
  maxVocabulary: number;
  language: 'en' | 'zh';
}

const DEFAULT_SETTINGS: UserSettings = {
  vocabLevels: ['B1', 'B2', 'C1', 'C2'],
  maxIdioms: 10,
  maxSyntax: 10,
  maxVocabulary: 10,
  language: 'en',
};

// Storage keys
const STORAGE_KEYS = {
  API_KEY: 'nuance_api_key',
  ANALYSIS_HISTORY: 'nuance_analysis_history',
  SETTINGS: 'nuance_settings',
} as const;

// API Key functions
export async function getApiKey(): Promise<string> {
  const result = await browser.storage.local.get(STORAGE_KEYS.API_KEY);
  return result[STORAGE_KEYS.API_KEY] || '';
}

export async function setApiKey(key: string): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.API_KEY]: key });
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key.length > 0;
}

// Analysis history functions
export async function getAnalysisHistory(): Promise<AnalysisRecord[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.ANALYSIS_HISTORY);
  return result[STORAGE_KEYS.ANALYSIS_HISTORY] || [];
}

export async function addAnalysisRecord(record: Omit<AnalysisRecord, 'id' | 'timestamp'>): Promise<void> {
  const history = await getAnalysisHistory();
  const newRecord: AnalysisRecord = {
    ...record,
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };
  
  // Keep only last 50 records
  const updatedHistory = [newRecord, ...history].slice(0, 50);
  await browser.storage.local.set({ [STORAGE_KEYS.ANALYSIS_HISTORY]: updatedHistory });
}

export async function clearAnalysisHistory(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.ANALYSIS_HISTORY]: [] });
}

export async function deleteAnalysisRecord(id: string): Promise<void> {
  const history = await getAnalysisHistory();
  const updatedHistory = history.filter((record) => record.id !== id);
  await browser.storage.local.set({ [STORAGE_KEYS.ANALYSIS_HISTORY]: updatedHistory });
}

export async function getSettings(): Promise<UserSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
  const raw = result[STORAGE_KEYS.SETTINGS];
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const levels = Array.isArray(raw.vocabLevels) ? raw.vocabLevels.filter((l: string) => ['B1', 'B2', 'C1', 'C2'].includes(l)) : DEFAULT_SETTINGS.vocabLevels;
  const maxIdioms = typeof raw.maxIdioms === 'number' ? raw.maxIdioms : DEFAULT_SETTINGS.maxIdioms;
  const maxSyntax = typeof raw.maxSyntax === 'number' ? raw.maxSyntax : DEFAULT_SETTINGS.maxSyntax;
  const maxVocabulary = typeof raw.maxVocabulary === 'number' ? raw.maxVocabulary : DEFAULT_SETTINGS.maxVocabulary;
  const language = raw.language === 'zh' ? 'zh' : 'en';
  return {
    vocabLevels: levels.length ? (levels as UserSettings['vocabLevels']) : DEFAULT_SETTINGS.vocabLevels,
    maxIdioms,
    maxSyntax,
    maxVocabulary,
    language,
  };
}

export async function setSettings(partial: Partial<UserSettings>): Promise<void> {
  const current = await getSettings();
  const next: UserSettings = {
    vocabLevels: partial.vocabLevels && partial.vocabLevels.length ? (partial.vocabLevels.filter((l) => ['B1', 'B2', 'C1', 'C2'].includes(l)) as UserSettings['vocabLevels']) : current.vocabLevels,
    maxIdioms: typeof partial.maxIdioms === 'number' ? partial.maxIdioms : current.maxIdioms,
    maxSyntax: typeof partial.maxSyntax === 'number' ? partial.maxSyntax : current.maxSyntax,
    maxVocabulary: typeof partial.maxVocabulary === 'number' ? partial.maxVocabulary : current.maxVocabulary,
    language: partial.language === 'zh' ? 'zh' : current.language,
  };
  await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: next });
}
