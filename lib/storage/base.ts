const STORAGE_PREFIX = 'nuance_';

export function createStorageKey(name: string): string {
  return `${STORAGE_PREFIX}${name}`;
}

export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  const storageKey = createStorageKey(key);
  const result = await browser.storage.local.get(storageKey);
  const raw = result[storageKey];
  if (raw === undefined) return defaultValue;
  return raw as T;
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  const storageKey = createStorageKey(key);
  await browser.storage.local.set({ [storageKey]: value });
}

export async function removeStorageItem(key: string): Promise<void> {
  const storageKey = createStorageKey(key);
  await browser.storage.local.remove(storageKey);
}

export async function clearAllStorage(): Promise<void> {
  const allKeys = await browser.storage.local.get();
  const nuanceKeys = Object.keys(allKeys).filter((k) => k.startsWith(STORAGE_PREFIX));
  if (nuanceKeys.length > 0) {
    await browser.storage.local.remove(nuanceKeys);
  }
}
