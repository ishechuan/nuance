import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Trash2, Download, FileText, Clock, Globe } from 'lucide-react';
import { useI18n } from '../i18n';
import { getAnalysisHistory, clearAnalysisHistory, deleteAnalysisRecord, type AnalysisRecord } from '@/lib/storage';
import { HistoryItem } from './HistoryItem';
import { HistoryDetailView } from './HistoryDetailView';

interface HistoryPanelProps {
  onBack: () => void;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

export function HistoryPanel({ onBack }: HistoryPanelProps) {
  const { t, lang } = useI18n();
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadHistory();
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

  const handleDelete = async (id: string) => {
    try {
      await deleteAnalysisRecord(id);
      const updated = records.filter((r) => r.id !== id);
      setRecords(updated);
    } catch (error) {
      console.error('Failed to delete record:', error);
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

  const handleExportJson = () => {
    const dataStr = JSON.stringify(records, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nuance-history-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = ['Title', 'URL', 'Date', 'Idioms', 'Syntax', 'Vocabulary'];
    const rows = records.map((r) => [
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.url}"`,
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
    a.download = `nuance-history-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getUniqueDomains = () => {
    const domains = new Set<string>();
    records.forEach((record) => {
      try {
        domains.add(new URL(record.url).hostname);
      } catch {
        // ignore invalid URLs
      }
    });
    return Array.from(domains).sort();
  };

  if (selectedRecord) {
    return (
      <HistoryDetailView
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
      />
    );
  }

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
            <div className="history-controls fade-in">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={t('search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                <h3>{lang === 'zh' ? '没有找到匹配的记录' : 'No matching records found'}</h3>
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
