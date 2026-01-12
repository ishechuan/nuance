import { BookOpen, Type, Hash } from 'lucide-react';
import { useI18n } from '../i18n';
import type { SearchResult } from '@/lib/types';

interface SearchResultItemProps {
  result: SearchResult;
  onClick: () => void;
}

export function SearchResultItem({ result, onClick }: SearchResultItemProps) {
  const { t } = useI18n();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'idiom':
        return <BookOpen size={12} />;
      case 'syntax':
        return <Type size={12} />;
      case 'vocabulary':
        return <Hash size={12} />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'idiom':
        return t('matchIdiom');
      case 'syntax':
        return t('matchSyntax');
      case 'vocabulary':
        return t('matchVocabulary');
      default:
        return '';
    }
  };

  const getDisplayText = (match: { expression?: string; word?: string; sentence?: string; example?: string }) => {
    if (match.expression) return match.expression;
    if (match.word) return match.word;
    if (match.sentence) return match.sentence.length > 60 ? match.sentence.slice(0, 60) + '...' : match.sentence;
    return '';
  };

  return (
    <div className="search-result-item" onClick={onClick}>
      <div className="search-result-header">
        <span className="search-result-title">{result.title}</span>
        <span className="search-result-count">{t('matchCount', result.matchCount.toString())}</span>
      </div>
      
      <div className="search-result-matches">
        {result.matches.slice(0, 3).map((match, index) => (
          <div key={index} className="search-match-item">
            <span className={`search-match-type search-match-${match.type}`}>
              {getTypeIcon(match.type)}
              <span>{getTypeLabel(match.type)}</span>
            </span>
            <span className="search-match-expression">{getDisplayText(match)}</span>
            <span className="search-match-meaning">{match.meaning}</span>
          </div>
        ))}
        {result.matches.length > 3 && (
          <span className="search-match-more">
            {t('matchMore', (result.matches.length - 3).toString())}
          </span>
        )}
      </div>
    </div>
  );
}
