import { FileSearch } from 'lucide-react';
import { useI18n } from '../i18n';
import type { SearchResult, AnalysisRecord } from '@/lib/types';
import { SearchResultItem } from './SearchResultItem';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  records: AnalysisRecord[];
  onRecordClick: (record: AnalysisRecord) => void;
}

export function SearchResults({ results, query, records, onRecordClick }: SearchResultsProps) {
  const { t } = useI18n();

  if (!query) {
    return (
      <div className="search-empty-state">
        <FileSearch size={48} className="search-empty-icon" />
        <p className="search-empty-text">{t('searchEmpty')}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-empty-state">
        <FileSearch size={48} className="search-empty-icon" />
        <p className="search-empty-text">{t('searchNoResults', query)}</p>
      </div>
    );
  }

  const handleResultClick = (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (record) {
      onRecordClick(record);
    }
  };

  return (
    <div className="search-results">
      <p className="search-summary">
        {t('searchResultsCount', query, results.length.toString())}
      </p>
      <div className="search-results-list">
        {results.map(result => (
          <SearchResultItem
            key={result.recordId}
            result={result}
            onClick={() => handleResultClick(result.recordId)}
          />
        ))}
      </div>
    </div>
  );
}
