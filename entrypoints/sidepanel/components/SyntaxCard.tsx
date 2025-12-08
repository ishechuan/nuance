import type { SyntaxItem } from '@/lib/storage';

interface SyntaxCardProps {
  item: SyntaxItem;
  isHighlighted: boolean;
  onHighlight: () => void;
}

export function SyntaxCard({ item, isHighlighted, onHighlight }: SyntaxCardProps) {
  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <span className="card-structure">{item.structure}</span>
      </div>
      <div className="card-context mb-3">
        "{item.sentence}"
      </div>
      <p className="card-meaning">{item.explanation}</p>
    </div>
  );
}

