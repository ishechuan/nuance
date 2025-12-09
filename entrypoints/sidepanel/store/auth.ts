import { create } from 'zustand';
import type { UsageInfo, GetAuthStateResponse, AuthStateChangedMessage } from '@/lib/messages';

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

// Track in-flight fetch to prevent duplicate calls
let isFetching = false;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 1000; // Minimum 1 second between fetches

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  userId: null,
  user: null,
  isAuthenticated: false,
  isPro: false,
  usage: null,
  isLoading: true,

  // Fetch auth state from background script
  fetchAuthState: async () => {
    const now = Date.now();
    
    // Prevent duplicate calls
    if (isFetching) {
      console.log('[AuthStore] Fetch already in progress, skipping');
      return;
    }
    
    // Prevent rapid successive calls
    if (now - lastFetchTime < MIN_FETCH_INTERVAL) {
      console.log('[AuthStore] Fetch called too soon, skipping');
      return;
    }
    
    isFetching = true;
    lastFetchTime = now;
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
    } finally {
      isFetching = false;
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

// Setup listener for auth state changes from background script
// This should be called once when the sidepanel initializes
export function setupAuthStateListener(): void {
  browser.runtime.onMessage.addListener((message: { type: string } & Partial<AuthStateChangedMessage>) => {
    if (message.type === 'AUTH_STATE_CHANGED') {
      console.log('[AuthStore] Received auth state change:', message.event);
      
      const authMessage = message as AuthStateChangedMessage;
      
      if (!authMessage.isAuthenticated) {
        // User signed out or session expired - clear immediately
        useAuthStore.getState().clearAuth();
      } else if (authMessage.event === 'SIGNED_IN' || authMessage.event === 'TOKEN_REFRESHED') {
        // User signed in or token refreshed
        // fetchAuthState has built-in deduplication, safe to call
        useAuthStore.getState().fetchAuthState();
      }
    }
    
    // Return false to not block other listeners
    return false;
  });
}
