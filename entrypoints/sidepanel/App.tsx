import { useState, useEffect, useCallback } from 'react';
import { Settings, Sparkles, FileText, BookOpen, MessageSquare, Lightbulb, History as HistoryIcon } from 'lucide-react';
import { SettingsPanel } from './components/Settings';
import { HistoryPanel } from './components/HistoryPanel';
import { IdiomCard } from './components/IdiomCard';
import { SyntaxCard } from './components/SyntaxCard';
import { VocabularyCard } from './components/VocabularyCard';
import { hasApiKey, addAnalysisRecord } from '@/lib/storage';
import type { AnalysisResult, IdiomItem, SyntaxItem, VocabularyItem } from '@/lib/storage';
import type { ExtractContentResponse, AnalyzeTextResponse } from '@/lib/messages';
import { useI18n } from './i18n';

type Tab = 'idioms' | 'syntax' | 'vocabulary';
type View = 'main' | 'settings' | 'history';

interface ArticleInfo {
  title: string;
  url: string;
  textContent: string;
}

function App() {
  const { t, lang } = useI18n();
  const [view, setView] = useState<View>('main');
  const [activeTab, setActiveTab] = useState<Tab>('idioms');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleInfo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Check API key on mount
  useEffect(() => {
    hasApiKey().then(setHasKey);
  }, []);

  // Extract content from current page
  const extractContent = useCallback(async () => {
    setError(null);
    
    try {
      const response: ExtractContentResponse = await browser.runtime.sendMessage({
        type: 'EXTRACT_CONTENT',
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to extract content');
      }
      
      setArticle({
        title: response.data.title,
        url: response.data.url,
        textContent: response.data.textContent,
      });
      
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return null;
    }
  }, []);

  // Analyze extracted content
  const analyzeContent = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      // First extract content
      const articleData = await extractContent();
      if (!articleData) {
        setIsLoading(false);
        return;
      }
      
      // Then analyze
      const response: AnalyzeTextResponse = await browser.runtime.sendMessage({
        type: 'ANALYZE_TEXT',
        text: articleData.textContent,
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Analysis failed');
      }
      
      setAnalysis(response.data);
      
      if (response.data) {
        try {
          await addAnalysisRecord({
            title: articleData.title,
            url: articleData.url,
            analysis: response.data,
          });
        } catch (error) {
          console.error('Failed to save analysis record:', error);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [extractContent]);

  // Highlight text in the page
  const handleHighlight = useCallback(async (text: string, itemId: string) => {
    // Clear previous highlight
    await browser.runtime.sendMessage({ type: 'CLEAR_HIGHLIGHTS' });
    
    if (highlightedItem === itemId) {
      setHighlightedItem(null);
      return;
    }
    
    const response = await browser.runtime.sendMessage({
      type: 'HIGHLIGHT_TEXT',
      text,
    });
    
    if (response.found) {
      setHighlightedItem(itemId);
    }
  }, [highlightedItem]);

  // Handle settings saved
  const handleSettingsSaved = useCallback(() => {
    setHasKey(true);
    setView('main');
  }, []);

  // Render history view
  if (view === 'history') {
    return (
      <div className="app">
        <HistoryPanel onBack={() => setView('main')} />
      </div>
    );
  }

  // Render settings view
  if (view === 'settings') {
    return (
      <div className="app">
        <SettingsPanel onBack={() => setView('main')} onSaved={handleSettingsSaved} />
      </div>
    );
  }

  // Render loading state check for API key
  if (hasKey === null) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // Render main view
  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <Sparkles size={20} />
          <h1>{t('appTitle')}</h1>
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={() => setView('history')}
            title={t('history')}
          >
            <HistoryIcon size={18} />
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setView('settings')}
            title={t('settings')}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="content">
        {!hasKey && (
          <div className="message error">
            <span>{t('apiKeyWarning')}</span>
          </div>
        )}

        <div className="action-section">
          {article ? (
            <div className="article-info">
              <span className="article-title">{article.title}</span>
              <span className="article-meta">
                {lang === 'zh'
                  ? `已提取 ${article.textContent.length.toLocaleString()} ${t('charactersExtracted')}`
                  : `${article.textContent.length.toLocaleString()} ${t('charactersExtracted')}`}
              </span>
            </div>
          ) : (
            <div className="article-info">
              <span className="article-title">{t('noArticle')}</span>
              <span className="article-meta">{t('noArticleHint')}</span>
            </div>
          )}
          
          <button 
            className="btn-primary"
            onClick={analyzeContent}
            disabled={isLoading || !hasKey}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span>{t('analyzing')}</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>{t('analyzePage')}</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="message error fade-in">
            {error}
          </div>
        )}

        {analysis && (
          <>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'idioms' ? 'active' : ''}`}
                onClick={() => setActiveTab('idioms')}
              >
                <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('tabIdioms')}
                <span className="tab-badge">{analysis.idioms.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'syntax' ? 'active' : ''}`}
                onClick={() => setActiveTab('syntax')}
              >
                <BookOpen size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('tabSyntax')}
                <span className="tab-badge">{analysis.syntax.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'vocabulary' ? 'active' : ''}`}
                onClick={() => setActiveTab('vocabulary')}
              >
                <Lightbulb size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                {t('tabVocabulary')}
                <span className="tab-badge">{analysis.vocabulary.length}</span>
              </button>
            </div>

            <div className="card-list mt-4 fade-in">
              {activeTab === 'idioms' && analysis.idioms.map((item, index) => (
                <IdiomCard
                  key={index}
                  item={item}
                  isHighlighted={highlightedItem === `idiom-${index}`}
                  onHighlight={() => handleHighlight(item.example, `idiom-${index}`)}
                />
              ))}
              
              {activeTab === 'syntax' && analysis.syntax.map((item, index) => (
                <SyntaxCard
                  key={index}
                  item={item}
                  isHighlighted={highlightedItem === `syntax-${index}`}
                  onHighlight={() => handleHighlight(item.sentence, `syntax-${index}`)}
                />
              ))}
              
              {activeTab === 'vocabulary' && analysis.vocabulary.map((item, index) => (
                <VocabularyCard
                  key={index}
                  item={item}
                  isHighlighted={highlightedItem === `vocab-${index}`}
                  onHighlight={() => handleHighlight(item.context, `vocab-${index}`)}
                />
              ))}
            </div>
          </>
        )}

        {!analysis && !isLoading && !error && (
          <div className="empty-state">
            <FileText className="empty-state-icon" size={64} />
            <h3>{t('ready')}</h3>
            <p>{t('readyHint')}</p>
          </div>
        )}

        {isLoading && (
          <div className="loading fade-in">
            <div className="spinner" />
            <span className="loading-text">{t('loadingAnalyzing')}</span>
            <span className="loading-text" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('loadingMayTake')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

