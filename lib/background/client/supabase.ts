import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration - these should be set in your environment
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  analysis: Record<string, unknown> | null;
  analyzed_at: string | null;
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

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
