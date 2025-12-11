import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';

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

interface VoiceInputProps {
  onResult: (text: string) => void;
  onInterim?: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInput({ onResult, onInterim, disabled, className }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn('Speech recognition not supported');
      return;
    }

    const recognition: SpeechRecognitionInstance = new SpeechRecognitionClass();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript);
      } else if (interimTranscript && onInterim) {
        onInterim(interimTranscript);
      }
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
  }, [onResult, onInterim]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Check if speech recognition is supported
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isSupported = typeof window !== 'undefined' && 
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      className={`sp-voice-btn ${isListening ? 'sp-voice-active' : ''} ${className || ''}`}
      onClick={toggleListening}
      disabled={disabled}
      title={isListening ? '停止录音' : '语音输入 (英语)'}
    >
      {isListening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
}

export function useVoiceSupport(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof window !== 'undefined' && 
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}
