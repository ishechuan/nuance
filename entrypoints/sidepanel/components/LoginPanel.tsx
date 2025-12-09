import { useState } from 'react';
import { Mail, Lock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import type { SignInEmailResponse } from '@/lib/messages';

interface LoginPanelProps {
  onLoginSuccess: () => void;
}

export function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('请输入邮箱和密码');
      return;
    }

    if (password.length < 6) {
      setError('密码至少需要 6 个字符');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use message mechanism to communicate with background script
      const response: SignInEmailResponse = await browser.runtime.sendMessage({
        type: 'SIGN_IN_EMAIL',
        email: email.trim(),
        password,
      });

      if (!response.success) {
        setError(response.error || '登录失败，请重试');
        setIsLoading(false);
        return;
      }

      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-panel">
      <div className="login-content">
        <div className="login-header">
          <div className="login-logo">
            <Sparkles size={32} />
          </div>
          <h2>欢迎使用 Nuance</h2>
          <p>AI 驱动的英语学习助手</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="message error fade-in">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <Mail size={14} />
              邮箱
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <Lock size={14} />
              密码
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="至少 6 个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-login"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin" />
                <span>登录中...</span>
              </>
            ) : (
              <span>登录 / 注册</span>
            )}
          </button>
        </form>

        <p className="login-note">
          首次登录将自动注册账号
        </p>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">📚</span>
            <span>智能分析文章中的习惯用法</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">✨</span>
            <span>提取核心语法和高级词汇</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⭐</span>
            <span>收藏并管理学习内容</span>
          </div>
        </div>
      </div>
    </div>
  );
}
