import { useRef, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useSentencePracticeStore } from '../../store/sentencePractice';
import { ChatMessage } from './ChatMessage';
import { SentenceInput } from './SentenceInput';
import './styles.css';

interface SentencePracticeProps {
  onBack: () => void;
}

export function SentencePractice({ onBack }: SentencePracticeProps) {
  const {
    expression,
    chatHistory,
    currentTask,
    isLoading,
    error,
    submitSentence,
    requestHint,
    endPractice,
    clearError,
  } = useSentencePracticeStore();

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleBack = () => {
    endPractice();
    onBack();
  };

  const handleSubmit = (sentence: string) => {
    if (sentence.trim() && currentTask) {
      submitSentence(sentence.trim());
    }
  };

  const handleHint = () => {
    if (currentTask && !isLoading) {
      requestHint();
    }
  };

  const isComplete = chatHistory.some((msg) => msg.isComplete);

  return (
    <div className="sentence-practice">
      {/* Header */}
      <header className="sp-header">
        <button className="sp-back-btn" onClick={handleBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="sp-header-title">
          <h2>造句练习</h2>
          {expression && <span className="sp-expression">{expression}</span>}
        </div>
        <button className="sp-close-btn" onClick={handleBack}>
          <X size={20} />
        </button>
      </header>

      {/* Chat Container */}
      <div className="sp-chat-container" ref={chatContainerRef}>
        {chatHistory.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="sp-loading">
            <div className="sp-loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="sp-error">
            <span>{error}</span>
            <button onClick={clearError}>关闭</button>
          </div>
        )}
      </div>

      {/* Input Area */}
      {!isComplete && currentTask && (
        <SentenceInput
          onSubmit={handleSubmit}
          onHint={handleHint}
          disabled={isLoading}
        />
      )}

      {/* Complete State */}
      {isComplete && (
        <div className="sp-complete-actions">
          <button className="sp-btn-primary" onClick={handleBack}>
            返回继续学习
          </button>
        </div>
      )}
    </div>
  );
}
