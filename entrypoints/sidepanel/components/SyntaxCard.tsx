import type { SyntaxItem } from '@/lib/types';
import { useI18n } from '../i18n';

interface SyntaxCardProps {
  item: SyntaxItem;
  isHighlighted: boolean;
  onHighlight: () => void;
}

export function SyntaxCard({ item, isHighlighted, onHighlight }: SyntaxCardProps) {
  const { t } = useI18n();
  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <span className="card-structure">{item.structure}</span>
        {item.isCustom && (
          <span style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'var(--accent-info)',
            color: 'white',
            fontWeight: 600,
          }}>
            {t('customAdd')}
          </span>
        )}
      </div>
      <div className="card-context mb-3">
        "{item.sentence}"
      </div>
      <p className="card-meaning">{item.explanation}</p>
    </div>
  );
}

