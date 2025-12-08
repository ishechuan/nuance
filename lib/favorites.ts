import { supabase } from './supabase';
import type { IdiomItem, SyntaxItem, VocabularyItem } from './storage';
import type { FavoriteType, FavoriteItem, ArticleWithFavorites, ExpressionWithArticles, ArticleFavoriteInfo } from './messages';

// Helper function to get expression key from content
function getExpressionKey(type: FavoriteType, content: IdiomItem | SyntaxItem | VocabularyItem): string {
  let expression: string;
  if (type === 'idiom') {
    expression = (content as IdiomItem).expression;
  } else if (type === 'syntax') {
    expression = (content as SyntaxItem).sentence;
  } else {
    expression = (content as VocabularyItem).word;
  }
  return `${type}:${expression}`;
}

// Get or create an article
async function getOrCreateArticle(userId: string, url: string, title: string) {
  // Try to find existing article
  const { data: existing } = await supabase
    .from('articles')
    .select('id')
    .eq('user_id', userId)
    .eq('url', url)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new article
  const { data: newArticle, error } = await supabase
    .from('articles')
    .insert({ user_id: userId, url, title })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create article: ${error.message}`);
  }

  return newArticle.id;
}

// Add a favorite
export async function addFavorite(
  userId: string,
  articleUrl: string,
  articleTitle: string,
  type: FavoriteType,
  content: IdiomItem | SyntaxItem | VocabularyItem
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const articleId = await getOrCreateArticle(userId, articleUrl, articleTitle);

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

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Error adding favorite:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to add favorite' 
    };
  }
}

// Remove a favorite
export async function removeFavorite(
  favoriteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (err) {
    console.error('Error removing favorite:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to remove favorite' 
    };
  }
}

// Check if an item is favorited
export async function checkIsFavorited(
  userId: string,
  articleUrl: string,
  type: FavoriteType,
  content: IdiomItem | SyntaxItem | VocabularyItem
): Promise<{ isFavorited: boolean; favoriteId?: string }> {
  try {
    // Get the expression/key field based on type
    let expression: string;
    if (type === 'idiom') {
      expression = (content as IdiomItem).expression;
    } else if (type === 'syntax') {
      expression = (content as SyntaxItem).sentence;
    } else {
      expression = (content as VocabularyItem).word;
    }

    // First get the article
    const { data: article } = await supabase
      .from('articles')
      .select('id')
      .eq('user_id', userId)
      .eq('url', articleUrl)
      .single();

    if (!article) {
      return { isFavorited: false };
    }

    // Check for favorite with matching content
    const { data: favorites } = await supabase
      .from('favorites')
      .select('id, content')
      .eq('user_id', userId)
      .eq('article_id', article.id)
      .eq('type', type);

    if (!favorites || favorites.length === 0) {
      return { isFavorited: false };
    }

    // Check if any favorite matches the expression
    for (const fav of favorites) {
      const favContent = fav.content as IdiomItem | SyntaxItem | VocabularyItem;
      let favExpression: string;
      
      if (type === 'idiom') {
        favExpression = (favContent as IdiomItem).expression;
      } else if (type === 'syntax') {
        favExpression = (favContent as SyntaxItem).sentence;
      } else {
        favExpression = (favContent as VocabularyItem).word;
      }

      if (favExpression === expression) {
        return { isFavorited: true, favoriteId: fav.id };
      }
    }

    return { isFavorited: false };
  } catch (err) {
    console.error('Error checking favorite:', err);
    return { isFavorited: false };
  }
}

// Get all favorites grouped by article
export async function getFavoritesByArticle(
  userId: string
): Promise<ArticleWithFavorites[]> {
  try {
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

    // Filter out articles with no favorites
    return (data || [])
      .filter(article => article.favorites && article.favorites.length > 0)
      .map(article => ({
        id: article.id,
        url: article.url,
        title: article.title || article.url,
        createdAt: article.created_at,
        favorites: article.favorites.map((fav: { id: string; type: string; content: unknown; created_at: string }) => ({
          id: fav.id,
          type: fav.type as FavoriteType,
          content: fav.content as IdiomItem | SyntaxItem | VocabularyItem,
          articleId: article.id,
          articleUrl: article.url,
          articleTitle: article.title || article.url,
          createdAt: fav.created_at,
        })),
      }));
  } catch (err) {
    console.error('Error getting favorites by article:', err);
    return [];
  }
}

// Get all favorites grouped by expression
export async function getFavoritesByExpression(
  userId: string
): Promise<ExpressionWithArticles[]> {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        type,
        content,
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

    // Group by expression
    const expressionMap = new Map<string, ExpressionWithArticles>();

    for (const item of data || []) {
      const content = item.content as IdiomItem | SyntaxItem | VocabularyItem;
      const type = item.type as FavoriteType;
      
      let expression: string;
      if (type === 'idiom') {
        expression = (content as IdiomItem).expression;
      } else if (type === 'syntax') {
        expression = (content as SyntaxItem).sentence.slice(0, 50) + '...';
      } else {
        expression = (content as VocabularyItem).word;
      }

      const key = `${type}:${expression}`;
      
      if (!expressionMap.has(key)) {
        expressionMap.set(key, {
          expression,
          type,
          articles: [],
        });
      }

      const entry = expressionMap.get(key)!;
      const article = item.articles as unknown as { id: string; url: string; title: string };
      
      entry.articles.push({
        id: article.id,
        url: article.url,
        title: article.title || article.url,
        favoriteId: item.id,
        content,
      });
    }

    return Array.from(expressionMap.values());
  } catch (err) {
    console.error('Error getting favorites by expression:', err);
    return [];
  }
}

// Search favorites
export async function searchFavorites(
  userId: string,
  query: string
): Promise<FavoriteItem[]> {
  try {
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
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const lowerQuery = query.toLowerCase();
    
    // Filter by search query
    return (data || [])
      .filter(item => {
        const content = item.content as IdiomItem | SyntaxItem | VocabularyItem;
        const type = item.type as FavoriteType;
        
        // Search in content fields
        if (type === 'idiom') {
          const idiom = content as IdiomItem;
          return idiom.expression.toLowerCase().includes(lowerQuery) ||
                 idiom.meaning.toLowerCase().includes(lowerQuery) ||
                 idiom.example.toLowerCase().includes(lowerQuery);
        } else if (type === 'syntax') {
          const syntax = content as SyntaxItem;
          return syntax.sentence.toLowerCase().includes(lowerQuery) ||
                 syntax.structure.toLowerCase().includes(lowerQuery) ||
                 syntax.explanation.toLowerCase().includes(lowerQuery);
        } else {
          const vocab = content as VocabularyItem;
          return vocab.word.toLowerCase().includes(lowerQuery) ||
                 vocab.definition.toLowerCase().includes(lowerQuery) ||
                 vocab.context.toLowerCase().includes(lowerQuery);
        }
      })
      .map(item => {
        const article = item.articles as unknown as { id: string; url: string; title: string };
        return {
          id: item.id,
          type: item.type as FavoriteType,
          content: item.content as IdiomItem | SyntaxItem | VocabularyItem,
          articleId: article.id,
          articleUrl: article.url,
          articleTitle: article.title || article.url,
          createdAt: item.created_at,
        };
      });
  } catch (err) {
    console.error('Error searching favorites:', err);
    return [];
  }
}

// Get all favorites for a specific article (batch operation for Card components)
export async function getArticleFavorites(
  userId: string,
  articleUrl: string
): Promise<Record<string, ArticleFavoriteInfo>> {
  try {
    // First get the article
    const { data: article } = await supabase
      .from('articles')
      .select('id')
      .eq('user_id', userId)
      .eq('url', articleUrl)
      .single();

    if (!article) {
      return {};
    }

    // Get all favorites for this article
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('id, type, content')
      .eq('user_id', userId)
      .eq('article_id', article.id);

    if (error) {
      throw error;
    }

    // Build the map: key = "type:expression", value = { favoriteId, type }
    const result: Record<string, ArticleFavoriteInfo> = {};
    
    for (const fav of favorites || []) {
      const type = fav.type as FavoriteType;
      const content = fav.content as IdiomItem | SyntaxItem | VocabularyItem;
      const key = getExpressionKey(type, content);
      
      result[key] = {
        favoriteId: fav.id,
        type,
      };
    }

    return result;
  } catch (err) {
    console.error('Error getting article favorites:', err);
    return {};
  }
}

