import { useState } from 'react';
import { ArrowLeft, User, LogOut, Crown, Loader2, CheckCircle } from 'lucide-react';

interface UserInfo {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isPro: boolean;
}

interface SettingsPanelProps {
  user: UserInfo | null;
  onBack: () => void;
  onLogout: () => void;
}

export function SettingsPanel({ user, onBack, onLogout }: SettingsPanelProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await browser.runtime.sendMessage({ type: 'SIGN_OUT' });
      onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-title">
          <button className="icon-btn" onClick={onBack}>
            <ArrowLeft size={18} />
          </button>
          <h1>设置</h1>
        </div>
      </header>

      <div className="settings">
        {/* User Profile Section */}
        <section className="settings-section">
          <h3>
            <User size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            账户信息
          </h3>

          {user && (
            <div className="user-profile">
              <div className="user-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || user.email} />
                ) : (
                  <div className="avatar-placeholder">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-info">
                <div className="user-name">
                  {user.name || '用户'}
                  {user.isPro && (
                    <span className="pro-badge">
                      <Crown size={12} />
                      Pro
                    </span>
                  )}
                </div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}

          <button
            className="btn-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>退出中...</span>
              </>
            ) : (
              <>
                <LogOut size={16} />
                <span>退出登录</span>
              </>
            )}
          </button>
        </section>

        {/* Subscription Section */}
        <section className="settings-section">
          <h3>
            <Crown size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            订阅状态
          </h3>

          {user?.isPro ? (
            <div className="subscription-status pro">
              <CheckCircle size={20} />
              <div className="subscription-info">
                <span className="subscription-title">Pro 会员</span>
                <span className="subscription-desc">享受无限分析次数</span>
              </div>
            </div>
          ) : (
            <div className="subscription-status free">
              <div className="subscription-info">
                <span className="subscription-title">免费版</span>
                <span className="subscription-desc">每日 5 次免费分析</span>
              </div>
              <button className="btn-upgrade">
                升级 Pro
              </button>
            </div>
          )}
        </section>

        {/* About Section */}
        <section className="settings-section">
          <h3>关于 Nuance</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Nuance 是一款 AI 驱动的英语学习助手，帮助您从任何网页文章中提取有价值的语言模式。
            它会分析习惯用法、复杂语法结构和高级词汇，助您快速提升英语水平。
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            Version 1.0.0
          </p>
        </section>
      </div>
    </>
  );
}
