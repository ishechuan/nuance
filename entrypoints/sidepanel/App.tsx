import { useState, useEffect, useCallback } from 'react';
import { Settings, Sparkles, FileText, BookOpen, MessageSquare, Lightbulb } from 'lucide-react';
import { SettingsPanel } from './components/Settings';
import { IdiomCard } from './components/IdiomCard';
import { SyntaxCard } from './components/SyntaxCard';
import { VocabularyCard } from './components/VocabularyCard';
import { hasApiKey } from '@/lib/storage';
import type { AnalysisResult, IdiomItem, SyntaxItem, VocabularyItem } from '@/lib/storage';
import type { ExtractContentResponse, AnalyzeTextResponse } from '@/lib/messages';

type Tab = 'idioms' | 'syntax' | 'vocabulary';
type View = 'main' | 'settings';

interface ArticleInfo {
  title: string;
  url: string;
  textContent: string;
}

function App() {
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
      
      return response.data.textContent;
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
      const text = await extractContent();
      if (!text) {
        setIsLoading(false);
        return;
      }
      
      // Then analyze
      const response: AnalyzeTextResponse = await browser.runtime.sendMessage({
        type: 'ANALYZE_TEXT',
        text,
      });
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Analysis failed');
      }
      
      setAnalysis(response.data);
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
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <Sparkles size={20} />
          <h1>Nuance</h1>
        </div>
        <div className="header-actions">
          <button 
            className="icon-btn" 
            onClick={() => setView('settings')}
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="content">
        {/* API Key Warning */}
        {!hasKey && (
          <div className="message error">
            <span>Please configure your DeepSeek API key in settings first.</span>
          </div>
        )}

        {/* Action Section */}
        <div className="action-section">
          {article ? (
            <div className="article-info">
              <span className="article-title">{article.title}</span>
              <span className="article-meta">
                {article.textContent.length.toLocaleString()} characters extracted
              </span>
            </div>
          ) : (
            <div className="article-info">
              <span className="article-title">No article loaded</span>
              <span className="article-meta">Click analyze to extract and analyze the current page</span>
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
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Analyze Page</span>
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
                Idioms
                <span className="tab-badge">{analysis.idioms.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'syntax' ? 'active' : ''}`}
                onClick={() => setActiveTab('syntax')}
              >
                <BookOpen size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Syntax
                <span className="tab-badge">{analysis.syntax.length}</span>
              </button>
              <button 
                className={`tab ${activeTab === 'vocabulary' ? 'active' : ''}`}
                onClick={() => setActiveTab('vocabulary')}
              >
                <Lightbulb size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Vocabulary
                <span className="tab-badge">{analysis.vocabulary.length}</span>
              </button>
            </div>

            {/* Tab Content */}
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

        {/* Empty State */}
        {!analysis && !isLoading && !error && (
          <div className="empty-state">
            <FileText className="empty-state-icon" size={64} />
            <h3>Ready to Analyze</h3>
            <p>
              Navigate to an English article and click "Analyze Page" to extract vocabulary, idioms, and syntax patterns.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="loading fade-in">
            <div className="spinner" />
            <span className="loading-text">Analyzing with DeepSeek AI...</span>
            <span className="loading-text" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              This may take 10-30 seconds
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

