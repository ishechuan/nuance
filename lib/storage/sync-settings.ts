import { getStorageItem, setStorageItem, removeStorageItem } from './base';
import type { SyncSettings, ConflictRecord, SyncStatus } from '../types';

const SYNC_SETTINGS_KEY = 'sync_settings';
const CONFLICT_QUEUE_KEY = 'conflict_queue';

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  githubToken: '',
  gistId: null,
  lastSyncTime: 0,
  autoSync: true,
  syncOnAnalyze: true,
};

export async function getSyncSettings(): Promise<SyncSettings> {
  const raw = await getStorageItem<Partial<SyncSettings> | null>(SYNC_SETTINGS_KEY, null);
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
  await setStorageItem(SYNC_SETTINGS_KEY, next);
}

export async function getConflictQueue(): Promise<ConflictRecord[]> {
  return getStorageItem<ConflictRecord[]>(CONFLICT_QUEUE_KEY, []);
}

export async function setConflictQueue(conflicts: ConflictRecord[]): Promise<void> {
  await setStorageItem(CONFLICT_QUEUE_KEY, conflicts);
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
  await removeStorageItem(CONFLICT_QUEUE_KEY);
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
