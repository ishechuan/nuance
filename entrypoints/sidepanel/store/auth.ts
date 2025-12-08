import { create } from 'zustand';
import type { UsageInfo, GetAuthStateResponse } from '@/lib/messages';

export interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthStore {
  // State
  userId: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isPro: boolean;
  usage: UsageInfo | null;
  isLoading: boolean;

  // Actions
  fetchAuthState: () => Promise<void>;
  updateUsage: (usage: UsageInfo) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  userId: null,
  user: null,
  isAuthenticated: false,
  isPro: false,
  usage: null,
  isLoading: true,

  // Fetch auth state from background script (only called once at app mount)
  fetchAuthState: async () => {
    set({ isLoading: true });
    try {
      const response: GetAuthStateResponse = await browser.runtime.sendMessage({
        type: 'GET_AUTH_STATE',
      });

      if (response.success && response.isAuthenticated && response.user) {
        set({
          userId: response.user.id,
          user: {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            avatarUrl: response.user.avatarUrl,
          },
          isAuthenticated: true,
          isPro: response.profile?.isPro || false,
          usage: response.usage || null,
          isLoading: false,
        });
      } else {
        set({
          userId: null,
          user: null,
          isAuthenticated: false,
          isPro: false,
          usage: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('[AuthStore] Error fetching auth state:', error);
      set({
        userId: null,
        user: null,
        isAuthenticated: false,
        isPro: false,
        usage: null,
        isLoading: false,
      });
    }
  },

  // Update usage info (called after analysis)
  updateUsage: (usage: UsageInfo) => {
    set({ usage });
  },

  // Clear auth state (called on logout)
  clearAuth: () => {
    set({
      userId: null,
      user: null,
      isAuthenticated: false,
      isPro: false,
      usage: null,
      isLoading: false,
    });
  },
}));

