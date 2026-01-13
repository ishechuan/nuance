import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, Download, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { getAnalysisHistory, clearAnalysisHistory, deleteAnalysisRecord, getConflictQueue } from '@/lib/storage';
import type { AnalysisRecord } from '@/lib/types';
import { resolveConflict, resolveAllConflicts } from '@/lib/github-sync';
import { HistoryItem } from './HistoryItem';
import { HistoryDetailView } from './HistoryDetailView';
import { SearchResults } from './SearchResults';
import { searchWord } from '@/lib/search';
import { useDebounce } from '@/hooks/useDebounce';
import type { ConflictRecord } from '@/lib/types';

interface HistoryPanelProps {
  onBack: () => void;
  onConflictsChange?: () => void;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';
type ViewMode = 'articles' | 'search';

export function HistoryPanel({ onBack, onConflictsChange }: HistoryPanelProps) {
  const { t, lang } = useI18n();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('articles');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadHistory();
    loadConflicts();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const history = await getAnalysisHistory();
      setRecords(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConflicts = async () => {
    const conflictQueue = await getConflictQueue();
    setConflicts(conflictQueue);
    onConflictsChange?.();
  };

  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.title.toLowerCase().includes(query) ||
          record.url.toLowerCase().includes(query)
      );
    }

    if (dateFilter !== 'all') {
      const now = Date.now();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayTimestamp = todayStart.getTime();

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekTimestamp = weekStart.getTime();

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthTimestamp = monthStart.getTime();

      filtered = filtered.filter((record) => {
        switch (dateFilter) {
          case 'today':
            return record.timestamp >= todayTimestamp;
          case 'week':
            return record.timestamp >= weekTimestamp;
          case 'month':
            return record.timestamp >= monthTimestamp;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [records, searchQuery, dateFilter]);

  const searchResults = useMemo(() => {
    return searchWord(debouncedSearchQuery, records);
  }, [debouncedSearchQuery, records]);

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysisRecord(id);
      const updated = records.filter((r) => r.id !== id);
      setRecords(updated);
    } catch (error) {
      console.error('Failed to delete record:', error);
    }
  };

  const handleResolveConflict = async (id: string, prefer: 'local' | 'remote') => {
    setResolvingId(id);
    try {
      await resolveConflict(id, prefer);
      await loadConflicts();
      await loadHistory();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAll = async (prefer: 'local' | 'remote') => {
    try {
      await resolveAllConflicts(prefer);
      await loadConflicts();
      await loadHistory();
      setShowConflictModal(false);
    } catch (error) {
      console.error('Failed to resolve all conflicts:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAnalysisHistory();
      setRecords([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const exportJson = (recordsToExport: AnalysisRecord[], filenamePrefix = 'nuance-history') => {
    const dataStr = JSON.stringify(recordsToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    exportJson(records);
  };

  const escapeCsvField = (value: string): string => {
    if (value == null) return '';
    
    // 防御CSV注入：公式前缀转义
    if (/^[=+\-@]/.test(value)) {
      value = '\t' + value;  // 添加制表符前缀，Excel仍显示原值但阻止公式执行
    }
    
    // 转义内部双引号
    value = value.replace(/"/g, '""');
    
    // 检查是否需要引号包装（包含逗号、换行符、双引号或首尾空格）
    const needsQuotes = /[,\r\n"]/.test(value) || /^\s|\s$/.test(value);
    
    return needsQuotes ? `"${value}"` : value;
  };

  const exportCsv = (recordsToExport: AnalysisRecord[], filenamePrefix = 'nuance-history') => {
    const headers = ['Title', 'URL', 'Date', 'Idioms', 'Syntax', 'Vocabulary'];
    const rows = recordsToExport.map((r) => [
      escapeCsvField(r.title),
      escapeCsvField(r.url),
      new Date(r.timestamp).toISOString(),
      r.analysis.idioms.length,
      r.analysis.syntax.length,
      r.analysis.vocabulary.length,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    exportCsv(records);
  };

  const handleExportSearchJson = () => {
    const searchRecordIds = new Set(searchResults.map(r => r.recordId));
    const filteredRecords = records.filter(r => searchRecordIds.has(r.id));
    exportJson(filteredRecords, 'nuance-search-results');
  };

  const handleExportSearchCsv = () => {
    const searchRecordIds = new Set(searchResults.map(r => r.recordId));
    const filteredRecords = records.filter(r => searchRecordIds.has(r.id));
    exportCsv(filteredRecords, 'nuance-search-results');
  };

  if (selectedRecord) {
    return (
      <HistoryDetailView
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
      />
    );
  }

  const renderArticlesView = () => (
    <>
      <div className="history-controls fade-in">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) setViewMode('search');
            }}
            className="form-input"
          />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="form-input form-select"
        >
          <option value="all">{t('allDates')}</option>
          <option value="today">{t('today')}</option>
          <option value="week">{t('thisWeek')}</option>
          <option value="month">{t('thisMonth')}</option>
        </select>

        <div className="history-actions">
          <button
            className="icon-btn-small"
            onClick={handleExportJson}
            title={t('exportJson')}
          >
            <Download size={16} />
          </button>
          <button
            className="icon-btn-small"
            onClick={handleExportCsv}
            title={t('exportCsv')}
          >
            <Download size={16} />
          </button>
          <button
            className="icon-btn-small icon-btn-danger"
            onClick={() => setShowClearConfirm(true)}
            title={t('clearHistory')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <div className="empty-state">
          <FileText className="empty-state-icon" size={48} />
          <h3>{t('noMatchingRecords')}</h3>
        </div>
      ) : (
        <div className="history-list">
          {filteredRecords.map((record) => (
            <HistoryItem
              key={record.id}
              record={record}
              onView={setSelectedRecord}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </>
  );

  const renderSearchView = () => (
    <>
      <div className="search-controls fade-in">
        <div className="search-box search-box-large">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            autoFocus
          />
        </div>
        <div className="history-actions">
          <button
            className="icon-btn-small"
            onClick={handleExportSearchJson}
            title={t('exportJson')}
            disabled={searchResults.length === 0}
          >
            <Download size={16} />
          </button>
          <button
            className="icon-btn-small"
            onClick={handleExportSearchCsv}
            title={t('exportCsv')}
            disabled={searchResults.length === 0}
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      <SearchResults
        results={searchResults}
        query={debouncedSearchQuery}
        records={records}
        onRecordClick={setSelectedRecord}
      />
    </>
  );

  return (
    <div className="history-panel">
      <header className="header">
        <div className="header-title">
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>{t('historyTitle')}</h1>
        </div>
      </header>

      {conflicts.length > 0 && (
        <div className="conflict-banner fade-in">
          <AlertTriangle size={16} />
          <span>{t('conflictsExist', conflicts.length.toString())}</span>
          <button className="btn-resolve" onClick={() => setShowConflictModal(true)}>
            {t('resolveConflicts')}
          </button>
        </div>
      )}

      <div className="content">
        {isLoading ? (
          <div className="loading">
            <div className="spinner" />
            <span className="loading-text">{t('loadingAnalyzing')}</span>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-state-icon" size={64} />
            <h3>{t('historyEmpty')}</h3>
            <p>{t('historyEmptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="view-tabs fade-in">
              <button
                className={`view-tab ${viewMode === 'articles' ? 'active' : ''}`}
                onClick={() => setViewMode('articles')}
              >
                {t('tabArticles')}
              </button>
              <button
                className={`view-tab ${viewMode === 'search' ? 'active' : ''}`}
                onClick={() => setViewMode('search')}
              >
                {t('tabSearch')}
              </button>
            </div>

            {viewMode === 'articles' ? renderArticlesView() : renderSearchView()}

            {showConflictModal && (
              <div className="modal-overlay" onClick={() => setShowConflictModal(false)}>
                <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <AlertTriangle size={20} className="modal-icon warning" />
                    <h3>{t('resolveConflicts')}</h3>
                  </div>
                  <div className="modal-body">
                    {conflicts.map((conflict) => (
                      <div key={conflict.local.id} className="conflict-item">
                        <div className="conflict-title">{t('conflictRecord', conflict.local.title)}</div>
                        <div className="conflict-meta">
                          <span className="conflict-local">
                            <CheckCircle size={12} />
                            {new Date(conflict.localTimestamp).toLocaleString()}
                          </span>
                          <span className="conflict-remote">
                            <XCircle size={12} />
                            {new Date(conflict.remoteTimestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="conflict-actions">
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => handleResolveConflict(conflict.local.id, 'local')}
                            disabled={resolvingId === conflict.local.id}
                          >
                            {t('keepLocal')}
                          </button>
                          <button
                            className="btn-small btn-secondary"
                            onClick={() => handleResolveConflict(conflict.local.id, 'remote')}
                            disabled={resolvingId === conflict.local.id}
                          >
                            {t('keepRemote')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => handleResolveAll('local')}
                      disabled={resolvingId !== null}
                    >
                      {t('keepAllLocal')}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleResolveAll('remote')}
                      disabled={resolvingId !== null}
                    >
                      {t('keepAllRemote')}
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => setShowConflictModal(false)}
                      disabled={resolvingId !== null}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showClearConfirm && (
              <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <h3>{t('clearHistory')}</h3>
                  <p>{t('confirmClear')}</p>
                  <div className="modal-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      className="btn-primary btn-danger"
                      onClick={handleClearAll}
                    >
                      {t('confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
