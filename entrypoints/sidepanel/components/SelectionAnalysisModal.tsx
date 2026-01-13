import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import type { VocabularyItem, IdiomItem, SyntaxItem } from '@/lib/types';
import type { AnalyzeSelectionResponse } from '@/lib/messages';
import { formatErrorMessage, useI18n } from '../i18n';

interface SelectionAnalysisModalProps {
  selection: string;
  targetCategory: 'vocabulary' | 'idioms' | 'syntax';
  onAnalyze: (text: string, category: 'vocabulary' | 'idioms' | 'syntax', requestId?: string) => Promise<AnalyzeSelectionResponse>;
  onAdd: (item: VocabularyItem | IdiomItem | SyntaxItem) => void;
  onClose: () => void;
  onAnalysisComplete?: (result: {
    selection: string;
    targetCategory: 'vocabulary' | 'idioms' | 'syntax';
    success: boolean;
    data?: AnalyzeSelectionResponse['data'];
    error?: string;
  }) => void;
}

export function SelectionAnalysisModal({
  selection,
  targetCategory,
  onAnalyze,
  onAdd,
  onClose,
  onAnalysisComplete,
}: SelectionAnalysisModalProps) {
  const { t } = useI18n();
  const [analyzing, setAnalyzing] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeSelectionResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const isMounted = useRef(false);
  const currentRequestIdRef = useRef<string | null>(null);
  const analyzingRef = useRef(false);
  const userCancelledRef = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const requestId = generateRequestId();
    setRequestId(requestId);
    currentRequestIdRef.current = requestId;

    userCancelledRef.current = false;
    analyzingRef.current = true;
    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    (async () => {
      const response = await onAnalyze(selection, targetCategory, requestId);

      if (!isMounted.current) {
        if (onAnalysisComplete && response.errorCode !== 'ANALYSIS_CANCELLED') {
          onAnalysisComplete({
            selection,
            targetCategory,
            success: response.success,
            data: response.data,
            error: response.success
              ? undefined
              : formatErrorMessage(t, response.errorCode, response.errorDetail, response.error),
          });
        }
        return;
      }

      if (currentRequestIdRef.current !== requestId) return;

      if (response.success && response.data) {
        setAnalysisResult(response.data);
      } else if (response.errorCode !== 'ANALYSIS_CANCELLED') {
        setError(formatErrorMessage(t, response.errorCode, response.errorDetail, response.error));
      }

      analyzingRef.current = false;
      setAnalyzing(false);
      setRequestId(null);
      currentRequestIdRef.current = null;
    })().catch((err) => {
      if (!isMounted.current) return;
      if (currentRequestIdRef.current !== requestId) return;
      setError(formatErrorMessage(t, 'UNKNOWN_ERROR', err instanceof Error ? err.message : String(err)));
      analyzingRef.current = false;
      setAnalyzing(false);
      setRequestId(null);
      currentRequestIdRef.current = null;
    });
  }, [selection, targetCategory, onAnalyze, t, onAnalysisComplete]);

  const generateRequestId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const handleClose = useCallback(() => {
    if (analyzingRef.current && onAnalysisComplete && !userCancelledRef.current) {
      onAnalysisComplete({
        selection,
        targetCategory,
        success: false,
        error: 'BACKGROUND_ANALYSIS',
      });
    }
    onClose();
  }, [onAnalysisComplete, onClose, selection, targetCategory]);

  const getCategoryLabel = (cat: 'vocabulary' | 'idioms' | 'syntax') => {
    switch (cat) {
      case 'vocabulary': return t('tabVocabulary');
      case 'idioms': return t('tabIdioms');
      case 'syntax': return t('tabSyntax');
    }
  };

  const handleAdd = () => {
    if (!analysisResult) return;

    let item: VocabularyItem | IdiomItem | SyntaxItem;

    switch (targetCategory) {
      case 'vocabulary':
        item = {
          word: analysisResult.result.word || selection,
          level: (analysisResult.result.level as 'B1' | 'B2' | 'C1' | 'C2') || 'C1',
          definition: analysisResult.result.definition || '',
          context: analysisResult.result.context || selection,
          isCustom: true,
        };
        break;
      case 'idioms':
        item = {
          expression: analysisResult.result.expression || selection,
          meaning: analysisResult.result.meaning || '',
          example: analysisResult.result.example || selection,
          isCustom: true,
        };
        break;
      case 'syntax':
        item = {
          sentence: analysisResult.result.sentence || selection,
          structure: analysisResult.result.structure || '',
          explanation: analysisResult.result.explanation || '',
          isCustom: true,
        };
        break;
    }

    onAdd(item);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
          <h3>{t('analysisResult')}</h3>
          <button
            onClick={handleClose}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {analyzing ? (
          <div className="loading">
            <Loader2 size={32} className="spinning" style={{ color: 'var(--accent-primary)' }} />
            <span className="loading-text">{t('analyzingSelection')}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>{t('loadingMayTake')}</span>
            <button
              className="btn-cancel"
              onClick={() => {
                userCancelledRef.current = true;
                if (requestId) {
                  browser.runtime.sendMessage({
                    type: 'CANCEL_ANALYSIS',
                    requestId,
                  }).catch(() => {});
                }
                handleClose();
              }}
              style={{
                marginTop: 12,
                padding: '4px 12px',
                fontSize: 12,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 4,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              {t('cancel')}
            </button>
          </div>
         ) : error ? (
           <div className="message error">
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <span>{error}</span>
               <button
                 className="btn-secondary"
                  onClick={() => {
                    setError(null);
                    setAnalyzing(true);
                    analyzingRef.current = true;
                    userCancelledRef.current = false;
                    const requestId = generateRequestId();
                    setRequestId(requestId);
                    currentRequestIdRef.current = requestId;
                    onAnalyze(selection, targetCategory, requestId).then(response => {
                      if (!isMounted.current) return;
                      if (currentRequestIdRef.current !== requestId) return;
                      
                      if (response.success && response.data) {
                        setAnalysisResult(response.data);
                      } else {
                        if (response.errorCode !== 'ANALYSIS_CANCELLED') {
                          setError(formatErrorMessage(t, response.errorCode, response.errorDetail, response.error));
                        }
                      }
                      setAnalyzing(false);
                      setRequestId(null);
                      currentRequestIdRef.current = null;
                      analyzingRef.current = false;
                    }).catch(err => {
                      if (!isMounted.current) return;
                      if (currentRequestIdRef.current !== requestId) return;
                      
                       setError(formatErrorMessage(t, 'UNKNOWN_ERROR', err instanceof Error ? err.message : String(err)));
                       setAnalyzing(false);
                       setRequestId(null);
                       currentRequestIdRef.current = null;
                       analyzingRef.current = false;
                    });
                  }}
                 disabled={analyzing}
                 style={{
                   marginLeft: 12,
                   padding: '4px 12px',
                   fontSize: 12,
                   whiteSpace: 'nowrap',
                 }}
               >
                 Retry
               </button>
             </div>
           </div>
         ) : analysisResult ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                {t('selectedText')}
              </div>
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  fontStyle: 'italic',
                }}
              >
                "{selection.length > 200 ? selection.slice(0, 200) + '...' : selection}"
              </div>
            </div>

            <div
              style={{
                padding: 16,
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 20,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {targetCategory === 'vocabulary' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {analysisResult.result.word || selection}
                    </span>
                    {analysisResult.result.level && (
                      <span className={`card-level ${analysisResult.result.level.toLowerCase()}`}>
                        {analysisResult.result.level}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {analysisResult.result.definition}
                  </div>
                  {analysisResult.result.context && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{analysisResult.result.context}"
                    </div>
                  )}
                </>
              )}

              {targetCategory === 'idioms' && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 8 }}>
                    {analysisResult.result.expression || selection}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {analysisResult.result.meaning}
                  </div>
                  {analysisResult.result.example && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{analysisResult.result.example}"
                    </div>
                  )}
                </>
              )}

              {targetCategory === 'syntax' && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-primary)', marginBottom: 8 }}>
                    {analysisResult.result.structure || t('tabSyntax')}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {analysisResult.result.explanation}
                  </div>
                  {analysisResult.result.sentence && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{analysisResult.result.sentence}"
                    </div>
                  )}
                </>
              )}

              <div style={{
                marginTop: 12,
                fontSize: 11,
                color: 'var(--accent-info)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: 'rgba(130, 80, 223, 0.1)',
                borderRadius: 4,
              }}>
                ✨ {t('customAdd')}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>
                {t('cancel')}
              </button>
              <button className="btn-primary" onClick={handleAdd}>
                {t('addTo', getCategoryLabel(targetCategory))}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
