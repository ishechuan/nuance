import { useState, useEffect } from 'react';
import { ArrowLeft, Key, CheckCircle, AlertCircle, RefreshCw, Github, Link, Copy, Check, Upload, Download } from 'lucide-react';
import { getApiKey, setApiKey, getSettings, setSettings, getSyncSettings, setSyncSettings } from '@/lib/storage';
import { formatSyncErrorMessage, useI18n } from '../i18n';
import {
  validateToken,
  syncToGist,
  syncFromGist,
  syncBidirectional,
  syncWithLookupOrCreate,
  getSyncStatusInfo,
} from '@/lib/github-sync';

interface SettingsPanelProps {
  onBack: () => void;
  onSaved: () => void;
  onSyncStatusChange?: () => void;
}

export function SettingsPanel({ onBack, onSaved, onSyncStatusChange }: SettingsPanelProps) {
  const { t, lang, setLang } = useI18n();
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [levels, setLevels] = useState<{ B1: boolean; B2: boolean; C1: boolean; C2: boolean }>({ B1: true, B2: true, C1: true, C2: true });
  const [maxIdioms, setMaxIdioms] = useState<number>(10);
  const [maxSyntax, setMaxSyntax] = useState<number>(10);
  const [maxVocabulary, setMaxVocabulary] = useState<number>(10);
  const [prefMessage, setPrefMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [githubToken, setGithubToken] = useState('');
  const [gistId, setGistId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ status: string; message: string; conflictsCount: number; lastSyncText: string }>({
    status: 'idle',
    message: '',
    conflictsCount: 0,
    lastSyncText: '',
  });
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [copiedGistUrl, setCopiedGistUrl] = useState(false);

  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        setApiKeyValue(key.slice(0, 8) + '...' + key.slice(-4));
      }
    });
    getSettings().then((s) => {
      const lv = { B1: false, B2: false, C1: false, C2: false };
      s.vocabLevels.forEach((x) => {
        if (x in lv) (lv as any)[x] = true;
      });
      setLevels(lv);
      setMaxIdioms(s.maxIdioms);
      setMaxSyntax(s.maxSyntax);
      setMaxVocabulary(s.maxVocabulary);
    });
    getSyncSettings().then((syncSettings) => {
      setGithubToken(syncSettings.githubToken);
      setGistId(syncSettings.gistId);
      setAutoSync(syncSettings.autoSync);
    });
    loadSyncStatus();
  }, []);

  const handleSave = async () => {
    if (apiKeyValue.includes('...')) {
      setMessage({ type: 'error', text: t('msgEnterNewKey') });
      return;
    }

    if (!apiKeyValue.trim()) {
      setMessage({ type: 'error', text: t('msgApiKeyEmpty') });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await setApiKey(apiKeyValue.trim());
      setMessage({ type: 'success', text: t('msgApiKeySaved') });

      setTimeout(() => {
        onSaved();
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: t('msgApiKeySaveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (apiKeyValue.includes('...') && value !== apiKeyValue) {
      setApiKeyValue(value.replace(apiKeyValue, ''));
    } else {
      setApiKeyValue(value);
    }
    setMessage(null);
  };

  const toggleLevel = (level: 'B1' | 'B2' | 'C1' | 'C2') => {
    setLevels((prev) => ({ ...prev, [level]: !prev[level] }));
    setPrefMessage(null);
  };

  const handleSavePreferences = async () => {
    const selected = (['B1', 'B2', 'C1', 'C2'] as const).filter((l) => levels[l]);
    if (selected.length === 0) {
      setPrefMessage({ type: 'error', text: t('msgSelectAtLeastOne') });
      return;
    }
    if (maxIdioms < 0 || maxSyntax < 0 || maxVocabulary < 0) {
      setPrefMessage({ type: 'error', text: t('msgCountsNegative') });
      return;
    }
    if (maxIdioms > 50 || maxSyntax > 50 || maxVocabulary > 50) {
      setPrefMessage({ type: 'error', text: t('msgCountsTooLarge') });
      return;
    }
    setPrefMessage(null);
    await setSettings({
      vocabLevels: selected,
      maxIdioms,
      maxSyntax,
      maxVocabulary,
    });
    setPrefMessage({ type: 'success', text: t('msgPreferencesSaved') });
  };

  const loadSyncStatus = async () => {
    const status = await getSyncStatusInfo();
    setSyncStatus(status);
  };

  const handleSaveGithubToken = async () => {
    if (!githubToken.trim()) {
      setSyncMessage({ type: 'error', text: t('syncTokenEmpty') });
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);

    const isValid = await validateToken(githubToken.trim());
    if (!isValid) {
      setSyncMessage({ type: 'error', text: t('syncTokenInvalid') });
      setIsSyncing(false);
      return;
    }

    await setSyncSettings({
      githubToken: githubToken.trim(),
      autoSync,
    });

    setSyncMessage({ type: 'success', text: t('syncTokenSaved') });
    setIsSyncing(false);
    loadSyncStatus();
    onSyncStatusChange?.();

    handleSync('lookup-or-create');
  };

  const handleSync = async (direction: 'push' | 'pull' | 'bidirectional' | 'lookup-or-create') => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      let result;
      switch (direction) {
        case 'push':
          result = await syncToGist();
          break;
        case 'pull':
          result = await syncFromGist();
          break;
        case 'bidirectional':
          result = await syncBidirectional();
          break;
        case 'lookup-or-create':
          result = await syncWithLookupOrCreate();
          break;
      }

      if (result.success) {
        if (result.conflicts && result.conflicts.length > 0) {
          setSyncMessage({ type: 'info', text: t('syncConflictsDetected', result.conflicts.length.toString()) });
        } else {
          const messages: Record<string, string> = {
            push: t('syncPushed', result.pushed?.toString() || '0'),
            pull: t('syncPulled', result.pulled?.toString() || '0'),
            bidirectional: t('syncCompleted'),
            'lookup-or-create': result.pulled && result.pulled > 0
              ? t('syncFoundExisting', result.pushed?.toString() || '0', result.pulled.toString())
              : t('syncCreatedNew', result.pushed?.toString() || '0'),
          };
          setSyncMessage({ type: 'success', text: messages[direction] });
        }
        await loadSyncStatus();
        onSyncStatusChange?.();
      } else {
        setSyncMessage({ type: 'error', text: formatSyncErrorMessage(t, result.errorCode, result.errorDetail, result.error) });
      }
    } catch (error) {
      setSyncMessage({
        type: 'error',
        text: formatSyncErrorMessage(t, 'SYNC_UNKNOWN', error instanceof Error ? error.message : String(error)),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyGistUrl = () => {
    if (gistId) {
      const url = `https://gist.github.com/${gistId}`;
      navigator.clipboard.writeText(url);
      setCopiedGistUrl(true);
      setTimeout(() => setCopiedGistUrl(false), 2000);
    }
  };

  const handleToggleAutoSync = async () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    await setSyncSettings({ autoSync: newValue });
  };

  return (
    <>
      <header className="header">
        <div className="header-title">
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>{t('settings')}</h1>
        </div>
      </header>

      <div className="content">
        <div className="settings">
        <section className="settings-section">
          <h3>{t('language')}</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="language">{t('language')}</label>
            <select
              id="language"
              className="form-input"
              value={lang}
              onChange={(e) => setLang((e.target.value as 'en' | 'zh'))}
            >
              <option value="en">{t('languageEnglish')}</option>
              <option value="zh">{t('languageChinese')}</option>
            </select>
          </div>
        </section>
        <section className="settings-section">
          <h3>
            <Key size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {t('apiConfig')}
          </h3>

          {message && (
            <div className={`message ${message.type} fade-in`}>
              {message.type === 'success' ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {message.text}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="apiKey">
              {t('apiKeyLabel')}
            </label>
            <input
              id="apiKey"
              type="password"
              className="form-input"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKeyValue}
              onChange={handleInputChange}
              onFocus={(e) => {
                if (e.target.value.includes('...')) {
                  setApiKeyValue('');
                }
              }}
            />
            <p className="form-hint">
              {t('getApiKeyFrom')}{' '}
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('deepseekPlatform')}
              </a>
            </p>
          </div>

          <button
            className="btn-primary btn-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? t('saving') : t('saveApiKey')}
          </button>
        </section>

        <section className="settings-section">
          <h3>{t('analysisPreferences')}</h3>
          {prefMessage && (
            <div className={`message ${prefMessage.type} fade-in`}>
              {prefMessage.type === 'success' ? (
                <CheckCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {prefMessage.text}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{t('vocabularyLevels')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['B1', 'B2', 'C1', 'C2'] as const).map((l) => (
                <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={levels[l]}
                    onChange={() => toggleLevel(l)}
                  />
                  <span>{l}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="maxIdioms">{t('maxIdioms')}</label>
            <input
              id="maxIdioms"
              type="number"
              className="form-input"
              min={0}
              max={50}
              value={maxIdioms}
              onChange={(e) => setMaxIdioms(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="maxSyntax">{t('maxSyntax')}</label>
            <input
              id="maxSyntax"
              type="number"
              className="form-input"
              min={0}
              max={50}
              value={maxSyntax}
              onChange={(e) => setMaxSyntax(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="maxVocabulary">{t('maxVocabulary')}</label>
            <input
              id="maxVocabulary"
              type="number"
              className="form-input"
              min={0}
              max={50}
              value={maxVocabulary}
              onChange={(e) => setMaxVocabulary(parseInt(e.target.value || '0', 10))}
            />
          </div>
          <button
            className="btn-primary btn-save"
            onClick={handleSavePreferences}
            disabled={false}
          >
            {t('savePreferences')}
          </button>
        </section>

        <section className="settings-section">
          <h3>
            <Github size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            {t('githubSync')}
          </h3>

          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('githubSyncDesc')}
          </div>

          {syncStatus.conflictsCount > 0 && (
            <div className="message warning fade-in">
              <AlertCircle size={16} />
              {t('syncConflictsPending', syncStatus.conflictsCount.toString())}
            </div>
          )}

          {syncMessage && (
            <div className={`message ${syncMessage.type} fade-in`}>
              {syncMessage.type === 'success' ? (
                <CheckCircle size={16} />
              ) : syncMessage.type === 'error' ? (
                <AlertCircle size={16} />
              ) : (
                <RefreshCw size={16} className="spinning" />
              )}
              {syncMessage.text}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="githubToken">
              {t('githubToken')}
            </label>
            <input
              id="githubToken"
              type="password"
              className="form-input"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
            <p className="form-hint">
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('createGithubToken')}
              </a>
              {' - '}{t('tokenScopes')} <code>gist</code>
            </p>
          </div>

          <button
            className="btn-primary btn-save"
            onClick={handleSaveGithubToken}
            disabled={isSyncing}
          >
            {isSyncing ? t('saving') : t('saveToken')}
          </button>

          {gistId && (
            <>
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">
                  <Link size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {t('gistUrl')}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    value={`https://gist.github.com/${gistId}`}
                    readOnly
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <button
                    className="btn-secondary"
                    onClick={handleCopyGistUrl}
                    title={t('copyUrl')}
                  >
                    {copiedGistUrl ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={handleToggleAutoSync}
                  />
                  <span>{t('autoSyncOnAnalyze')}</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleSync('push')}
                  disabled={isSyncing}
                >
                  <Upload size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {t('syncUpload')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleSync('pull')}
                  disabled={isSyncing}
                >
                  <Download size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {t('syncDownload')}
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => handleSync('bidirectional')}
                  disabled={isSyncing}
                >
                  <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {t('syncBidirectional')}
                </button>
              </div>

              {syncStatus.lastSyncText && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                  {t('lastSync')}: {syncStatus.lastSyncText}
                </p>
              )}
            </>
          )}
        </section>

        <section className="settings-section">
          <h3>{t('about')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {t('aboutText')}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            {t('versionLabel')} 1.0.0
          </p>
        </section>
        </div>
      </div>
    </>
  );
}

