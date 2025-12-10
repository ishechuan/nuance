import * as articleRepo from '../repositories/article-repository';
import * as favoriteRepo from '../repositories/favorite-repository';
import { getExpression, getExpressionKey, getDisplayExpression, matchesSearchQuery, type FavoriteContent } from '../utils/content-helpers';
import type { 
  FavoriteType, 
  FavoriteItem, 
  ArticleWithFavorites, 
  ExpressionWithArticles,
  ArticleFavoriteInfo,
  AddFavoriteResponse,
  RemoveFavoriteResponse,
  CheckIsFavoritedResponse,
  GetFavoritesByArticleResponse,
  GetFavoritesByExpressionResponse,
  SearchFavoritesResponse,
  GetArticleFavoritesResponse,
  GetManualEntriesResponse,
} from '@/lib/messages';
import type { IdiomItem, SyntaxItem, VocabularyItem } from '@/lib/storage';

/**
 * Get or create an article, returns article ID
 */
async function getOrCreateArticle(userId: string, url: string, title: string): Promise<string> {
  const existing = await articleRepo.findByUrl(userId, url);
  if (existing) {
    return existing.id;
  }
  const newArticle = await articleRepo.insert(userId, url, title);
  return newArticle.id;
}

/**
 * Add a favorite
 */
export async function addFavorite(
  userId: string,
  articleUrl: string,
  articleTitle: string,
  type: FavoriteType,
  content: FavoriteContent
): Promise<AddFavoriteResponse> {
  const articleId = await getOrCreateArticle(userId, articleUrl, articleTitle);
  const favorite = await favoriteRepo.insert(userId, articleId, type, content);
  return { success: true, id: favorite.id };
}

/**
 * Remove a favorite
 */
export async function removeFavorite(favoriteId: string): Promise<RemoveFavoriteResponse> {
  await favoriteRepo.deleteById(favoriteId);
  return { success: true };
}

/**
 * Check if an item is favorited
 */
export async function checkIsFavorited(
  userId: string,
  articleUrl: string,
  type: FavoriteType,
  content: FavoriteContent
): Promise<CheckIsFavoritedResponse> {
  const expression = getExpression(type, content);
  
  // Find the article
  const article = await articleRepo.findByUrl(userId, articleUrl);
  if (!article) {
    return { success: true, isFavorited: false };
  }
  
  // Find favorites matching the type
  const favorites = await favoriteRepo.findByArticleAndType(userId, article.id, type);
  
  // Check if any favorite matches the expression
  for (const fav of favorites) {
    const favContent = fav.content as FavoriteContent;
    const favExpression = getExpression(type, favContent);
    
    if (favExpression === expression) {
      return { success: true, isFavorited: true, favoriteId: fav.id };
    }
  }
  
  return { success: true, isFavorited: false };
}

/**
 * Get all favorites grouped by article
 */
export async function getFavoritesByArticle(userId: string): Promise<GetFavoritesByArticleResponse> {
  const articles = await articleRepo.findAllWithFavorites(userId);
  
  const data: ArticleWithFavorites[] = articles
    .filter(article => article.favorites && article.favorites.length > 0)
    .map(article => ({
      id: article.id,
      url: article.url,
      title: article.title || article.url,
      createdAt: article.created_at,
      favorites: article.favorites.map((fav: { id: string; type: string; content: unknown; created_at: string }) => ({
        id: fav.id,
        type: fav.type as FavoriteType,
        content: fav.content as FavoriteContent,
        articleId: article.id,
        articleUrl: article.url,
        articleTitle: article.title || article.url,
        createdAt: fav.created_at,
      })),
    }));
  
  return { success: true, data };
}

/**
 * Get all favorites grouped by expression
 */
export async function getFavoritesByExpression(userId: string): Promise<GetFavoritesByExpressionResponse> {
  const favorites = await favoriteRepo.findAllWithArticles(userId);
  
  // Group by expression
  const expressionMap = new Map<string, ExpressionWithArticles>();
  
  for (const item of favorites) {
    const content = item.content as FavoriteContent;
    const type = item.type as FavoriteType;
    const expression = getDisplayExpression(type, content);
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
  
  return { success: true, data: Array.from(expressionMap.values()) };
}

/**
 * Search favorites by query
 */
export async function searchFavorites(userId: string, query: string): Promise<SearchFavoritesResponse> {
  const favorites = await favoriteRepo.findAllWithArticles(userId);
  
  const data: FavoriteItem[] = favorites
    .filter(item => {
      const content = item.content as FavoriteContent;
      const type = item.type as FavoriteType;
      return matchesSearchQuery(type, content, query);
    })
    .map(item => {
      const article = item.articles as unknown as { id: string; url: string; title: string };
      return {
        id: item.id,
        type: item.type as FavoriteType,
        content: item.content as FavoriteContent,
        articleId: article.id,
        articleUrl: article.url,
        articleTitle: article.title || article.url,
        createdAt: item.created_at,
      };
    });
  
  return { success: true, data };
}

/**
 * Get all favorites for a specific article (batch operation for Card components)
 */
export async function getArticleFavorites(
  userId: string, 
  articleUrl: string
): Promise<GetArticleFavoritesResponse> {
  const article = await articleRepo.findByUrl(userId, articleUrl);
  if (!article) {
    return { success: true, favorites: {} };
  }
  
  const favorites = await favoriteRepo.findByArticle(userId, article.id);
  
  // Build the map
  const result: Record<string, ArticleFavoriteInfo> = {};
  
  for (const fav of favorites) {
    const type = fav.type as FavoriteType;
    const content = fav.content as FavoriteContent;
    const key = getExpressionKey(type, content);
    
    result[key] = {
      favoriteId: fav.id,
      type,
    };
  }
  
  return { success: true, favorites: result };
}

/**
 * Get manual entries for a specific article
 * Filters favorites where content.isManual === true
 */
export async function getManualEntries(
  userId: string,
  articleUrl: string
): Promise<GetManualEntriesResponse> {
  const article = await articleRepo.findByUrl(userId, articleUrl);
  if (!article) {
    return { 
      success: true, 
      data: { idioms: [], syntax: [], vocabulary: [] } 
    };
  }
  
  const favorites = await favoriteRepo.findByArticle(userId, article.id);
  
  // Filter and group manual entries
  const idioms: IdiomItem[] = [];
  const syntax: SyntaxItem[] = [];
  const vocabulary: VocabularyItem[] = [];
  
  for (const fav of favorites) {
    const content = fav.content as FavoriteContent;
    
    // Check if this is a manual entry
    if (!('isManual' in content) || !content.isManual) {
      continue;
    }
    
    const type = fav.type as FavoriteType;
    
    switch (type) {
      case 'idiom':
        idioms.push(content as IdiomItem);
        break;
      case 'syntax':
        syntax.push(content as SyntaxItem);
        break;
      case 'vocabulary':
        vocabulary.push(content as VocabularyItem);
        break;
    }
  }
  
  return { 
    success: true, 
    data: { idioms, syntax, vocabulary } 
  };
}

