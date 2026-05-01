import { getStorageItem, setStorageItem } from './base';
import type { PanelStyleSettings } from '../types';

const STYLE_KEY = 'panel_style_settings';

const DEFAULT_STYLE: PanelStyleSettings = {
  theme: 'light',
  fontSize: 'medium',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  accentColor: '#0969da',
  cardSpacing: 'normal',
};

export async function getStyleSettings(): Promise<PanelStyleSettings> {
  return getStorageItem<PanelStyleSettings>(STYLE_KEY, DEFAULT_STYLE);
}

export async function updateStyleSettings(settings: Partial<PanelStyleSettings>): Promise<PanelStyleSettings> {
  const current = await getStyleSettings();
  const updated: PanelStyleSettings = {
    ...current,
    ...settings,
  };
  await setStorageItem(STYLE_KEY, updated);
  return updated;
}

export function applyStyleSettings(settings: PanelStyleSettings): void {
  const root = document.documentElement;

  if (settings.theme === 'dark') {
    root.classList.add('dark-theme');
    root.classList.remove('light-theme');
  } else if (settings.theme === 'light') {
    root.classList.remove('dark-theme');
    root.classList.add('light-theme');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    } else {
      root.classList.remove('dark-theme');
      root.classList.add('light-theme');
    }
  }

  const fontSizeMap: Record<string, string> = {
    small: '13px',
    medium: '14px',
    large: '16px',
  };
  root.style.setProperty('--font-size-base', fontSizeMap[settings.fontSize] || fontSizeMap.medium);

  root.style.setProperty('--font-family-custom', settings.fontFamily);
  root.style.setProperty('--accent-color-custom', settings.accentColor);

  const spacingMap: Record<string, string> = {
    compact: '8px',
    normal: '16px',
    comfortable: '24px',
  };
  root.style.setProperty('--card-spacing', spacingMap[settings.cardSpacing] || spacingMap.normal);
}

export async function clearStyleSettings(): Promise<void> {
  await setStorageItem(STYLE_KEY, DEFAULT_STYLE);
}
