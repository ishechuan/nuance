import { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import type { SyntaxItem } from '@/lib/storage';
import type { AddFavoriteResponse, RemoveFavoriteResponse } from '@/lib/messages';

interface SyntaxCardProps {
  item: SyntaxItem;
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

export function SyntaxCard({ 
  item, 
  isHighlighted, 
  onHighlight, 
  articleUrl, 
  articleTitle,
  isFavorited = false,
  favoriteId,
  onFavoriteAdded,
  onFavoriteRemoved,
}: SyntaxCardProps) {
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
          favoriteType: 'syntax',
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

  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <span className="card-structure">{item.structure}</span>
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
      <p className="card-explanation">{item.explanation}</p>
      <div className="card-context">"{item.sentence}"</div>
    </div>
  );
}
