import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Supabase configuration - these should be set in your environment
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Storage keys for browser extension
const STORAGE_KEYS = {
  SESSION: 'nuance_supabase_session',
} as const;

// Create Supabase client
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // We'll handle persistence manually for extension
    detectSessionInUrl: false,
  },
});

// Database types
export interface Profile {
  id: string;
  is_pro: boolean;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  article_id: string;
  type: 'idiom' | 'syntax' | 'vocabulary';
  content: Record<string, unknown>;
  created_at: string;
}

export interface FavoriteWithArticle extends Favorite {
  articles: Article;
}

export interface UsageLog {
  id: string;
  user_id: string;
  created_at: string;
}

// Session management for browser extension
export async function saveSession(session: Session): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.SESSION]: session });
}

export async function getStoredSession(): Promise<Session | null> {
  const result = await browser.storage.local.get(STORAGE_KEYS.SESSION);
  return result[STORAGE_KEYS.SESSION] || null;
}

export async function clearStoredSession(): Promise<void> {
  await browser.storage.local.remove(STORAGE_KEYS.SESSION);
}

// Initialize session from storage
export async function initializeSession(): Promise<Session | null> {
  const storedSession = await getStoredSession();
  if (storedSession) {
    const { data, error } = await supabase.auth.setSession(storedSession);
    if (error) {
      await clearStoredSession();
      return null;
    }
    return data.session;
  }
  return null;
}

// Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get user profile
export async function getUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

