import { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, HelpCircle } from 'lucide-react';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SentenceInputProps {
  onSubmit: (sentence: string) => void;
  onHint: () => void;
  disabled?: boolean;
}

export function SentenceInput({ onSubmit, onHint, disabled }: SentenceInputProps) {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check for speech recognition support
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognitionClass);
  }, []);

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
    if (e.key === 'Tab') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition: SpeechRecognitionInstance = new SpeechRecognitionClass();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join('');
      setText(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
          placeholder="输入你的句子，或使用语音输入..."
          disabled={disabled}
          rows={2}
        />

        <div className="sp-input-actions">
          {/* Voice input button */}
          {speechSupported && (
            <button
              className={`sp-voice-btn ${isListening ? 'sp-voice-active' : ''}`}
              onClick={toggleListening}
              disabled={disabled}
              title={isListening ? '停止录音' : '语音输入'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

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

      {/* Voice indicator */}
      {isListening && (
        <div className="sp-voice-indicator">
          <span className="sp-voice-pulse"></span>
          正在听...
        </div>
      )}
    </div>
  );
}


