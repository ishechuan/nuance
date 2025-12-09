import * as authRepo from '../repositories/auth-repository';
import * as profileRepo from '../repositories/profile-repository';
import * as sessionStorage from '../storage/session-storage';
import type { Session } from '@supabase/supabase-js';
import type { 
  SignInEmailResponse, 
  SignOutResponse, 
  GetAuthStateResponse,
  UsageInfo 
} from '@/lib/messages';

/**
 * Auth Service - Coordinates authentication operations
 * 
 * This service:
 *   1. Uses auth-repository for Supabase Auth API calls
 *   2. Uses session-storage for persistence (single source of truth)
 *   3. Handles session refresh and validation
 */

// ============================================================================
// Sign In / Sign Up
// ============================================================================

/**
 * Sign in with email and password
 * If user doesn't exist, automatically register and sign in
 */
export async function signInWithEmail(
  email: string, 
  password: string
): Promise<{ session: Session | null; error: Error | null }> {
  // First try to sign in
  const signInResult = await authRepo.signInWithPassword(email, password);
  
  if (signInResult.session) {
    // Persist session to storage (single source of truth)
    await sessionStorage.saveSession(signInResult.session);
    return { session: signInResult.session, error: null };
  }
  
  // If error is "Invalid login credentials", try to register
  if (signInResult.error?.message?.includes('Invalid login credentials')) {
    console.log('[AuthService] User not found, attempting to register...');
    
    const signUpResult = await authRepo.signUp(email, password);
    
    if (signUpResult.error) {
      return { session: null, error: signUpResult.error };
    }
    
    if (signUpResult.session) {
      // Persist session to storage
      await sessionStorage.saveSession(signUpResult.session);
      return { session: signUpResult.session, error: null };
    }
    
    // If email confirmation is required
    if (signUpResult.user && !signUpResult.session) {
      return { 
        session: null, 
        error: new Error('注册成功！请检查邮箱确认后再登录。') 
      };
    }
    
    return { session: null, error: new Error('注册失败，请重试') };
  }
  
  return { 
    session: null, 
    error: signInResult.error || new Error('登录失败，请重试') 
  };
}

/**
 * Handle sign in message
 */
export async function handleSignIn(email: string, password: string): Promise<SignInEmailResponse> {
  const { session, error } = await signInWithEmail(email, password);
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  return {
    success: Boolean(session),
    error: session ? undefined : '登录失败',
  };
}

// ============================================================================
// Sign Out
// ============================================================================

/**
 * Handle sign out message
 */
export async function handleSignOut(): Promise<SignOutResponse> {
  // Clear storage first (single source of truth)
  await sessionStorage.clearSession();
  // Then sign out from Supabase
  await authRepo.signOut();
  return { success: true };
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Initialize and validate session on startup
 * Returns valid session or null if no valid session exists
 */
export async function initializeSession(): Promise<Session | null> {
  const storedSession = await sessionStorage.getSession();
  
  if (!storedSession) {
    return null;
  }
  
  // Check if session is expired
  if (sessionStorage.isSessionExpired(storedSession)) {
    console.log('[AuthService] Session expired, attempting refresh...');
    return await refreshAndSaveSession(storedSession);
  }
  
  // Check if session should be refreshed (within 5 min of expiry)
  if (sessionStorage.shouldRefreshSession(storedSession)) {
    console.log('[AuthService] Session expiring soon, refreshing...');
    const refreshed = await refreshAndSaveSession(storedSession);
    // If refresh fails, still return the current session if not fully expired
    return refreshed || storedSession;
  }
  
  // Verify session with Supabase (optional, for extra validation)
  const { session: verifiedSession, error } = await authRepo.verifySession(storedSession);
  
  if (error) {
    console.log('[AuthService] Session verification failed, attempting refresh...');
    return await refreshAndSaveSession(storedSession);
  }
  
  // Update storage with potentially updated session
  if (verifiedSession) {
    await sessionStorage.saveSession(verifiedSession);
  }
  
  return verifiedSession;
}

/**
 * Refresh session and save to storage
 */
async function refreshAndSaveSession(session: Session): Promise<Session | null> {
  const { session: newSession, error } = await authRepo.refreshSession(session.refresh_token);
  
  if (error || !newSession) {
    console.error('[AuthService] Failed to refresh session:', error?.message);
    // Clear invalid session
    await sessionStorage.clearSession();
    return null;
  }
  
  // Save refreshed session to storage
  await sessionStorage.saveSession(newSession);
  console.log('[AuthService] Session refreshed successfully');
  
  return newSession;
}

// ============================================================================
// Get Auth State
// ============================================================================

/**
 * Handle get auth state message
 */
export async function handleGetAuthState(): Promise<GetAuthStateResponse> {
  const session = await initializeSession();
  
  if (!session) {
    return { success: true, isAuthenticated: false };
  }
  
  const user = session.user;
  const profile = await profileRepo.getProfileById(user.id);
  
  // Get usage count
  const usage: UsageInfo = {
    used: 0,
    limit: 5,
    isPro: profile?.is_pro || false,
  };
  
  if (profile) {
    usage.used = await profileRepo.getDailyUsageCount(user.id);
    if (profile.is_pro) {
      usage.limit = null;
    }
  }
  
  return {
    success: true,
    isAuthenticated: true,
    user: {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatarUrl: user.user_metadata?.avatar_url,
    },
    profile: {
      isPro: profile?.is_pro || false,
    },
    usage,
  };
}

// ============================================================================
// Auth State Listener
// ============================================================================

/**
 * Setup auth state change listener and broadcast to sidepanel
 * Handles token refresh events from Supabase's auto-refresh mechanism
 */
export function setupAuthStateListener(): void {
  authRepo.onAuthStateChange(async (event, session) => {
    console.log('[AuthService] Auth state changed:', event);
    
    // Handle token refresh - update storage
    if (event === 'TOKEN_REFRESHED' && session) {
      await sessionStorage.saveSession(session);
      console.log('[AuthService] Refreshed session saved to storage');
    }
    
    // Map events to broadcast types
    let authEvent: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';
    
    switch (event) {
      case 'SIGNED_IN':
      case 'INITIAL_SESSION':
        authEvent = 'SIGNED_IN';
        break;
      case 'SIGNED_OUT':
        authEvent = 'SIGNED_OUT';
        break;
      case 'TOKEN_REFRESHED':
        authEvent = 'TOKEN_REFRESHED';
        break;
      default:
        return;
    }
    
    // Broadcast auth state change to all extension contexts
    browser.runtime.sendMessage({
      type: 'AUTH_STATE_CHANGED',
      event: authEvent,
      isAuthenticated: Boolean(session),
    }).catch(() => {
      // Ignore errors - sidepanel might not be open
    });
  });
}
