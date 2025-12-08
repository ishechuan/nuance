import { Zap, Crown } from 'lucide-react';
import type { UsageInfo } from '@/lib/messages';

interface UsageStatusProps {
  usage: UsageInfo | null;
}

export function UsageStatus({ usage }: UsageStatusProps) {
  if (!usage) return null;

  const { used, limit, isPro } = usage;

  if (isPro) {
    return (
      <div className="usage-status pro">
        <Crown size={14} />
        <span>Pro 会员 · 无限次数</span>
      </div>
    );
  }

  const remaining = limit ? limit - used : 0;
  const isLow = remaining <= 2;
  const isExhausted = remaining <= 0;

  return (
    <div className={`usage-status ${isExhausted ? 'exhausted' : isLow ? 'low' : ''}`}>
      <Zap size={14} />
      <span>
        今日剩余 {remaining}/{limit} 次
      </span>
      {isExhausted && (
        <button className="upgrade-btn">
          升级 Pro
        </button>
      )}
    </div>
  );
}

