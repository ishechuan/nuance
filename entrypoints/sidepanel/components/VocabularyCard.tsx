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
        <span className={`card-level ${item.level.toLowerCase()}`}>{item.level}</span>
      </div>
      <p className="card-meaning">{item.definition}</p>
      <div className="card-context">"{item.context}"</div>
    </div>
  );
}

