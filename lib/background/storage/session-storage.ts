import type { Session, User } from '@supabase/supabase-js';

/**
 * Session Storage - Single source of truth for authentication state
 * 
 * This module manages session persistence in browser.storage.local.
 * All auth-related code should use this as the canonical source of session data.
 */

const STORAGE_KEY = 'nuance_supabase_session';

/**
 * Save session to browser.storage.local
 */
export async function saveSession(session: Session): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: session });
}

/**
 * Get stored session from browser.storage.local
 * This is the single source of truth for auth state
 */
export async function getSession(): Promise<Session | null> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || null;
}

/**
 * Clear stored session from browser.storage.local
 */
export async function clearSession(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEY);
}

/**
 * Get user from stored session
 * Convenience method to extract user without full session
 */
export async function getUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Get user ID from stored session
 * Convenience method for auth checks
 */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user?.id || null;
}

/**
 * Get access token from stored session
 * Used for API calls that require authentication
 */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * Check if session is expired
 * Returns true if session exists but is expired
 */
export function isSessionExpired(session: Session): boolean {
  if (!session.expires_at) {
    return false;
  }
  // expires_at is in seconds, Date.now() is in milliseconds
  return Date.now() >= session.expires_at * 1000;
}

/**
 * Check if session needs refresh (within 5 minutes of expiry)
 */
export function shouldRefreshSession(session: Session): boolean {
  if (!session.expires_at) {
    return false;
  }
  const fiveMinutes = 5 * 60 * 1000;
  return Date.now() >= (session.expires_at * 1000) - fiveMinutes;
}

