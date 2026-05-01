import { getStorageItem, setStorageItem, removeStorageItem } from './base';

const API_KEY_KEY = 'api_key';

export async function getApiKey(): Promise<string> {
  return getStorageItem<string>(API_KEY_KEY, '');
}

export async function setApiKey(key: string): Promise<void> {
  await setStorageItem(API_KEY_KEY, key);
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key.length > 0;
}

export async function clearApiKey(): Promise<void> {
  await removeStorageItem(API_KEY_KEY);
}
