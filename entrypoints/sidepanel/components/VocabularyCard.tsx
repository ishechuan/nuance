import type { VocabularyItem } from '@/lib/types';

interface VocabularyCardProps {
  item: VocabularyItem;
  isHighlighted: boolean;
  onHighlight: () => void;
}

export function VocabularyCard({ item, isHighlighted, onHighlight }: VocabularyCardProps) {
  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <span className="card-expression">{item.word}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {item.isCustom && (
            <span style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'var(--accent-info)',
              color: 'white',
              fontWeight: 600,
            }}>
              自定义
            </span>
          )}
          <span className={`card-level ${item.level.toLowerCase()}`}>{item.level}</span>
        </div>
      </div>
      <p className="card-meaning">{item.definition}</p>
      <div className="card-context">"{item.context}"</div>
    </div>
  );
}

