import { supabase } from '../client/supabase';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Auth Repository - Pure Supabase Auth API operations
 * 
 * This module handles direct Supabase Auth API calls.
 * It does NOT manage session persistence - that's handled by session-storage.ts
 * 
 * Session management flow:
 *   1. Auth operations (signIn, signUp) return sessions
 *   2. Service layer persists sessions to storage
 *   3. All other code reads from storage as single source of truth
 */

// ============================================================================
// Auth Operations
// ============================================================================

/**
 * Sign in with email and password
 * Returns session on success, caller is responsible for persisting it
 */
export async function signInWithPassword(
  email: string, 
  password: string
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    return { session: null, error };
  }
  
  return { session: data.session, error: null };
}

/**
 * Sign up with email and password
 * Returns session on success (if email confirmation not required)
 * Caller is responsible for persisting session
 */
export async function signUp(
  email: string, 
  password: string
): Promise<{ session: Session | null; user: User | null; error: Error | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
    },
  });
  
  if (error) {
    return { session: null, user: null, error };
  }
  
  return { session: data.session, user: data.user, error: null };
}

/**
 * Sign out from Supabase
 * Caller is responsible for clearing stored session
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Refresh session using stored refresh token
 * Used to get a new access token when the current one is expiring
 */
export async function refreshSession(
  refreshToken: string
): Promise<{ session: Session | null; error: Error | null }> {
  // Set the session first so Supabase knows which session to refresh
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  
  if (error) {
    return { session: null, error };
  }
  
  return { session: data.session, error: null };
}

/**
 * Verify and decode a session by setting it in Supabase client
 * This validates the tokens with Supabase server
 */
export async function verifySession(
  session: Session
): Promise<{ session: Session | null; error: Error | null }> {
  const { data, error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  
  if (error) {
    return { session: null, error };
  }
  
  return { session: data.session, error: null };
}

// ============================================================================
// Auth State Listener
// ============================================================================

/**
 * Setup auth state change listener
 * Used to detect token refresh events from Supabase's auto-refresh
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  
  return () => subscription.unsubscribe();
}
