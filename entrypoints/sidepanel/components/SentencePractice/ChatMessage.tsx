import type { ChatMessage as ChatMessageType } from '../../store/sentencePractice';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAI = message.role === 'ai';

  return (
    <div className={`sp-message ${isAI ? 'sp-message-ai' : 'sp-message-user'}`}>
      <div className="sp-message-bubble">
        {/* Render content with line breaks */}
        {message.content.split('\n').map((line, i) => (
          <p key={i} className={line.startsWith('•') ? 'sp-correction-item' : ''}>
            {renderLine(line)}
          </p>
        ))}
      </div>
      <span className="sp-message-time">
        {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </span>
    </div>
  );
}

function renderLine(line: string): React.ReactNode {
  // Handle bold text marked with **
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
