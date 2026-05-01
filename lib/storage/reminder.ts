import { getStorageItem, setStorageItem } from './base';
import type { ReminderSettings } from '../types';

const REMINDER_KEY = 'reminder_settings';

const DEFAULT_REMINDER: ReminderSettings = {
  enabled: false,
  reminderTime: '20:00',
  reminderDays: [true, true, true, true, true, true, true],
  reminderType: 'notification',
  lastReminderDate: 0,
};

export async function getReminderSettings(): Promise<ReminderSettings> {
  return getStorageItem<ReminderSettings>(REMINDER_KEY, DEFAULT_REMINDER);
}

export async function updateReminderSettings(settings: Partial<ReminderSettings>): Promise<ReminderSettings> {
  const current = await getReminderSettings();
  const updated: ReminderSettings = {
    ...current,
    ...settings,
  };
  await setStorageItem(REMINDER_KEY, updated);
  return updated;
}

export async function shouldRemindToday(): Promise<boolean> {
  const settings = await getReminderSettings();
  
  if (!settings.enabled) return false;

  const now = new Date();
  const today = now.getDay();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (!settings.reminderDays[today]) return false;

  if (settings.lastReminderDate >= todayStart) return false;

  const [hours, minutes] = settings.reminderTime.split(':').map(Number);
  const reminderTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes
  ).getTime();

  return now.getTime() >= reminderTime;
}

export async function markReminderShown(): Promise<void> {
  await updateReminderSettings({
    lastReminderDate: Date.now(),
  });
}

export async function clearReminderSettings(): Promise<void> {
  await setStorageItem(REMINDER_KEY, DEFAULT_REMINDER);
}
