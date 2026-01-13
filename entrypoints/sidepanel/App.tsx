import { useState, useEffect, useCallback } from 'react';
import { Settings, Sparkles, FileText, BookOpen, MessageSquare, Lightbulb, History as HistoryIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { SettingsPanel } from './components/Settings';
import { HistoryPanel } from './components/HistoryPanel';
import { IdiomCard } from './components/IdiomCard';
import { SyntaxCard } from './components/SyntaxCard';
import { VocabularyCard } from './components/VocabularyCard';
import { SelectionAnalysisModal } from './components/SelectionAnalysisModal';
import { hasApiKey, addAnalysisRecord, updateAnalysisRecord, getAnalysisHistory, findAnalysisByUrl, isFirstTimeUser, completeFirstTimeSetup } from '@/lib/storage';
import type { AnalysisResult, IdiomItem, SyntaxItem, VocabularyItem } from '@/lib/types';
import type { ExtractContentResponse, AnalyzeTextResponse, AnalyzeSelectionResponse, HighlightTextResponse, ClearHighlightsResponse } from '@/lib/messages';
import { formatErrorMessage, useI18n } from './i18n';
import { syncAfterAnalysis, getSyncStatusInfo } from '@/lib/github-sync';
import { getConflictQueue } from '@/lib/storage';

type Tab = 'idioms' | 'syntax' | 'vocabulary';
type View = 'main' | 'settings' | 'history';

interface ArticleInfo {
  title: string;
  url: string;
  textContent: string;
}

interface SelectionAnalysisState {
  open: boolean;
  selection: string;
  targetCategory: 'vocabulary' | 'idioms' | 'syntax';
  tabId: number | null;
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
  const [isFirstTime, setIsFirstTime] = useState<boolean | null>(null);
  const [highlightMessage, setHighlightMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ status: string; message: string; conflictsCount: number }>({
    status: 'idle',
    message: '',
    conflictsCount: 0,
  });
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [selectionAnalysis, setSelectionAnalysis] = useState<SelectionAnalysisState>({
    open: false,
    selection: '',
    targetCategory: 'vocabulary',
    tabId: null,
  });

  const loadSyncStatus = async () => {
    const conflicts = await getConflictQueue();
    const status = await getSyncStatusInfo();
    setSyncStatus({
      status: status.status,
      message: status.message,
      conflictsCount: conflicts.length,
    });
  };

  // Check current tab and load history if available
  const checkCurrentTab = async (overrideUrl?: string) => {
    try {
      let url: string | undefined;
      
      if (overrideUrl) {
        url = overrideUrl;
      } else {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        url = tabs[0]?.url;
      }
      
      if (!url) return;
      
      const record = await findAnalysisByUrl(url);
      if (record) {
        setArticle({
          title: record.title,
          url: record.url,
          textContent: '',
        });
        setAnalysis(record.analysis);
        setCurrentRecordId(record.id);
      } else {
        setArticle(null);
        setAnalysis(null);
        setCurrentRecordId(null);
      }
    } catch (error) {
      console.error('Failed to check current tab:', error);
    }
  };

  // Listen for tab activation changes
  const handleTabActivated = async () => {
    if (!isLoading) {
      await checkCurrentTab();
    }
  };
  
  // Listen for URL changes in the current tab
  const handleTabUpdated = async (tabId: number, changeInfo: { status?: string }, tab: { url?: string }) => {
    if (changeInfo.status === 'complete' && tab.url && !isLoading) {
      await checkCurrentTab(tab.url);
    }
  };

  // Check API key on mount and setup tab listeners
  useEffect(() => {
    hasApiKey().then(setHasKey);
    isFirstTimeUser().then(setIsFirstTime);
    loadSyncStatus();

    // Auto-load history for current tab
    checkCurrentTab();

    // Update context menus with current language
    browser.runtime.sendMessage({
      type: 'UPDATE_CONTEXT_MENUS',
      language: lang,
    });

    // Add tab event listeners
    browser.tabs.onActivated.addListener(handleTabActivated);
    browser.tabs.onUpdated.addListener(handleTabUpdated);

    // Remove tab event listeners on cleanup
    return () => {
      browser.tabs.onActivated.removeListener(handleTabActivated);
      browser.tabs.onUpdated.removeListener(handleTabUpdated);
    };
  }, [lang, isLoading]);

  // Listen for messages from background script
  useEffect(() => {
    const handleMessage = (message: { type: string; selection?: string; targetCategory?: 'vocabulary' | 'idioms' | 'syntax'; tabId?: number }) => {
      if (message.type === 'SHOW_SELECTION_ANALYSIS' && message.selection && message.targetCategory) {
        setSelectionAnalysis({
          open: true,
          selection: message.selection,
          targetCategory: message.targetCategory,
          tabId: message.tabId || null,
        });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  // Extract content from current page
  const extractContent = useCallback(async () => {
    setError(null);
    
    try {
      const response: ExtractContentResponse = await browser.runtime.sendMessage({
        type: 'EXTRACT_CONTENT',
      });
      
      if (!response.success || !response.data) {
        setError(formatErrorMessage(t, response.errorCode, response.errorDetail, response.error));
        return null;
      }
      
      setArticle({
        title: response.data.title,
        url: response.data.url,
        textContent: response.data.textContent,
      });
      
      return response.data;
    } catch (err) {
      setError(formatErrorMessage(t, 'UNKNOWN_ERROR', err instanceof Error ? err.message : String(err)));
      return null;
    }
  }, [t]);

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
        setError(formatErrorMessage(t, response.errorCode, response.errorDetail, response.error));
        return;
      }
      
      setAnalysis(response.data);
      
      if (response.data) {
        try {
          await addAnalysisRecord({
            title: articleData.title,
            url: articleData.url,
            analysis: response.data,
          });
          
          const history = await getAnalysisHistory();
          const record = history.find(r => r.url === articleData.url && r.title === articleData.title);
          if (record) {
            setCurrentRecordId(record.id);
          }
          
          await syncAfterAnalysis();
          await loadSyncStatus();
          
          // Re-check current tab to ensure data is up to date
          await checkCurrentTab();
        } catch (error) {
          console.error('Failed to save analysis record:', error);
        }
      }
    } catch (err) {
      setError(formatErrorMessage(t, 'UNKNOWN_ERROR', err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [extractContent, t]);

  // Highlight text in the page
  const handleHighlight = useCallback(async (text: string, itemId: string) => {
    const clearResponse: ClearHighlightsResponse = await browser.runtime.sendMessage({ type: 'CLEAR_HIGHLIGHTS' });
    setHighlightMessage(null);
    if (clearResponse && clearResponse.success === false) {
      setHighlightMessage({
        type: 'error',
        text: formatErrorMessage(t, clearResponse.errorCode, clearResponse.errorDetail),
      });
      setTimeout(() => setHighlightMessage(null), 5000);
      return;
    }
    
    if (highlightedItem === itemId) {
      setHighlightedItem(null);
      return;
    }
    
    const response: HighlightTextResponse = await browser.runtime.sendMessage({
      type: 'HIGHLIGHT_TEXT',
      text,
    });
    
    if (response && response.success === false) {
      setHighlightMessage({
        type: 'error',
        text: formatErrorMessage(t, response.errorCode, response.errorDetail),
      });
      setTimeout(() => setHighlightMessage(null), 5000);
      return;
    }

    if (response.found) {
      setHighlightedItem(itemId);
    } else {
      setHighlightMessage({
        type: 'info',
        text: t('highlightNotFound'),
      });
      setTimeout(() => setHighlightMessage(null), 5000);
    }
  }, [highlightedItem, t]);

  // Handle settings saved
  const handleSettingsSaved = useCallback(() => {
    setHasKey(true);
    setView('main');
    completeFirstTimeSetup();
    setIsFirstTime(false);
  }, []);

  // Analyze selected text from right-click menu
  const analyzeSelection = useCallback(async (
    text: string,
    category: 'vocabulary' | 'idioms' | 'syntax'
  ): Promise<AnalyzeSelectionResponse> => {
    return await browser.runtime.sendMessage({
      type: 'ANALYZE_SELECTION',
      text,
      category,
    });
  }, []);

  // Handle adding item from selection analysis
  const handleAddFromSelection = useCallback(async (item: VocabularyItem | IdiomItem | SyntaxItem) => {
    if (!analysis) return;

    let category: 'vocabulary' | 'idioms' | 'syntax';
    if ('word' in item) category = 'vocabulary';
    else if ('expression' in item) category = 'idioms';
    else category = 'syntax';

    const updatedAnalysis: AnalysisResult = {
      idioms: category === 'idioms' ? [...analysis.idioms, item as IdiomItem] : analysis.idioms,
      syntax: category === 'syntax' ? [...analysis.syntax, item as SyntaxItem] : analysis.syntax,
      vocabulary: category === 'vocabulary' ? [...analysis.vocabulary, item as VocabularyItem] : analysis.vocabulary,
    };

    setAnalysis(updatedAnalysis);
    setSelectionAnalysis(prev => ({ ...prev, open: false }));

    try {
      if (currentRecordId) {
        await updateAnalysisRecord(currentRecordId, { analysis: updatedAnalysis });
        await syncAfterAnalysis();
        await loadSyncStatus();
      }
    } catch (error) {
      console.error('Failed to update record:', error);
    }
  }, [analysis, currentRecordId]);

  // Render history view
  if (view === 'history') {
    return (
      <div className="app">
        <HistoryPanel onBack={() => setView('main')} onConflictsChange={loadSyncStatus} />
      </div>
    );
  }

  // Render settings view
  if (view === 'settings') {
    return (
      <div className="app">
        <SettingsPanel onBack={() => setView('main')} onSaved={handleSettingsSaved} onSyncStatusChange={loadSyncStatus} />
      </div>
    );
  }

  // Render loading state check for API key
  if (hasKey === null || isFirstTime === null) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // Render onboarding for first-time users
  if (!hasKey && isFirstTime === true) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-title">
            <Sparkles size={20} />
            <h1>{t('firstTimeSetupTitle')}</h1>
          </div>
        </header>

        <div className="content" style={{ padding: '24px' }}>
          <div className="onboarding-card fade-in">
            <h2 style={{ marginBottom: 16, fontSize: 18 }}>{t('firstTimeSetupDesc')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
              {t('firstTimeSetupWhy')}
            </p>

            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>{t('firstTimeSetupStepsTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3, 4, 5].map((index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      flexShrink: 0,
                    }}>
                      {index}
                    </span>
                    <span style={{ lineHeight: 1.6, paddingTop: 2 }}>
                      {t(`firstTimeSetupStep${index}` as any)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
              <button
                className="btn-primary"
                onClick={() => setView('settings')}
                style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Settings size={16} />
                {t('firstTimeSetupButton')}
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  setIsFirstTime(false);
                }}
              >
                {t('firstTimeSetupSkip')}
              </button>
            </div>

            <p style={{
              marginTop: 24,
              fontSize: 12,
              color: 'var(--text-muted)',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              {t('firstTimeSetupTip')}
            </p>
          </div>
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
          {syncStatus.conflictsCount > 0 && (
            <button
              className="icon-btn sync-conflict"
              onClick={() => setView('history')}
              title={t('resolveConflicts')}
            >
              <AlertCircle size={18} />
              <span className="sync-badge">{syncStatus.conflictsCount}</span>
            </button>
          )}
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
                {t('extractedCount', article.textContent.length.toLocaleString())}
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

        {highlightMessage && (
          <div className={`message ${highlightMessage.type} fade-in`}>
            {highlightMessage.type === 'error' && <AlertCircle size={16} />}
            {highlightMessage.text}
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

        {selectionAnalysis.open && (
          <SelectionAnalysisModal
            selection={selectionAnalysis.selection}
            targetCategory={selectionAnalysis.targetCategory}
            onAnalyze={analyzeSelection}
            onAdd={handleAddFromSelection}
            onClose={() => setSelectionAnalysis(prev => ({ ...prev, open: false }))}
          />
        )}
      </div>
    </div>
  );
}

export default App;
