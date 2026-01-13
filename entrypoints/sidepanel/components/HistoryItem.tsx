import { Clock, Globe, ExternalLink, Trash2, FileText, MessageSquare, BookOpen, Lightbulb } from 'lucide-react';
import { useI18n } from '../i18n';
import type { AnalysisRecord } from '@/lib/types';

interface HistoryItemProps {
  record: AnalysisRecord;
  onView: (record: AnalysisRecord) => void;
  onDelete: (id: string) => void;
}

export function HistoryItem({ record, onView, onDelete }: HistoryItemProps) {
  const { t, lang } = useI18n();

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
      return t('timeJustNow');
    } else if (minutes < 60) {
      return t('timeMinutesAgo', minutes.toString());
    } else if (hours < 24) {
      return t('timeHoursAgo', hours.toString());
    } else if (days < 7) {
      return t('timeDaysAgo', days.toString());
    } else {
      const date = new Date(timestamp);
      return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  const domain = getDomain(record.url);

  return (
    <div className="history-item fade-in">
      <div className="history-item-content" onClick={() => onView(record)}>
        <div className="history-item-header">
          <h3 className="history-item-title">{record.title}</h3>
          <div className="history-item-meta">
            <Clock size={12} />
            <span>{formatTime(record.timestamp)}</span>
          </div>
        </div>
        
        <div className="history-item-domain">
          <Globe size={12} />
          <span>{domain}</span>
        </div>

        <div className="history-item-stats">
          <div className="stat-item">
            <MessageSquare size={14} />
            <span>{record.analysis.idioms.length}</span>
            <span className="stat-label">{t('idiomsCount')}</span>
          </div>
          <div className="stat-item">
            <BookOpen size={14} />
            <span>{record.analysis.syntax.length}</span>
            <span className="stat-label">{t('syntaxCount')}</span>
          </div>
          <div className="stat-item">
            <Lightbulb size={14} />
            <span>{record.analysis.vocabulary.length}</span>
            <span className="stat-label">{t('vocabularyCount')}</span>
          </div>
        </div>
      </div>

      <div className="history-item-actions">
        <button
          className="icon-btn-small"
          onClick={(e) => {
            e.stopPropagation();
            window.open(record.url, '_blank');
          }}
          title={t('openPage')}
        >
          <ExternalLink size={16} />
        </button>
        <button
          className="icon-btn-small icon-btn-danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(record.id);
          }}
          title={t('deleteRecord')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
