import { useState, useEffect } from 'react';
import { ArrowLeft, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { getApiKey, setApiKey } from '@/lib/storage';

interface SettingsPanelProps {
  onBack: () => void;
  onSaved: () => void;
}

export function SettingsPanel({ onBack, onSaved }: SettingsPanelProps) {
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    getApiKey().then((key) => {
      if (key) {
        // Mask the key for display
        setApiKeyValue(key.slice(0, 8) + '...' + key.slice(-4));
      }
    });
  }, []);

  const handleSave = async () => {
    // Don't save if it's the masked value
    if (apiKeyValue.includes('...')) {
      setMessage({ type: 'error', text: 'Please enter a new API key' });
      return;
    }

    if (!apiKeyValue.trim()) {
      setMessage({ type: 'error', text: 'API key cannot be empty' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      await setApiKey(apiKeyValue.trim());
      setMessage({ type: 'success', text: 'API key saved successfully!' });
      
      // Notify parent after a short delay
      setTimeout(() => {
        onSaved();
      }, 1000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If user starts typing over masked value, clear it
    if (apiKeyValue.includes('...') && value !== apiKeyValue) {
      setApiKeyValue(value.replace(apiKeyValue, ''));
    } else {
      setApiKeyValue(value);
    }
    setMessage(null);
  };

  return (
    <>
      <header className="header">
        <div className="header-title">
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>Settings</h1>
        </div>
      </header>

      <div className="settings">
        <section className="settings-section">
          <h3>
            <Key size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            DeepSeek API Configuration
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
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              className="form-input"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKeyValue}
              onChange={handleInputChange}
              onFocus={(e) => {
                // Clear masked value on focus
                if (e.target.value.includes('...')) {
                  setApiKeyValue('');
                }
              }}
            />
            <p className="form-hint">
              Get your API key from{' '}
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noopener noreferrer"
              >
                DeepSeek Platform
              </a>
            </p>
          </div>

          <button
            className="btn-primary btn-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save API Key'}
          </button>
        </section>

        <section className="settings-section">
          <h3>About Nuance</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Nuance is an AI-powered English learning assistant that helps you extract 
            valuable language patterns from any web article. It analyzes idioms, 
            complex syntax structures, and advanced vocabulary to accelerate your 
            English mastery.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            Version 1.0.0
          </p>
        </section>
      </div>
    </>
  );
}

