import { getStorageItem, setStorageItem } from './base';
import type { OnboardingState } from '../types';

const ONBOARDING_KEY = 'onboarding_state';

const DEFAULT_ONBOARDING: OnboardingState = {
  completed: false,
  step: 0,
  apiKeyConfigured: false,
  syncConfigured: false,
  preferencesSet: false,
  dismissedAt: null,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  return getStorageItem<OnboardingState>(ONBOARDING_KEY, DEFAULT_ONBOARDING);
}

export async function updateOnboardingState(state: Partial<OnboardingState>): Promise<OnboardingState> {
  const current = await getOnboardingState();
  const updated: OnboardingState = {
    ...current,
    ...state,
  };

  if (!updated.completed) {
    if (updated.apiKeyConfigured && updated.preferencesSet) {
      updated.completed = true;
    }
  }

  await setStorageItem(ONBOARDING_KEY, updated);
  return updated;
}

export async function shouldShowOnboarding(): Promise<boolean> {
  const state = await getOnboardingState();

  if (state.completed) return false;
  if (state.dismissedAt && Date.now() - state.dismissedAt < 7 * 24 * 60 * 60 * 1000) return false;

  return true;
}

export async function dismissOnboarding(): Promise<void> {
  await updateOnboardingState({
    dismissedAt: Date.now(),
  });
}

export async function resetOnboarding(): Promise<void> {
  await setStorageItem(ONBOARDING_KEY, DEFAULT_ONBOARDING);
}
