import { useState } from 'react';
import { ArrowLeft, ExternalLink, Calendar, Globe, MessageSquare, BookOpen, Lightbulb } from 'lucide-react';
import { useI18n } from '../i18n';
import { IdiomCard } from './IdiomCard';
import { SyntaxCard } from './SyntaxCard';
import { VocabularyCard } from './VocabularyCard';
import type { AnalysisRecord } from '@/lib/types';

interface HistoryDetailViewProps {
  record: AnalysisRecord;
  onBack: () => void;
}

type Tab = 'idioms' | 'syntax' | 'vocabulary';

export function HistoryDetailView({ record, onBack }: HistoryDetailViewProps) {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('idioms');

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
    <div className="history-detail-view">
      <header className="header">
        <div className="header-title">
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>{t('viewingRecord')}</h1>
        </div>
      </header>

      <div className="content">
        <div className="history-detail-info fade-in">
          <div className="history-detail-title">{record.title}</div>
          
          <div className="history-detail-meta">
            <div className="meta-item">
              <Calendar size={14} />
              <span>{formatDate(record.timestamp)}</span>
            </div>
            <div className="meta-item">
              <Globe size={14} />
              <span>{domain}</span>
            </div>
          </div>

          <div className="history-detail-stats">
            <div className="stat-badge">
              <MessageSquare size={14} />
              <span>{record.analysis.idioms.length}</span>
              <span className="stat-label">{t('idiomsCount')}</span>
            </div>
            <div className="stat-badge">
              <BookOpen size={14} />
              <span>{record.analysis.syntax.length}</span>
              <span className="stat-label">{t('syntaxCount')}</span>
            </div>
            <div className="stat-badge">
              <Lightbulb size={14} />
              <span>{record.analysis.vocabulary.length}</span>
              <span className="stat-label">{t('vocabularyCount')}</span>
            </div>
          </div>

          <a
            href={record.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}
          >
            <ExternalLink size={16} />
            {t('openPage')}
          </a>
        </div>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'idioms' ? 'active' : ''}`}
            onClick={() => setActiveTab('idioms')}
          >
            <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('tabIdioms')}
            <span className="tab-badge">{record.analysis.idioms.length}</span>
          </button>
          <button
            className={`tab ${activeTab === 'syntax' ? 'active' : ''}`}
            onClick={() => setActiveTab('syntax')}
          >
            <BookOpen size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('tabSyntax')}
            <span className="tab-badge">{record.analysis.syntax.length}</span>
          </button>
          <button
            className={`tab ${activeTab === 'vocabulary' ? 'active' : ''}`}
            onClick={() => setActiveTab('vocabulary')}
          >
            <Lightbulb size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('tabVocabulary')}
            <span className="tab-badge">{record.analysis.vocabulary.length}</span>
          </button>
        </div>

        <div className="card-list mt-4 fade-in">
          {activeTab === 'idioms' && record.analysis.idioms.map((item, index) => (
            <IdiomCard
              key={index}
              item={item}
              isHighlighted={false}
              onHighlight={() => {}}
            />
          ))}

          {activeTab === 'syntax' && record.analysis.syntax.map((item, index) => (
            <SyntaxCard
              key={index}
              item={item}
              isHighlighted={false}
              onHighlight={() => {}}
            />
          ))}

          {activeTab === 'vocabulary' && record.analysis.vocabulary.map((item, index) => (
            <VocabularyCard
              key={index}
              item={item}
              isHighlighted={false}
              onHighlight={() => {}}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
