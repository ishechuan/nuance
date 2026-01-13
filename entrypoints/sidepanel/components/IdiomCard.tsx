import type { IdiomItem } from '@/lib/types';
import { useI18n } from '../i18n';

interface IdiomCardProps {
  item: IdiomItem;
  isHighlighted: boolean;
  onHighlight: () => void;
}

export function IdiomCard({ item, isHighlighted, onHighlight }: IdiomCardProps) {
  const { t } = useI18n();
  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <span className="card-expression">{item.expression}</span>
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
      <p className="card-meaning">{item.meaning}</p>
      <div className="card-context">"{item.example}"</div>
    </div>
  );
}

