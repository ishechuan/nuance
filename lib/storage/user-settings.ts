import { getStorageItem, setStorageItem } from './base';
import type { UserSettings } from '../types';

const SETTINGS_KEY = 'settings';

export const DEFAULT_SETTINGS: UserSettings = {
  vocabLevels: ['B1', 'B2', 'C1', 'C2'],
  maxIdioms: 10,
  maxSyntax: 10,
  maxVocabulary: 10,
  language: 'en',
};

export async function getSettings(): Promise<UserSettings> {
  const raw = await getStorageItem<Partial<UserSettings> | null>(SETTINGS_KEY, null);
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  
  const levels = Array.isArray(raw.vocabLevels) 
    ? raw.vocabLevels.filter((l: string) => ['B1', 'B2', 'C1', 'C2'].includes(l))
    : DEFAULT_SETTINGS.vocabLevels;
  
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
    vocabLevels: partial.vocabLevels && partial.vocabLevels.length 
      ? (partial.vocabLevels.filter((l) => ['B1', 'B2', 'C1', 'C2'].includes(l)) as UserSettings['vocabLevels'])
      : current.vocabLevels,
    maxIdioms: typeof partial.maxIdioms === 'number' ? partial.maxIdioms : current.maxIdioms,
    maxSyntax: typeof partial.maxSyntax === 'number' ? partial.maxSyntax : current.maxSyntax,
    maxVocabulary: typeof partial.maxVocabulary === 'number' ? partial.maxVocabulary : current.maxVocabulary,
    language: partial.language === 'zh' ? 'zh' : current.language,
  };
  await setStorageItem(SETTINGS_KEY, next);
}

export async function resetSettings(): Promise<void> {
  await setStorageItem(SETTINGS_KEY, DEFAULT_SETTINGS);
}
