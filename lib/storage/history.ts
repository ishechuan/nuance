import { getStorageItem, setStorageItem, removeStorageItem } from './base';
import type { AnalysisRecord, HistoryIndex } from '../types';

const HISTORY_KEY = 'analysis_history';
const HISTORY_INDEX_KEY = 'history_index';

const DEFAULT_INDEX: HistoryIndex = {
  recordsByUrl: {},
  recordsByDate: {},
  recordsByDomain: {},
  vocabularyIndex: {},
  idiomIndex: {},
  lastUpdated: 0,
};

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

function formatDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function getHistoryIndex(): Promise<HistoryIndex> {
  return getStorageItem<HistoryIndex>(HISTORY_INDEX_KEY, DEFAULT_INDEX);
}

export async function rebuildHistoryIndex(records?: AnalysisRecord[]): Promise<HistoryIndex> {
  const history = records || (await getAnalysisHistory());
  const index: HistoryIndex = {
    recordsByUrl: {},
    recordsByDate: {},
    recordsByDomain: {},
    vocabularyIndex: {},
    idiomIndex: {},
    lastUpdated: Date.now(),
  };

  for (const record of history) {
    index.recordsByUrl[record.url] = record.id;

    const dateKey = formatDateKey(record.timestamp);
    if (!index.recordsByDate[dateKey]) {
      index.recordsByDate[dateKey] = [];
    }
    index.recordsByDate[dateKey].push(record.id);

    const domain = extractDomain(record.url);
    if (!index.recordsByDomain[domain]) {
      index.recordsByDomain[domain] = [];
    }
    index.recordsByDomain[domain].push(record.id);

    for (const vocab of record.analysis.vocabulary) {
      const wordKey = vocab.word.toLowerCase();
      if (!index.vocabularyIndex[wordKey]) {
        index.vocabularyIndex[wordKey] = [];
      }
      if (!index.vocabularyIndex[wordKey].includes(record.id)) {
        index.vocabularyIndex[wordKey].push(record.id);
      }
    }

    for (const idiom of record.analysis.idioms) {
      const expressionKey = idiom.expression.toLowerCase();
      if (!index.idiomIndex[expressionKey]) {
        index.idiomIndex[expressionKey] = [];
      }
      if (!index.idiomIndex[expressionKey].includes(record.id)) {
        index.idiomIndex[expressionKey].push(record.id);
      }
    }
  }

  await setStorageItem(HISTORY_INDEX_KEY, index);
  return index;
}

export async function getAnalysisHistory(): Promise<AnalysisRecord[]> {
  return getStorageItem<AnalysisRecord[]>(HISTORY_KEY, []);
}

export async function addAnalysisRecord(record: Omit<AnalysisRecord, 'id' | 'timestamp'>): Promise<AnalysisRecord> {
  const history = await getAnalysisHistory();
  const newRecord: AnalysisRecord = {
    ...record,
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  const updatedHistory = [newRecord, ...history];
  await setStorageItem(HISTORY_KEY, updatedHistory);

  const index = await getHistoryIndex();
  const dateKey = formatDateKey(newRecord.timestamp);
  const domain = extractDomain(newRecord.url);

  index.recordsByUrl[newRecord.url] = newRecord.id;
  if (!index.recordsByDate[dateKey]) {
    index.recordsByDate[dateKey] = [];
  }
  index.recordsByDate[dateKey].unshift(newRecord.id);
  if (!index.recordsByDomain[domain]) {
    index.recordsByDomain[domain] = [];
  }
  index.recordsByDomain[domain].unshift(newRecord.id);

  for (const vocab of newRecord.analysis.vocabulary) {
    const wordKey = vocab.word.toLowerCase();
    if (!index.vocabularyIndex[wordKey]) {
      index.vocabularyIndex[wordKey] = [];
    }
    if (!index.vocabularyIndex[wordKey].includes(newRecord.id)) {
      index.vocabularyIndex[wordKey].unshift(newRecord.id);
    }
  }

  for (const idiom of newRecord.analysis.idioms) {
    const expressionKey = idiom.expression.toLowerCase();
    if (!index.idiomIndex[expressionKey]) {
      index.idiomIndex[expressionKey] = [];
    }
    if (!index.idiomIndex[expressionKey].includes(newRecord.id)) {
      index.idiomIndex[expressionKey].unshift(newRecord.id);
    }
  }

  index.lastUpdated = Date.now();
  await setStorageItem(HISTORY_INDEX_KEY, index);

  return newRecord;
}

export async function clearAnalysisHistory(): Promise<void> {
  await removeStorageItem(HISTORY_KEY);
  await setStorageItem(HISTORY_INDEX_KEY, DEFAULT_INDEX);
}

export async function deleteAnalysisRecord(id: string): Promise<void> {
  const history = await getAnalysisHistory();
  const recordToDelete = history.find((r) => r.id === id);

  if (!recordToDelete) return;

  const updatedHistory = history.filter((record) => record.id !== id);
  await setStorageItem(HISTORY_KEY, updatedHistory);

  const index = await getHistoryIndex();

  delete index.recordsByUrl[recordToDelete.url];

  const dateKey = formatDateKey(recordToDelete.timestamp);
  if (index.recordsByDate[dateKey]) {
    index.recordsByDate[dateKey] = index.recordsByDate[dateKey].filter((rid) => rid !== id);
    if (index.recordsByDate[dateKey].length === 0) {
      delete index.recordsByDate[dateKey];
    }
  }

  const domain = extractDomain(recordToDelete.url);
  if (index.recordsByDomain[domain]) {
    index.recordsByDomain[domain] = index.recordsByDomain[domain].filter((rid) => rid !== id);
    if (index.recordsByDomain[domain].length === 0) {
      delete index.recordsByDomain[domain];
    }
  }

  for (const vocab of recordToDelete.analysis.vocabulary) {
    const wordKey = vocab.word.toLowerCase();
    if (index.vocabularyIndex[wordKey]) {
      index.vocabularyIndex[wordKey] = index.vocabularyIndex[wordKey].filter((rid) => rid !== id);
      if (index.vocabularyIndex[wordKey].length === 0) {
        delete index.vocabularyIndex[wordKey];
      }
    }
  }

  for (const idiom of recordToDelete.analysis.idioms) {
    const expressionKey = idiom.expression.toLowerCase();
    if (index.idiomIndex[expressionKey]) {
      index.idiomIndex[expressionKey] = index.idiomIndex[expressionKey].filter((rid) => rid !== id);
      if (index.idiomIndex[expressionKey].length === 0) {
        delete index.idiomIndex[expressionKey];
      }
    }
  }

  index.lastUpdated = Date.now();
  await setStorageItem(HISTORY_INDEX_KEY, index);
}

export async function getAnalysisRecordById(id: string): Promise<AnalysisRecord | null> {
  const history = await getAnalysisHistory();
  return history.find((r) => r.id === id) || null;
}

export async function getAnalysisRecordByUrl(url: string): Promise<AnalysisRecord | null> {
  const index = await getHistoryIndex();
  const recordId = index.recordsByUrl[url];
  if (!recordId) return null;
  return getAnalysisRecordById(recordId);
}

export async function getHistoryByDateRange(startDate: number, endDate: number): Promise<AnalysisRecord[]> {
  const history = await getAnalysisHistory();
  return history.filter((r) => r.timestamp >= startDate && r.timestamp <= endDate);
}

export async function getHistoryByDomain(domain: string): Promise<AnalysisRecord[]> {
  const index = await getHistoryIndex();
  const recordIds = index.recordsByDomain[domain] || [];
  const history = await getAnalysisHistory();
  return recordIds.map((id) => history.find((r) => r.id === id)).filter(Boolean) as AnalysisRecord[];
}

export async function searchHistoryByWord(word: string): Promise<string[]> {
  const index = await getHistoryIndex();
  const wordKey = word.toLowerCase();
  return index.vocabularyIndex[wordKey] || [];
}

export async function searchHistoryByIdiom(expression: string): Promise<string[]> {
  const index = await getHistoryIndex();
  const expressionKey = expression.toLowerCase();
  return index.idiomIndex[expressionKey] || [];
}

export async function getUniqueDomains(): Promise<string[]> {
  const index = await getHistoryIndex();
  return Object.keys(index.recordsByDomain);
}

export async function getUniqueDates(): Promise<string[]> {
  const index = await getHistoryIndex();
  return Object.keys(index.recordsByDate).sort((a, b) => b.localeCompare(a));
}

export async function saveSyncHistory(history: AnalysisRecord[]): Promise<void> {
  await setStorageItem(HISTORY_KEY, history);
  await rebuildHistoryIndex(history);
}
