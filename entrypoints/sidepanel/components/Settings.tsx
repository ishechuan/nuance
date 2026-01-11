import { useState, useEffect } from 'react';
import { ArrowLeft, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { getApiKey, setApiKey, getSettings, setSettings } from '@/lib/storage';
import { useI18n } from '../i18n';

interface SettingsPanelProps {
  onBack: () => void;
  onSaved: () => void;
}

export function SettingsPanel({ onBack, onSaved }: SettingsPanelProps) {
  const { t, lang, setLang } = useI18n();
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [levels, setLevels] = useState<{ B1: boolean; B2: boolean; C1: boolean; C2: boolean }>({ B1: true, B2: true, C1: true, C2: true });
  const [maxIdioms, setMaxIdioms] = useState<number>(10);
  const [maxSyntax, setMaxSyntax] = useState<number>(10);
  const [maxVocabulary, setMaxVocabulary] = useState<number>(10);
  const [prefMessage, setPrefMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

