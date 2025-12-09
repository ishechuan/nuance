import { supabase } from '../client/supabase';

/**
 * Find an article by user ID and URL
 */
export async function findByUrl(userId: string, url: string): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('articles')
    .select('id')
    .eq('user_id', userId)
    .eq('url', url)
    .single();

  return data;
}

/**
 * Insert a new article
 */
export async function insert(userId: string, url: string, title: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('articles')
    .insert({ user_id: userId, url, title })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create article: ${error.message}`);
  }

  return data;
}

/**
 * Get all articles with their favorites for a user
 */
export async function findAllWithFavorites(userId: string) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      id,
      url,
      title,
      created_at,
      favorites (
        id,
        type,
        content,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

