import { useState, useRef, useEffect } from 'react';
import { Send, HelpCircle } from 'lucide-react';

interface SentenceInputProps {
  onSubmit: (sentence: string) => void;
  onHint: () => void;
  disabled?: boolean;
}

export function SentenceInput({ onSubmit, onHint, disabled }: SentenceInputProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (text.trim() && !disabled) {
      onSubmit(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sp-input-container">
      {/* Hint button */}
      <button
        className="sp-hint-btn"
        onClick={onHint}
        disabled={disabled}
        title="获取提示"
      >
        <HelpCircle size={16} />
        <span>I'm stuck, show me hint</span>
      </button>

      {/* Input row */}
      <div className="sp-input-row">
        <textarea
          ref={inputRef}
          className="sp-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your sentence here..."
          disabled={disabled}
          rows={2}
        />

        <div className="sp-input-actions">
          {/* Submit button */}
          <button
            className="sp-submit-btn"
            onClick={handleSubmit}
            disabled={disabled || !text.trim()}
            title="提交 (Enter)"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
