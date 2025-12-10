import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings, Sparkles, FileText, BookOpen, MessageSquare, Lightbulb, Heart, RefreshCw, ChevronDown, ChevronUp, PenLine } from 'lucide-react';
import { SettingsPanel } from './components/Settings';
import { LoginPanel } from './components/LoginPanel';
import { IdiomCard } from './components/IdiomCard';
import { SyntaxCard } from './components/SyntaxCard';
import { VocabularyCard } from './components/VocabularyCard';
import { UsageStatus } from './components/UsageStatus';
import { Favorites } from './components/Favorites';
import { AddEntryForm } from './components/AddEntryForm';
import { useAuthStore } from './store/auth';
import type { AnalysisResult } from '@/lib/storage';
import type { ExtractContentResponse, AnalyzeTextResponse, GetArticleFavoritesResponse, GetCachedAnalysisResponse, ArticleFavoriteInfo, GetManualEntriesResponse, ManualEntriesData } from '@/lib/messages';

type Tab = 'idioms' | 'syntax' | 'vocabulary';
type View = 'main' | 'settings' | 'favorites' | 'adding';

// Storage key for pending custom entry data (must match background.ts)
const PENDING_ENTRY_KEY = 'nuance_pending_entry';

interface PendingEntryData {
  selectedText: string;
  url: string;
  title: string;
  timestamp: number;
}

interface ArticleInfo {
  title: string;
  url: string;
  textContent: string;
}

function App() {
  const [view, setView] = useState<View>('main');
  const [activeTab, setActiveTab] = useState<Tab>('idioms');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleInfo | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  
  // Pending entry data from context menu
  const [pendingEntry, setPendingEntry] = useState<PendingEntryData | null>(null);
  
  // Track the current URL to detect page changes
  const lastCheckedUrlRef = useRef<string | null>(null);
  
  // Favorites map: key = "type:expression", value = { favoriteId, type }
  const [favoritesMap, setFavoritesMap] = useState<Record<string, ArticleFavoriteInfo>>({});
  
  // Manual entries for the current article
  const [manualEntries, setManualEntries] = useState<ManualEntriesData | null>(null);
  const [isManualSectionExpanded, setIsManualSectionExpanded] = useState(true);
  
  // Auth state from Zustand store
  const {
    user,
    isAuthenticated,
    isPro,
    usage,
    isLoading: isAuthLoading,
    fetchAuthState,
    updateUsage,
    clearAuth,
  } = useAuthStore();

  // Check auth state on mount (only once)
  useEffect(() => {
    fetchAuthState();
  }, [fetchAuthState]);

  // Check for pending entry data from context menu
  useEffect(() => {
    const checkPendingEntry = async () => {
      const result = await browser.storage.local.get(PENDING_ENTRY_KEY);
      const entry = result[PENDING_ENTRY_KEY] as PendingEntryData | undefined;
      
      if (entry && entry.timestamp) {
        // Only show if entry is recent (within last 30 seconds)
        const isRecent = Date.now() - entry.timestamp < 30000;
        if (isRecent) {
          setPendingEntry(entry);
          setView('adding');
          // Clear the pending entry from storage
          await browser.storage.local.remove(PENDING_ENTRY_KEY);
        }
      }
    };

    checkPendingEntry();

    // Listen for storage changes (in case panel is already open)
    const handleStorageChange = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => {
      if (changes[PENDING_ENTRY_KEY]?.newValue) {
        const entry = changes[PENDING_ENTRY_KEY].newValue as PendingEntryData;
        setPendingEntry(entry);
        setView('adding');
        // Clear from storage
        browser.storage.local.remove(PENDING_ENTRY_KEY);
      }
    };

    browser.storage.local.onChanged.addListener(handleStorageChange);
    return () => {
      browser.storage.local.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Handle login success
  const handleLoginSuccess = useCallback(() => {
    fetchAuthState();
  }, [fetchAuthState]);

  // Fetch favorites for an article (batch operation)
  const fetchArticleFavorites = useCallback(async (articleUrl: string) => {
    const response: GetArticleFavoritesResponse = await browser.runtime.sendMessage({
      type: 'GET_ARTICLE_FAVORITES',
      articleUrl,
    });
    if (response.success && response.favorites) {
      setFavoritesMap(response.favorites);
    }
  }, []);

  // Fetch manual entries for an article
  const fetchManualEntries = useCallback(async (articleUrl: string) => {
    const response: GetManualEntriesResponse = await browser.runtime.sendMessage({
      type: 'GET_MANUAL_ENTRIES',
      articleUrl,
    });
    if (response.success && response.data) {
      setManualEntries(response.data);
    }
  }, []);

  // Check for cached analysis when authenticated
  const checkCachedAnalysis = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsCheckingCache(true);
    setError(null);
    
    try {
      // First extract content to get the current URL
      const extractResponse: ExtractContentResponse = await browser.runtime.sendMessage({
        type: 'EXTRACT_CONTENT',
      });
      
      if (!extractResponse.success || !extractResponse.data) {
        setIsCheckingCache(false);
        return;
      }
      
      const { url, title, textContent } = extractResponse.data;
      
      // Skip if we already checked this URL
      if (lastCheckedUrlRef.current === url) {
        setIsCheckingCache(false);
        return;
      }
      
      lastCheckedUrlRef.current = url;
      
      // Set article info
      setArticle({ title, url, textContent });
      
      // Check for cached analysis
      const cacheResponse: GetCachedAnalysisResponse = await browser.runtime.sendMessage({
        type: 'GET_CACHED_ANALYSIS',
        url,
      });
      
      if (cacheResponse.success && cacheResponse.hasCached && cacheResponse.data) {
        setAnalysis(cacheResponse.data);
        setIsCachedResult(true);
        setAnalyzedAt(cacheResponse.analyzedAt || null);
        
        // Fetch favorites for this article
        await fetchArticleFavorites(url);
      }
      
      // Always fetch manual entries for this article
      await fetchManualEntries(url);
    } catch (err) {
      // Silently ignore errors when checking cache
      console.error('Failed to check cached analysis:', err);
    } finally {
      setIsCheckingCache(false);
    }
  }, [isAuthenticated, fetchArticleFavorites, fetchManualEntries]);

  // Check for cached analysis when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated && !isAuthLoading) {
      checkCachedAnalysis();
    }
  }, [isAuthenticated, isAuthLoading, checkCachedAnalysis]);

  // Handle favorite added
  const handleFavoriteAdded = useCallback((key: string, favoriteId: string, type: 'idiom' | 'syntax' | 'vocabulary') => {
    setFavoritesMap(prev => ({
      ...prev,
      [key]: { favoriteId, type },
    }));
  }, []);

  // Handle favorite removed
  const handleFavoriteRemoved = useCallback((key: string) => {
    setFavoritesMap(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
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
    setIsCachedResult(false);
    setAnalyzedAt(null);
    
    try {
      // First extract content
      const extractedData = await extractContent();
      if (!extractedData) {
        setIsLoading(false);
        return;
      }
      
      // Then analyze (pass url and title for caching)
      const response: AnalyzeTextResponse = await browser.runtime.sendMessage({
        type: 'ANALYZE_TEXT',
        text: extractedData.textContent,
        url: extractedData.url,
        title: extractedData.title,
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Analysis failed');
      }
      
      setAnalysis(response.data);
      
      // Update usage info in Zustand store
      if (response.usage) {
        updateUsage(response.usage);
      }

      // Batch fetch favorites for this article
      await fetchArticleFavorites(extractedData.url);
      
      // Also fetch manual entries
      await fetchManualEntries(extractedData.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [extractContent, updateUsage, fetchArticleFavorites, fetchManualEntries]);

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

  // Render loading state for auth check
  if (isAuthLoading) {
    return (
      <div className="app">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  // Render login panel if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="app">
        <LoginPanel onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Render settings view
  if (view === 'settings') {
    return (
      <div className="app">
        <SettingsPanel 
          user={user ? { ...user, isPro } : null} 
          onBack={() => setView('main')} 
          onLogout={() => {
            clearAuth();
          }}
        />
      </div>
    );
  }

  // Render favorites view
  if (view === 'favorites') {
    return (
      <div className="app">
        <Favorites onBack={() => {
          setView('main');
          // Refresh favorites for current article to sync any deletions
          if (article?.url) {
            fetchArticleFavorites(article.url);
          }
        }} />
      </div>
    );
  }

  // Render add entry view
  if (view === 'adding' && pendingEntry) {
    return (
      <div className="app">
        <AddEntryForm
          pendingEntry={pendingEntry}
          onBack={() => {
            setPendingEntry(null);
            setView('main');
          }}
          onSaved={() => {
            setPendingEntry(null);
            setView('main');
            // Refresh favorites and manual entries if we're on the same article
            if (article?.url === pendingEntry.url) {
              fetchArticleFavorites(article.url);
              fetchManualEntries(article.url);
            }
          }}
        />
      </div>
    );
  }

  // Render main view
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <Sparkles size={20} />
          <h1>Nuance</h1>
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={() => setView('favorites')}
            title="收藏夹"
          >
            <Heart size={18} />
          </button>
          <button 
            className="icon-btn" 
            onClick={() => setView('settings')}
            title="设置"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="content">
        {/* Usage Status */}
        <UsageStatus usage={usage} />

        {/* Action Section */}
        <div className="action-section">
          {article ? (
            <div className="article-info">
              <span className="article-title">{article.title}</span>
              <span className="article-meta">
                {article.textContent.length.toLocaleString()} 字符已提取
                {isCachedResult && analyzedAt && (
                  <> · 分析于 {new Date(analyzedAt).toLocaleDateString('zh-CN')}</>
                )}
              </span>
            </div>
          ) : (
            <div className="article-info">
              <span className="article-title">{isCheckingCache ? '正在检查...' : '未加载文章'}</span>
              <span className="article-meta">
                {isCheckingCache ? '正在检查是否有已分析的结果' : '点击分析按钮提取并分析当前页面'}
              </span>
            </div>
          )}
          
          <button 
            className="btn-primary"
            onClick={analyzeContent}
            disabled={isLoading || isCheckingCache || Boolean(usage && !usage.isPro && usage.limit !== null && usage.used >= usage.limit)}
          >
            {isLoading ? (
              <>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                <span>分析中...</span>
              </>
            ) : isCachedResult ? (
              <>
                <RefreshCw size={16} />
                <span>重新分析</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>分析页面</span>
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="message error fade-in">
            {error}
          </div>
        )}

        {/* Tabs */}
        {analysis && (
          <>
            <div className="tabs">
              <button 
                className={`tab ${activeTab === 'idioms' ? 'active' : ''}`}
                onClick={() => setActiveTab('idioms')}
              >
                <MessageSquare size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                习惯用法
                <span className="tab-badge">{analysis.idioms.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'syntax' ? 'active' : ''}`}
                onClick={() => setActiveTab('syntax')}
              >
                <BookOpen size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                语法
                <span className="tab-badge">{analysis.syntax.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'vocabulary' ? 'active' : ''}`}
                onClick={() => setActiveTab('vocabulary')}
              >
                <Lightbulb size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                词汇
                <span className="tab-badge">{analysis.vocabulary.length}</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="card-list mt-4 fade-in">
              {activeTab === 'idioms' && analysis.idioms.map((item, index) => {
                const key = `idiom:${item.expression}`;
                const favoriteInfo = favoritesMap[key];
                return (
                  <IdiomCard
                    key={index}
                    item={item}
                    isHighlighted={highlightedItem === `idiom-${index}`}
                    onHighlight={() => handleHighlight(item.example, `idiom-${index}`)}
                    articleUrl={article?.url}
                    articleTitle={article?.title}
                    isFavorited={Boolean(favoriteInfo)}
                    favoriteId={favoriteInfo?.favoriteId}
                    onFavoriteAdded={(favoriteId) => handleFavoriteAdded(key, favoriteId, 'idiom')}
                    onFavoriteRemoved={() => handleFavoriteRemoved(key)}
                  />
                );
              })}
              
              {activeTab === 'syntax' && analysis.syntax.map((item, index) => {
                const key = `syntax:${item.sentence}`;
                const favoriteInfo = favoritesMap[key];
                return (
                  <SyntaxCard
                    key={index}
                    item={item}
                    isHighlighted={highlightedItem === `syntax-${index}`}
                    onHighlight={() => handleHighlight(item.sentence, `syntax-${index}`)}
                    articleUrl={article?.url}
                    articleTitle={article?.title}
                    isFavorited={Boolean(favoriteInfo)}
                    favoriteId={favoriteInfo?.favoriteId}
                    onFavoriteAdded={(favoriteId) => handleFavoriteAdded(key, favoriteId, 'syntax')}
                    onFavoriteRemoved={() => handleFavoriteRemoved(key)}
                  />
                );
              })}
              
              {activeTab === 'vocabulary' && analysis.vocabulary.map((item, index) => {
                const key = `vocabulary:${item.word}`;
                const favoriteInfo = favoritesMap[key];
                return (
                  <VocabularyCard
                    key={index}
                    item={item}
                    isHighlighted={highlightedItem === `vocab-${index}`}
                    onHighlight={() => handleHighlight(item.context, `vocab-${index}`)}
                    articleUrl={article?.url}
                    articleTitle={article?.title}
                    isFavorited={Boolean(favoriteInfo)}
                    favoriteId={favoriteInfo?.favoriteId}
                    onFavoriteAdded={(favoriteId) => handleFavoriteAdded(key, favoriteId, 'vocabulary')}
                    onFavoriteRemoved={() => handleFavoriteRemoved(key)}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* Manual Entries Section */}
        {manualEntries && (manualEntries.idioms.length > 0 || manualEntries.syntax.length > 0 || manualEntries.vocabulary.length > 0) && (
          <div className="manual-entries-section fade-in">
            <button 
              className="manual-entries-header"
              onClick={() => setIsManualSectionExpanded(!isManualSectionExpanded)}
            >
              <div className="manual-entries-title">
                <PenLine size={16} />
                <span>手动添加</span>
                <span className="manual-entries-count">
                  {manualEntries.idioms.length + manualEntries.syntax.length + manualEntries.vocabulary.length}
                </span>
              </div>
              {isManualSectionExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            
            {isManualSectionExpanded && (
              <div className="manual-entries-content">
                {manualEntries.idioms.length > 0 && (
                  <div className="manual-type-group">
                    <div className="manual-type-label">
                      <MessageSquare size={14} />
                      <span>习惯用法</span>
                    </div>
                    <div className="card-list">
                      {manualEntries.idioms.map((item, index) => {
                        const key = `idiom:${item.expression}`;
                        const favoriteInfo = favoritesMap[key];
                        return (
                          <IdiomCard
                            key={`manual-idiom-${index}`}
                            item={item}
                            isHighlighted={highlightedItem === `manual-idiom-${index}`}
                            onHighlight={() => handleHighlight(item.example, `manual-idiom-${index}`)}
                            articleUrl={article?.url}
                            articleTitle={article?.title}
                            isFavorited={Boolean(favoriteInfo)}
                            favoriteId={favoriteInfo?.favoriteId}
                            onFavoriteAdded={(favoriteId) => handleFavoriteAdded(key, favoriteId, 'idiom')}
                            onFavoriteRemoved={() => handleFavoriteRemoved(key)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {manualEntries.syntax.length > 0 && (
                  <div className="manual-type-group">
                    <div className="manual-type-label">
                      <BookOpen size={14} />
                      <span>语法</span>
                    </div>
                    <div className="card-list">
                      {manualEntries.syntax.map((item, index) => {
                        const key = `syntax:${item.sentence}`;
                        const favoriteInfo = favoritesMap[key];
                        return (
                          <SyntaxCard
                            key={`manual-syntax-${index}`}
                            item={item}
                            isHighlighted={highlightedItem === `manual-syntax-${index}`}
                            onHighlight={() => handleHighlight(item.sentence, `manual-syntax-${index}`)}
                            articleUrl={article?.url}
                            articleTitle={article?.title}
                            isFavorited={Boolean(favoriteInfo)}
                            favoriteId={favoriteInfo?.favoriteId}
                            onFavoriteAdded={(favoriteId) => handleFavoriteAdded(key, favoriteId, 'syntax')}
                            onFavoriteRemoved={() => handleFavoriteRemoved(key)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {manualEntries.vocabulary.length > 0 && (
                  <div className="manual-type-group">
                    <div className="manual-type-label">
                      <Lightbulb size={14} />
                      <span>词汇</span>
                    </div>
                    <div className="card-list">
                      {manualEntries.vocabulary.map((item, index) => {
                        const key = `vocabulary:${item.word}`;
                        const favoriteInfo = favoritesMap[key];
                        return (
                          <VocabularyCard
                            key={`manual-vocab-${index}`}
                            item={item}
                            isHighlighted={highlightedItem === `manual-vocab-${index}`}
                            onHighlight={() => handleHighlight(item.context, `manual-vocab-${index}`)}
                            articleUrl={article?.url}
                            articleTitle={article?.title}
                            isFavorited={Boolean(favoriteInfo)}
                            favoriteId={favoriteInfo?.favoriteId}
                            onFavoriteAdded={(favoriteId) => handleFavoriteAdded(key, favoriteId, 'vocabulary')}
                            onFavoriteRemoved={() => handleFavoriteRemoved(key)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!analysis && !isLoading && !isCheckingCache && !error && (
          <div className="empty-state">
            <FileText className="empty-state-icon" size={64} />
            <h3>准备分析</h3>
            <p>
              浏览至一篇英文文章，点击"分析页面"提取词汇、习惯用法和语法结构。
            </p>
          </div>
        )}

        {/* Checking Cache State */}
        {isCheckingCache && (
          <div className="loading fade-in">
            <div className="spinner" />
            <span className="loading-text">正在检查历史分析结果...</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loading fade-in">
            <div className="spinner" />
            <span className="loading-text">正在使用 DeepSeek AI 分析...</span>
            <span className="loading-text" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              大约需要 10-30 秒
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
