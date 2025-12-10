import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, FileText, Tag, Loader2, AlertTriangle } from 'lucide-react';
import { FavoritesByArticle } from './FavoritesByArticle';
import { FavoritesByExpression } from './FavoritesByExpression';
import { useAuthStore } from '../store/auth';
import type { 
  ArticleWithFavorites,
  ExpressionWithArticles,
  FavoriteItem,
  GetFavoritesByArticleResponse,
  GetFavoritesByExpressionResponse,
  SearchFavoritesResponse,
  RemoveFavoriteResponse,
} from '@/lib/messages';

type ViewMode = 'by-article' | 'by-expression';

interface FavoritesProps {
  onBack: () => void;
}

export function Favorites({ onBack }: FavoritesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('by-article');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Get userId from Zustand store (no more individual API calls)
  const userId = useAuthStore((state) => state.userId);
  
  const [articleData, setArticleData] = useState<ArticleWithFavorites[]>([]);
  const [expressionData, setExpressionData] = useState<ExpressionWithArticles[]>([]);
  const [searchResults, setSearchResults] = useState<FavoriteItem[] | null>(null);
  
  // Delete confirmation state
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data when userId is available
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId, viewMode]);

  const loadData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      if (viewMode === 'by-article') {
        const response: GetFavoritesByArticleResponse = await browser.runtime.sendMessage({
          type: 'GET_FAVORITES_BY_ARTICLE',
        });
        if (response.success && response.data) {
          setArticleData(response.data);
        }
      } else {
        const response: GetFavoritesByExpressionResponse = await browser.runtime.sendMessage({
          type: 'GET_FAVORITES_BY_EXPRESSION',
        });
        if (response.success && response.data) {
          setExpressionData(response.data);
        }
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (!userId || !query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response: SearchFavoritesResponse = await browser.runtime.sendMessage({
        type: 'SEARCH_FAVORITES',
        query: query.trim(),
      });
      if (response.success && response.data) {
        setSearchResults(response.data);
      }
    } catch (err) {
      console.error('Error searching:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Request delete (show confirmation dialog)
  const requestDelete = useCallback((favoriteId: string) => {
    setPendingDeleteId(favoriteId);
  }, []);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  // Confirm and execute delete
  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteId) return;
    
    setIsDeleting(true);
    try {
      const response: RemoveFavoriteResponse = await browser.runtime.sendMessage({
        type: 'REMOVE_FAVORITE',
        favoriteId: pendingDeleteId,
      });
      
      if (response.success) {
        // Update local state instead of reloading
        // Update articleData
        setArticleData(prev => {
          const updated = prev.map(article => ({
            ...article,
            favorites: article.favorites.filter(f => f.id !== pendingDeleteId)
          }));
          // Remove articles with no favorites left
          return updated.filter(article => article.favorites.length > 0);
        });
        
        // Update expressionData
        setExpressionData(prev => {
          const updated = prev.map(expr => ({
            ...expr,
            articles: expr.articles.filter(a => a.favoriteId !== pendingDeleteId)
          }));
          // Remove expressions with no articles left
          return updated.filter(expr => expr.articles.length > 0);
        });
        
        // Update search results if searching
        if (searchResults) {
          setSearchResults(searchResults.filter(item => item.id !== pendingDeleteId));
        }
      }
    } catch (err) {
      console.error('Error deleting favorite:', err);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, searchResults]);

  // Get total count
  const getTotalCount = () => {
    if (viewMode === 'by-article') {
      return articleData.reduce((sum, article) => sum + article.favorites.length, 0);
    }
    return expressionData.reduce((sum, expr) => sum + expr.articles.length, 0);
  };

  return (
    <>
      <header className="header">
        <div className="header-title">
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>收藏夹</h1>
        </div>
      </header>

      <div className="favorites-container">
        {/* Search Bar */}
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="搜索收藏内容..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* View Mode Toggle */}
        {!searchQuery && (
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'by-article' ? 'active' : ''}`}
              onClick={() => setViewMode('by-article')}
            >
              <FileText size={14} />
              <span>按文章</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'by-expression' ? 'active' : ''}`}
              onClick={() => setViewMode('by-expression')}
            >
              <Tag size={14} />
              <span>按表达式</span>
            </button>
          </div>
        )}

        {/* Stats */}
        {!searchQuery && !isLoading && (
          <div className="favorites-stats">
            共 {getTotalCount()} 条收藏
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="loading">
            <Loader2 size={24} className="spin" />
          </div>
        )}

        {/* Content */}
        {!isLoading && (
          <>
            {/* Search Results */}
            {searchQuery && searchResults !== null && (
              <div className="search-results">
                {searchResults.length === 0 ? (
                  <div className="empty-state">
                    <Search size={48} className="empty-state-icon" />
                    <p>未找到匹配的收藏</p>
                  </div>
                ) : (
                  <div className="card-list">
                    {searchResults.map(item => (
                      <SearchResultCard 
                        key={item.id} 
                        item={item} 
                        onDelete={() => requestDelete(item.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* By Article View */}
            {!searchQuery && viewMode === 'by-article' && (
              <FavoritesByArticle 
                articles={articleData} 
                onDelete={requestDelete}
              />
            )}

            {/* By Expression View */}
            {!searchQuery && viewMode === 'by-expression' && (
              <FavoritesByExpression 
                expressions={expressionData} 
                onDelete={requestDelete}
              />
            )}

            {/* Empty State */}
            {!searchQuery && getTotalCount() === 0 && (
              <div className="empty-state">
                <FileText size={48} className="empty-state-icon" />
                <h3>暂无收藏</h3>
                <p>分析文章时点击卡片上的收藏按钮即可添加收藏</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {pendingDeleteId && (
        <div className="confirm-dialog-overlay" onClick={cancelDelete}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-icon">
              <AlertTriangle size={24} />
            </div>
            <h3 className="confirm-dialog-title">确认删除</h3>
            <p className="confirm-dialog-message">确定要删除这条收藏吗？此操作无法撤销。</p>
            <div className="confirm-dialog-actions">
              <button 
                className="btn-cancel" 
                onClick={cancelDelete}
                disabled={isDeleting}
              >
                取消
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    删除中...
                  </>
                ) : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Search Result Card Component
interface SearchResultCardProps {
  item: FavoriteItem;
  onDelete: () => void;
}

function SearchResultCard({ item, onDelete }: SearchResultCardProps) {
  const getTypeLabel = () => {
    switch (item.type) {
      case 'idiom': return '习惯用法';
      case 'syntax': return '语法';
      case 'vocabulary': return '词汇';
    }
  };

  const getTitle = () => {
    if (item.type === 'idiom') {
      return (item.content as { expression: string }).expression;
    } else if (item.type === 'syntax') {
      return (item.content as { structure: string }).structure;
    } else {
      return (item.content as { word: string }).word;
    }
  };

  const getDescription = () => {
    if (item.type === 'idiom') {
      return (item.content as { meaning: string }).meaning;
    } else if (item.type === 'syntax') {
      return (item.content as { explanation: string }).explanation;
    } else {
      return (item.content as { definition: string }).definition;
    }
  };

  return (
    <div className="favorite-card">
      <div className="favorite-card-header">
        <span className={`type-badge ${item.type}`}>{getTypeLabel()}</span>
        <button className="delete-btn" onClick={onDelete} title="删除收藏">
          ×
        </button>
      </div>
      <h4 className="favorite-card-title">{getTitle()}</h4>
      <p className="favorite-card-desc">{getDescription()}</p>
      <div className="favorite-card-meta">
        来自: {item.articleTitle}
      </div>
    </div>
  );
}
