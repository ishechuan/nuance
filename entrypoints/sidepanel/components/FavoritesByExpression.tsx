import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import type { ExpressionWithArticles } from '@/lib/messages';

interface FavoritesByExpressionProps {
  expressions: ExpressionWithArticles[];
  onDelete: (favoriteId: string) => void;
}

export function FavoritesByExpression({ expressions, onDelete }: FavoritesByExpressionProps) {
  const [expandedExpressions, setExpandedExpressions] = useState<Set<string>>(new Set());

  const toggleExpression = (key: string) => {
    setExpandedExpressions(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (expressions.length === 0) {
    return null;
  }

  // Group by type
  const idioms = expressions.filter(e => e.type === 'idiom');
  const syntax = expressions.filter(e => e.type === 'syntax');
  const vocabulary = expressions.filter(e => e.type === 'vocabulary');

  return (
    <div className="favorites-list">
      {idioms.length > 0 && (
        <TypeSection
          title="习惯用法"
          type="idiom"
          expressions={idioms}
          expandedExpressions={expandedExpressions}
          onToggle={toggleExpression}
          onDelete={onDelete}
        />
      )}
      
      {syntax.length > 0 && (
        <TypeSection
          title="语法"
          type="syntax"
          expressions={syntax}
          expandedExpressions={expandedExpressions}
          onToggle={toggleExpression}
          onDelete={onDelete}
        />
      )}
      
      {vocabulary.length > 0 && (
        <TypeSection
          title="词汇"
          type="vocabulary"
          expressions={vocabulary}
          expandedExpressions={expandedExpressions}
          onToggle={toggleExpression}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

interface TypeSectionProps {
  title: string;
  type: string;
  expressions: ExpressionWithArticles[];
  expandedExpressions: Set<string>;
  onToggle: (key: string) => void;
  onDelete: (favoriteId: string) => void;
}

function TypeSection({ 
  title, 
  type, 
  expressions, 
  expandedExpressions, 
  onToggle,
  onDelete 
}: TypeSectionProps) {
  return (
    <div className="expression-type-section">
      <div className="expression-type-header">
        <span className={`type-badge ${type}`}>{title}</span>
        <span className="expression-count">{expressions.length} 个表达式</span>
      </div>
      
      <div className="expression-list">
        {expressions.map(expr => {
          const key = `${expr.type}:${expr.expression}`;
          const isExpanded = expandedExpressions.has(key);
          
          return (
            <div key={key} className="expression-group">
              <button 
                className="expression-header"
                onClick={() => onToggle(key)}
              >
                <div className="expression-header-left">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="expression-text">{expr.expression}</span>
                </div>
                <span className="article-count">
                  {expr.articles.length} 篇文章
                </span>
              </button>

              {isExpanded && (
                <div className="expression-articles">
                  {expr.articles.map(article => (
                    <div key={article.favoriteId} className="expression-article">
                      <div className="expression-article-info">
                        <a 
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="expression-article-title"
                        >
                          {article.title}
                          <ExternalLink size={12} />
                        </a>
                        <div className="expression-article-content">
                          {renderArticleContent(expr.type, article.content)}
                        </div>
                      </div>
                      <button 
                        className="delete-btn"
                        onClick={() => onDelete(article.favoriteId)}
                        title="删除收藏"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderArticleContent(type: string, content: unknown) {
  if (type === 'idiom') {
    const c = content as { meaning: string; example: string };
    return (
      <>
        <p className="content-meaning">{c.meaning}</p>
        <p className="content-example">"{c.example}"</p>
      </>
    );
  } else if (type === 'syntax') {
    const c = content as { explanation: string; sentence: string };
    return (
      <>
        <p className="content-meaning">{c.explanation}</p>
        <p className="content-example">"{c.sentence}"</p>
      </>
    );
  } else {
    const c = content as { definition: string; context: string; level: string };
    return (
      <>
        <p className="content-meaning">
          <span className="level-badge">{c.level}</span>
          {c.definition}
        </p>
        <p className="content-example">"{c.context}"</p>
      </>
    );
  }
}

