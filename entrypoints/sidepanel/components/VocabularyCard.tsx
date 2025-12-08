import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import type { VocabularyItem } from '@/lib/storage';
import type { AddFavoriteResponse, RemoveFavoriteResponse } from '@/lib/messages';

interface VocabularyCardProps {
  item: VocabularyItem;
  isHighlighted: boolean;
  onHighlight: () => void;
  articleUrl?: string;
  articleTitle?: string;
  // Favorites state from parent (batch fetched)
  isFavorited?: boolean;
  favoriteId?: string;
  onFavoriteAdded?: (favoriteId: string) => void;
  onFavoriteRemoved?: () => void;
}

export function VocabularyCard({ 
  item, 
  isHighlighted, 
  onHighlight, 
  articleUrl, 
  articleTitle,
  isFavorited = false,
  favoriteId,
  onFavoriteAdded,
  onFavoriteRemoved,
}: VocabularyCardProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!articleUrl || isLoading) return;

    setIsLoading(true);
    try {
      if (isFavorited && favoriteId) {
        const response: RemoveFavoriteResponse = await browser.runtime.sendMessage({
          type: 'REMOVE_FAVORITE',
          favoriteId,
        });
        if (response.success) {
          onFavoriteRemoved?.();
        }
      } else {
        const response: AddFavoriteResponse = await browser.runtime.sendMessage({
          type: 'ADD_FAVORITE',
          articleUrl,
          articleTitle: articleTitle || document.title || articleUrl,
          favoriteType: 'vocabulary',
          content: item,
        });
        if (response.success && response.id) {
          onFavoriteAdded?.(response.id);
        }
      }
    } catch (err) {
      console.error('Favorite error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getLevelColor = () => {
    switch (item.level) {
      case 'B1': return 'var(--level-b1)';
      case 'B2': return 'var(--level-b2)';
      case 'C1': return 'var(--level-c1)';
      case 'C2': return 'var(--level-c2)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <div className="card-word-container">
          <span className="card-word">{item.word}</span>
          <span 
            className="card-level" 
            style={{ backgroundColor: getLevelColor() }}
          >
            {item.level}
          </span>
        </div>
        {articleUrl && (
          <button 
            className={`favorite-btn ${isFavorited ? 'favorited' : ''}`}
            onClick={handleFavoriteClick}
            disabled={isLoading}
            title={isFavorited ? '取消收藏' : '收藏'}
          >
            {isLoading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
            )}
          </button>
        )}
      </div>
      <p className="card-definition">{item.definition}</p>
      <div className="card-context">"{item.context}"</div>
    </div>
  );
}
