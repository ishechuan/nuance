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
  isManual?: boolean;
}

export interface SyntaxItem {
  sentence: string;
  structure: string;
  explanation: string;
  isManual?: boolean;
}

export interface VocabularyItem {
  word: string;
  level: 'B1' | 'B2' | 'C1' | 'C2';
  definition: string;
  context: string;
  isManual?: boolean;
}

export interface AnalysisResult {
  idioms: IdiomItem[];
  syntax: SyntaxItem[];
  vocabulary: VocabularyItem[];
}

// Storage keys
const STORAGE_KEYS = {
  ANALYSIS_HISTORY: 'nuance_analysis_history',
} as const;

// Analysis history functions
export async function getAnalysisHistory(): Promise<AnalysisRecord[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.ANALYSIS_HISTORY);
  return result[STORAGE_KEYS.ANALYSIS_HISTORY] || [];
}

export async function addAnalysisRecord(record: Omit<AnalysisRecord, 'id' | 'timestamp'>): Promise<void> {
  const history = await getAnalysisHistory();
  const newRecord: AnalysisRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  
  // Keep only last 50 records
  const updatedHistory = [newRecord, ...history].slice(0, 50);
  await browser.storage.local.set({ [STORAGE_KEYS.ANALYSIS_HISTORY]: updatedHistory });
}

export async function clearAnalysisHistory(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.ANALYSIS_HISTORY]: [] });
}
