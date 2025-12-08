import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import type { ArticleWithFavorites, FavoriteItem } from '@/lib/messages';

interface FavoritesByArticleProps {
  articles: ArticleWithFavorites[];
  onDelete: (favoriteId: string) => void;
}

export function FavoritesByArticle({ articles, onDelete }: FavoritesByArticleProps) {
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  const toggleArticle = (articleId: string) => {
    setExpandedArticles(prev => {
      const next = new Set(prev);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  };

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="favorites-list">
      {articles.map(article => (
        <ArticleGroup
          key={article.id}
          article={article}
          isExpanded={expandedArticles.has(article.id)}
          onToggle={() => toggleArticle(article.id)}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

interface ArticleGroupProps {
  article: ArticleWithFavorites;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (favoriteId: string) => void;
}

function ArticleGroup({ article, isExpanded, onToggle, onDelete }: ArticleGroupProps) {
  const getTypeCount = (type: string) => {
    return article.favorites.filter(f => f.type === type).length;
  };

  return (
    <div className="article-group">
      <button className="article-header" onClick={onToggle}>
        <div className="article-header-left">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="article-title">{article.title}</span>
        </div>
        <div className="article-header-right">
          <span className="article-count">{article.favorites.length}</span>
          <a 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="article-link"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </button>

      {isExpanded && (
        <div className="article-favorites">
          {/* Group by type */}
          {['idiom', 'syntax', 'vocabulary'].map(type => {
            const items = article.favorites.filter(f => f.type === type);
            if (items.length === 0) return null;

            return (
              <div key={type} className="type-section">
                <div className="type-header">
                  <span className={`type-badge ${type}`}>
                    {type === 'idiom' ? '习惯用法' : type === 'syntax' ? '语法' : '词汇'}
                  </span>
                  <span className="type-count">{items.length}</span>
                </div>
                <div className="type-items">
                  {items.map(item => (
                    <FavoriteItemCard 
                      key={item.id} 
                      item={item} 
                      onDelete={() => onDelete(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FavoriteItemCardProps {
  item: FavoriteItem;
  onDelete: () => void;
}

function FavoriteItemCard({ item, onDelete }: FavoriteItemCardProps) {
  const renderContent = () => {
    if (item.type === 'idiom') {
      const content = item.content as { expression: string; meaning: string; example: string };
      return (
        <>
          <div className="item-expression">{content.expression}</div>
          <div className="item-meaning">{content.meaning}</div>
          <div className="item-example">"{content.example}"</div>
        </>
      );
    } else if (item.type === 'syntax') {
      const content = item.content as { sentence: string; structure: string; explanation: string };
      return (
        <>
          <div className="item-expression">{content.structure}</div>
          <div className="item-meaning">{content.explanation}</div>
          <div className="item-example">"{content.sentence}"</div>
        </>
      );
    } else {
      const content = item.content as { word: string; level: string; definition: string; context: string };
      return (
        <>
          <div className="item-expression">
            {content.word}
            <span className="level-badge">{content.level}</span>
          </div>
          <div className="item-meaning">{content.definition}</div>
          <div className="item-example">"{content.context}"</div>
        </>
      );
    }
  };

  return (
    <div className="favorite-item">
      <div className="favorite-item-content">
        {renderContent()}
      </div>
      <button 
        className="delete-btn" 
        onClick={onDelete}
        title="删除收藏"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

