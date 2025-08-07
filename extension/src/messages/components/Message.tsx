import React from 'react';
import { MessageSkeleton } from './MessageSkeleton';
import { SuggestedQuestions } from './SuggestedQuestions';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';
import './Message.scss';
import { useTranslations } from '../../common/translations/Translations';

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface MessageProps {
  message: {
    id: string;
    role: 'assistant' | 'user';
    content: string | MessageContent[];
    suggestedQuestions?: string[];
    error?: boolean;
    loading?: boolean;
  };
  onQuestionClick?: (question: string) => void;
  onTimestampClick?: (timestamp: string) => void;
  isStreaming?: boolean;
  isLastMessage?: boolean;
  videoId?: string;
  onSummarizeClick?: () => void;
  onListen?: (text: string) => Promise<{ stop: () => void; onEnded?: (cb: () => void) => void }>;
  canListen?: boolean;
  'data-testid'?: string;
}

const MessageComponent: React.FC<MessageProps> = ({ 
  message, 
  onQuestionClick, 
  onTimestampClick, 
  isStreaming, 
  isLastMessage, 
  videoId, 
  onSummarizeClick,
  onListen,
  canListen,
  'data-testid': dataTestId
}) => {
  const { getMessage } = useTranslations();
  
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('timestamp-link')) {
      e.preventDefault();
      const timestamp = target.getAttribute('data-timestamp');
      if (timestamp && onTimestampClick) {
        onTimestampClick(timestamp);
      }
    }
  };

  if (message.loading) {
    return <MessageSkeleton />;
  }

  const messageContent = typeof message.content === 'string'
    ? message.content
    : message.content.filter(item => item.type === 'text').map(item => (item as any).text).join('\n');

  const isWelcomeMessage = message.id === 'welcome-message';
  
  // Enhance the messageClassNames to include more data
  const messageClassNames = [
    'message',
    message.role,
    message.error ? 'error' : '',
    isStreaming && message.role === 'assistant' ? 'streaming' : '',
    isWelcomeMessage ? 'welcome-message' : ''
  ].filter(Boolean).join(' ');

  // Update the data-testid to be more specific
  const testId = dataTestId || 
    `message-${message.role}${isWelcomeMessage ? '-welcome' : ''}${message.error ? '-error' : ''}${message.loading ? '-loading' : ''}`;

  return (
    <div>
      <div
        className={messageClassNames}
        data-testid={testId}
        data-message-id={message.id}
        data-message-role={message.role}
      >
        <MessageContent
          content={message.content}
          onClick={handleClick}
        />
        {message.role === 'assistant' && !message.loading && !message.error && (
          <MessageActions
            content={messageContent}
            role={message.role}
            videoId={videoId}
            disabled={isStreaming}
            canListen={!!canListen && !isStreaming}
            onListen={onListen}
          />
        )}
      </div>
      {isWelcomeMessage && onSummarizeClick && (
        <div className="summarize-container">
          <button 
            className="summarize-button"
            onClick={onSummarizeClick}
            data-testid="summarize-button"
          >
            {getMessage('summarizeButton')}
          </button>
        </div>
      )}
      {message.suggestedQuestions && (
          <SuggestedQuestions
            questions={message.suggestedQuestions}
            onQuestionClick={onQuestionClick || (() => { })}
          />
        )}
    </div>
  );
};

export const Message = React.memo(MessageComponent);