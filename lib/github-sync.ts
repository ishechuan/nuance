import type { AnalysisRecord, SyncResult, GistHistoryData, ConflictRecord } from './types';
import {
  getSyncSettings,
  setSyncSettings,
  getAnalysisHistory,
  getConflictQueue,
  setConflictQueue,
  clearConflictQueue,
  getSyncStatus,
  saveSyncHistory,
} from './storage';

const GIST_FILENAME = 'nuance-history.json';
const GIST_DESCRIPTION = 'Nuance English Learning - Analysis History';
const GIST_VERSION = '1.0.0';

export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getGitHubUser(token: string): Promise<{ login: string } | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function findExistingNuanceGist(token: string): Promise<string | null> {
  try {
    const user = await getGitHubUser(token);
    if (!user) return null;

    const response = await fetch(`https://api.github.com/users/${user.login}/gists`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;

    const gists = await response.json();
    if (!Array.isArray(gists)) return null;

    for (const gist of gists) {
      if (gist.files && gist.files[GIST_FILENAME]) {
        return gist.id;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function createGist(token: string, history: AnalysisRecord[]): Promise<string> {
  const data: GistHistoryData = {
    version: GIST_VERSION,
    lastSync: Date.now(),
    data: history,
  };

  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Gist: ${error}`);
  }

  const gist = await response.json();
  return gist.id;
}

export async function updateGist(token: string, gistId: string, history: AnalysisRecord[]): Promise<void> {
  const data: GistHistoryData = {
    version: GIST_VERSION,
    lastSync: Date.now(),
    data: history,
  };

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update Gist: ${error}`);
  }
}

export async function getGistHistory(token: string, gistId: string): Promise<AnalysisRecord[]> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    const error = await response.text();
    throw new Error(`Failed to fetch Gist: ${error}`);
  }

  const gist = await response.json();
  const file = gist.files?.[GIST_FILENAME];
  if (!file || !file.content) {
    return [];
  }

  try {
    const data: GistHistoryData = JSON.parse(file.content);
    return Array.isArray(data.data) ? data.data : [];
  } catch {
    return [];
  }
}

export async function getGistRawUrl(token: string, gistId: string): Promise<string | null> {
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const gist = await response.json();
  const file = gist.files?.[GIST_FILENAME];
  return file?.raw_url || null;
}

function findRecordByUrl(records: AnalysisRecord[], url: string): AnalysisRecord | undefined {
  return records.find((r) => r.url === url);
}

function mergeRecords(local: AnalysisRecord, remote: AnalysisRecord): AnalysisRecord {
  return local.timestamp > remote.timestamp ? local : remote;
}

function detectConflicts(local: AnalysisRecord[], remote: AnalysisRecord[]): ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];

  const localUrls = new Set(local.map((r) => r.url));
  const remoteUrls = new Set(remote.map((r) => r.url));

  for (const localRecord of local) {
    const remoteRecord = findRecordByUrl(remote, localRecord.url);
    if (remoteRecord && remoteRecord.id !== localRecord.id) {
      conflicts.push({
        local: localRecord,
        remote: remoteRecord,
        localTimestamp: localRecord.timestamp,
        remoteTimestamp: remoteRecord.timestamp,
      });
    }
  }

  return conflicts;
}

export async function syncWithLookupOrCreate(): Promise<SyncResult> {
  try {
    const settings = await getSyncSettings();
    if (!settings.githubToken) {
      return { success: false, errorCode: 'SYNC_TOKEN_MISSING' };
    }

    const localHistory = await getAnalysisHistory();

    if (settings.gistId) {
      await updateGist(settings.githubToken, settings.gistId, localHistory);
      await setSyncSettings({ lastSyncTime: Date.now() });
      await clearConflictQueue();
      return { success: true, pushed: localHistory.length };
    }

    const existingGistId = await findExistingNuanceGist(settings.githubToken);

    if (existingGistId) {
      const remoteHistory = await getGistHistory(settings.githubToken, existingGistId);
      const localUrls = new Set(localHistory.map((r) => r.url));
      const newFromRemote = remoteHistory.filter((r) => !localUrls.has(r.url));

      const merged = [...localHistory];
      for (const record of newFromRemote) {
        if (!merged.some((r) => r.url === record.url)) {
          merged.push(record);
        }
      }

      await saveSyncHistory(merged);
      await setSyncSettings({ gistId: existingGistId, lastSyncTime: Date.now() });
      await clearConflictQueue();

      return { success: true, pushed: localHistory.length, pulled: newFromRemote.length };
    } else {
      const gistId = await createGist(settings.githubToken, localHistory);
      await setSyncSettings({ gistId, lastSyncTime: Date.now() });
      await clearConflictQueue();

      return { success: true, pushed: localHistory.length };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, errorCode: 'SYNC_REQUEST_FAILED', errorDetail: message };
  }
}

export async function syncToGist(): Promise<SyncResult> {
  try {
    const settings = await getSyncSettings();
    if (!settings.githubToken) {
      return { success: false, errorCode: 'SYNC_TOKEN_MISSING' };
    }

    const localHistory = await getAnalysisHistory();

    if (settings.gistId) {
      await updateGist(settings.githubToken, settings.gistId, localHistory);
    } else {
      const gistId = await createGist(settings.githubToken, localHistory);
      await setSyncSettings({ gistId });
    }

    await setSyncSettings({ lastSyncTime: Date.now() });
    await clearConflictQueue();

    return { success: true, pushed: localHistory.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, errorCode: 'SYNC_REQUEST_FAILED', errorDetail: message };
  }
}

export async function syncFromGist(): Promise<SyncResult> {
  try {
    const settings = await getSyncSettings();
    if (!settings.githubToken || !settings.gistId) {
      return { success: false, errorCode: settings.githubToken ? 'SYNC_GIST_MISSING' : 'SYNC_TOKEN_MISSING' };
    }

    const remoteHistory = await getGistHistory(settings.githubToken, settings.gistId);
    const localHistory = await getAnalysisHistory();

    const localUrls = new Set(localHistory.map((r) => r.url));
    const newFromRemote = remoteHistory.filter((r) => !localUrls.has(r.url));

    const merged = [...localHistory];
    for (const record of newFromRemote) {
      if (!merged.some((r) => r.url === record.url)) {
        merged.push(record);
      }
    }

    await saveSyncHistory(merged);
    await setSyncSettings({ lastSyncTime: Date.now() });

    return { success: true, pulled: newFromRemote.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, errorCode: 'SYNC_REQUEST_FAILED', errorDetail: message };
  }
}

export async function syncBidirectional(): Promise<SyncResult> {
  try {
    const settings = await getSyncSettings();
    if (!settings.githubToken || !settings.gistId) {
      return { success: false, errorCode: settings.githubToken ? 'SYNC_GIST_MISSING' : 'SYNC_TOKEN_MISSING' };
    }

    const localHistory = await getAnalysisHistory();
    const remoteHistory = await getGistHistory(settings.githubToken, settings.gistId);

    const conflicts = detectConflicts(localHistory, remoteHistory);

    if (conflicts.length > 0) {
      await setConflictQueue(conflicts);
      return {
        success: true,
        conflicts,
        pushed: 0,
        pulled: 0,
      };
    }

    const localUrls = new Set(localHistory.map((r) => r.url));
    const newFromRemote = remoteHistory.filter((r) => !localUrls.has(r.url));

    const merged = [...localHistory];
    for (const record of newFromRemote) {
      if (!merged.some((r) => r.url === record.url)) {
        merged.push(record);
      }
    }

    await saveSyncHistory(merged);
    await updateGist(settings.githubToken, settings.gistId, merged);
    await setSyncSettings({ lastSyncTime: Date.now() });

    return { success: true, pushed: merged.length, pulled: newFromRemote.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, errorCode: 'SYNC_REQUEST_FAILED', errorDetail: message };
  }
}

export async function resolveConflict(id: string, prefer: 'local' | 'remote'): Promise<void> {
  const conflicts = await getConflictQueue();
  const conflict = conflicts.find((c) => c.local.id === id);

  if (!conflict) {
    return;
  }

  const localHistory = await getAnalysisHistory();
  const settings = await getSyncSettings();

  const winner = prefer === 'local' ? conflict.local : conflict.remote;

  const updated = localHistory.filter((r) => r.id !== id);
  updated.push(winner);
  updated.sort((a, b) => b.timestamp - a.timestamp);

  await saveSyncHistory(updated);
  await setConflictQueue(conflicts.filter((c) => c.local.id !== id));

  if (settings.gistId && settings.githubToken) {
    await updateGist(settings.githubToken, settings.gistId, updated);
  }
}

export async function resolveAllConflicts(prefer: 'local' | 'remote'): Promise<void> {
  const conflicts = await getConflictQueue();
  if (conflicts.length === 0) return;

  const localHistory = await getAnalysisHistory();
  const settings = await getSyncSettings();

  const idsToRemove = new Set(conflicts.map((c) => c.local.id));

  let updated = localHistory.filter((r) => !idsToRemove.has(r.id));

  for (const conflict of conflicts) {
    const winner = prefer === 'local' ? conflict.local : conflict.remote;
    updated.push(winner);
  }

  updated.sort((a, b) => b.timestamp - a.timestamp);
  await saveSyncHistory(updated);
  await clearConflictQueue();

  if (settings.gistId && settings.githubToken) {
    await updateGist(settings.githubToken, settings.gistId, updated);
  }
}

export async function syncAfterAnalysis(): Promise<SyncResult> {
  const settings = await getSyncSettings();
  if (!settings.syncOnAnalyze || !settings.githubToken) {
    return { success: false, errorCode: settings.githubToken ? 'SYNC_AUTO_SYNC_DISABLED' : 'SYNC_TOKEN_MISSING' };
  }

  return syncToGist();
}

export async function getSyncStatusInfo(): Promise<{
  status: 'idle' | 'syncing' | 'error' | 'conflict';
  message: string;
  conflictsCount: number;
  lastSyncText: string;
}> {
  const status = await getSyncStatus();
  const conflicts = await getConflictQueue();
  const settings = await getSyncSettings();

  let state: 'idle' | 'syncing' | 'error' | 'conflict' = 'idle';
  let message = '';
  let lastSyncText = '';

  if (!settings.githubToken) {
    message = 'Not configured';
  } else if (status.syncError) {
    state = 'error';
    message = status.syncError;
  } else if (conflicts.length > 0) {
    state = 'conflict';
    message = `${conflicts.length} conflicts`;
  } else if (settings.lastSyncTime > 0) {
    message = 'Synced';
  } else {
    message = 'Ready to sync';
  }

  if (settings.lastSyncTime > 0) {
    const date = new Date(settings.lastSyncTime);
    lastSyncText = date.toLocaleString();
  }

  return {
    status: state,
    message,
    conflictsCount: conflicts.length,
    lastSyncText,
  };
}
