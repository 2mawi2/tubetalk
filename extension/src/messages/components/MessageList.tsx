import React, { useEffect, useRef } from 'react';
import { Message as MessageComponent } from './Message';
import { Message } from './Messages';
import { ScrollButton } from './ScrollButton';
import './MessageList.scss';

interface MessageListProps {
  messages: Message[];
  onQuestionClick: (question: string) => void;
  onTimestampClick: (timestamp: string) => void;
  isStreaming: boolean;
  videoId?: string;
  onSummarizeClick?: () => void;
  summarizeClicked: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onQuestionClick,
  onTimestampClick,
  isStreaming,
  videoId,
  onSummarizeClick,
  summarizeClicked,
  containerRef,
  showScrollButton,
  onScrollToBottom,
}) => {
  return (
    <div 
      className="messages" 
      ref={containerRef} 
      data-testid="messages-container"
    >
      {messages.map((message, index) => (
        <MessageComponent
          key={message.id}
          message={message}
          onQuestionClick={onQuestionClick}
          onTimestampClick={onTimestampClick}
          isStreaming={isStreaming && index === messages.length - 1}
          isLastMessage={index === messages.length - 1}
          videoId={videoId}
          onSummarizeClick={message.id === 'welcome-message' && !summarizeClicked ? onSummarizeClick : undefined}
          data-testid={`message-${message.role}${message.id === 'welcome-message' ? '-welcome' : ''}${message.error ? '-error' : ''}${message.loading ? '-loading' : ''}`}
        />
      ))}
      {showScrollButton && messages.length > 0 && (
        <ScrollButton
          onClick={onScrollToBottom}
          visible={true}
        />
      )}
    </div>
  );
}; 