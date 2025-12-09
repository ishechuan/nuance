import { supabase } from '../client/supabase';
import type { FavoriteType } from '@/lib/messages';

/**
 * Insert a new favorite
 */
export async function insert(
  userId: string, 
  articleId: string, 
  type: FavoriteType, 
  content: object
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: userId,
      article_id: articleId,
      type,
      content,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Delete a favorite by ID
 */
export async function deleteById(favoriteId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favoriteId);

  if (error) {
    throw error;
  }
}

/**
 * Find favorites by article ID and type
 */
export async function findByArticleAndType(
  userId: string, 
  articleId: string, 
  type: FavoriteType
): Promise<Array<{ id: string; content: unknown }>> {
  const { data } = await supabase
    .from('favorites')
    .select('id, content')
    .eq('user_id', userId)
    .eq('article_id', articleId)
    .eq('type', type);

  return data || [];
}

/**
 * Find all favorites for an article
 */
export async function findByArticle(
  userId: string, 
  articleId: string
): Promise<Array<{ id: string; type: string; content: unknown }>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id, type, content')
    .eq('user_id', userId)
    .eq('article_id', articleId);

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Find all favorites for a user with article info
 */
export async function findAllWithArticles(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      id,
      type,
      content,
      created_at,
      articles (
        id,
        url,
        title
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

