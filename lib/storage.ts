// Types
import type {
  AnalysisRecord,
  AnalysisResult,
  IdiomItem,
  SyntaxItem,
  VocabularyItem,
  UserSettings,
  SyncSettings,
  ConflictRecord,
  SyncStatus,
} from './types';

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
  
  const updatedHistory = [newRecord, ...history];
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

const STORAGE_KEYS_SYNC = {
  SYNC_SETTINGS: 'nuance_sync_settings',
  CONFLICT_QUEUE: 'nuance_conflict_queue',
} as const;

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  githubToken: '',
  gistId: null,
  lastSyncTime: 0,
  autoSync: true,
  syncOnAnalyze: true,
};

export async function getSyncSettings(): Promise<SyncSettings> {
  const result = await browser.storage.local.get(STORAGE_KEYS_SYNC.SYNC_SETTINGS);
  const raw = result[STORAGE_KEYS_SYNC.SYNC_SETTINGS];
  if (!raw || typeof raw !== 'object') return DEFAULT_SYNC_SETTINGS;
  return {
    githubToken: typeof raw.githubToken === 'string' ? raw.githubToken : '',
    gistId: typeof raw.gistId === 'string' ? raw.gistId : null,
    lastSyncTime: typeof raw.lastSyncTime === 'number' ? raw.lastSyncTime : 0,
    autoSync: raw.autoSync !== false,
    syncOnAnalyze: raw.syncOnAnalyze !== false,
  };
}

export async function setSyncSettings(partial: Partial<SyncSettings>): Promise<void> {
  const current = await getSyncSettings();
  const next: SyncSettings = {
    githubToken: partial.githubToken !== undefined ? partial.githubToken : current.githubToken,
    gistId: partial.gistId !== undefined ? partial.gistId : current.gistId,
    lastSyncTime: partial.lastSyncTime !== undefined ? partial.lastSyncTime : current.lastSyncTime,
    autoSync: partial.autoSync !== undefined ? partial.autoSync : current.autoSync,
    syncOnAnalyze: partial.syncOnAnalyze !== undefined ? partial.syncOnAnalyze : current.syncOnAnalyze,
  };
  await browser.storage.local.set({ [STORAGE_KEYS_SYNC.SYNC_SETTINGS]: next });
}

export async function getConflictQueue(): Promise<ConflictRecord[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS_SYNC.CONFLICT_QUEUE);
  const raw = result[STORAGE_KEYS_SYNC.CONFLICT_QUEUE];
  if (!Array.isArray(raw)) return [];
  return raw;
}

export async function setConflictQueue(conflicts: ConflictRecord[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS_SYNC.CONFLICT_QUEUE]: conflicts });
}

export async function addConflict(conflict: ConflictRecord): Promise<void> {
  const queue = await getConflictQueue();
  const exists = queue.some(
    (c) => c.local.id === conflict.local.id && c.local.url === conflict.local.url
  );
  if (!exists) {
    await setConflictQueue([...queue, conflict]);
  }
}

export async function removeConflict(id: string): Promise<void> {
  const queue = await getConflictQueue();
  await setConflictQueue(queue.filter((c) => c.local.id !== id));
}

export async function clearConflictQueue(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS_SYNC.CONFLICT_QUEUE]: [] });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const settings = await getSyncSettings();
  const conflicts = await getConflictQueue();
  return {
    isConfigured: settings.githubToken.length > 0 && settings.gistId !== null,
    gistId: settings.gistId,
    lastSyncTime: settings.lastSyncTime,
    pendingConflicts: conflicts.length,
    syncError: null,
  };
}

export async function saveSyncHistory(history: AnalysisRecord[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.ANALYSIS_HISTORY]: history });
}

