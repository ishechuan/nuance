import { getSession } from '../storage/session-storage';
import { AuthError } from '../errors';
import type { MessageType } from '@/lib/messages';

/**
 * Message types that require authentication
 */
const AUTH_REQUIRED: Set<MessageType> = new Set([
  'ANALYZE_TEXT',
  'ADD_FAVORITE',
  'REMOVE_FAVORITE',
  'CHECK_IS_FAVORITED',
  'GET_FAVORITES_BY_ARTICLE',
  'GET_FAVORITES_BY_EXPRESSION',
  'SEARCH_FAVORITES',
  'GET_ARTICLE_FAVORITES',
  'GENERATE_ENTRY_FIELDS',
  'GET_MANUAL_ENTRIES',
  'START_SENTENCE_PRACTICE',
  'SUBMIT_SENTENCE',
  'GET_SENTENCE_HINT',
]);

/**
 * Authentication context returned by the middleware
 */
export interface AuthContext {
  userId: string | null;
  isRequired: boolean;
}

/**
 * Resolve authentication context for a message
 * Returns userId if authenticated, throws AuthError if auth is required but not present
 * 
 * Uses session-storage as the single source of truth
 */
export async function resolveAuthContext(messageType: string): Promise<AuthContext> {
  const isRequired = AUTH_REQUIRED.has(messageType as MessageType);
  
  if (!isRequired) {
    return { userId: null, isRequired: false };
  }
  
  // Use session storage as the single source of truth
  const session = await getSession();
  
  if (!session) {
    throw new AuthError();
  }
  
  return { userId: session.user.id, isRequired: true };
}

/**
 * Check if a message type requires authentication
 */
export function requiresAuth(messageType: string): boolean {
  return AUTH_REQUIRED.has(messageType as MessageType);
}
