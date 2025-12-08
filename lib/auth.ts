import { supabase, saveSession, clearStoredSession, initializeSession, getCurrentUser, getUserProfile } from './supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from './supabase';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Sign in with email and password
// If user doesn't exist, automatically register and sign in
export async function signInWithEmail(email: string, password: string): Promise<{ session: Session | null; error: Error | null }> {
  try {
    // First try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If sign in successful
    if (signInData.session) {
      await saveSession(signInData.session);
      return { session: signInData.session, error: null };
    }

    // If error is "Invalid login credentials", try to register
    if (signInError?.message?.includes('Invalid login credentials')) {
      console.log('[Nuance Auth] User not found, attempting to register...');
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Skip email confirmation for easier UX
          emailRedirectTo: undefined,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // If sign up successful and session exists (no email confirmation required)
      if (signUpData.session) {
        await saveSession(signUpData.session);
        return { session: signUpData.session, error: null };
      }

      // If email confirmation is required, inform the user
      if (signUpData.user && !signUpData.session) {
        throw new Error('注册成功！请检查邮箱确认后再登录。');
      }

      throw new Error('注册失败，请重试');
    }

    // Other sign in errors
    if (signInError) {
      throw signInError;
    }

    throw new Error('登录失败，请重试');
  } catch (err) {
    console.error('[Nuance Auth] Sign-in error:', err);
    return { 
      session: null, 
      error: err instanceof Error ? err : new Error('登录失败') 
    };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await clearStoredSession();
}

// Get current auth state
export async function getAuthState(): Promise<AuthState> {
  try {
    const session = await initializeSession();
    
    if (!session) {
      return {
        user: null,
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      };
    }

    const user = await getCurrentUser();
    const profile = await getUserProfile();

    return {
      user,
      profile,
      isLoading: false,
      isAuthenticated: Boolean(user),
    };
  } catch (error) {
    console.error('Error getting auth state:', error);
    return {
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
    };
  }
}

// Refresh session
export async function refreshSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  
  if (error) {
    console.error('Error refreshing session:', error);
    await clearStoredSession();
    return null;
  }

  if (data.session) {
    await saveSession(data.session);
  }

  return data.session;
}
