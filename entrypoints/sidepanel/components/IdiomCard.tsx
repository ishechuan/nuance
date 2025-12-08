import type { IdiomItem } from '@/lib/storage';

interface IdiomCardProps {
  item: IdiomItem;
  isHighlighted: boolean;
  onHighlight: () => void;
}

export function IdiomCard({ item, isHighlighted, onHighlight }: IdiomCardProps) {
  return (
    <div 
      className={`analysis-card ${isHighlighted ? 'highlighted' : ''}`}
      onClick={onHighlight}
    >
      <div className="card-header">
        <span className="card-expression">{item.expression}</span>
      </div>
      <p className="card-meaning">{item.meaning}</p>
      <div className="card-context">"{item.example}"</div>
    </div>
  );
}

