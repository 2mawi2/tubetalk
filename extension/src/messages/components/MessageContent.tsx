import React from 'react';
import DOMPurify from 'dompurify';
import type { MessageContent as MessageContentType } from './Message';
import { cleanStreamedContent } from '../utils/streamCleaner';

interface MessageContentProps {
  content: string | MessageContentType[];
  onClick: (e: React.MouseEvent) => void;
}

const parseMessageContent = (content: string | MessageContentType[]): MessageContentType[] => {
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.every(item => 
        typeof item === 'object' && 
        ('type' in item) && 
        (item.type === 'text' || item.type === 'image_url')
      )) {
        return parsed;
      }
      return [{ type: 'text', text: content }];
    } catch {
      return [{ type: 'text', text: content }];
    }
  }
  return content;
};

const processTimestamps = (text: string): string => {
  // Regex to match §[HH:MM:SS]§ or §[MM:SS]§ format
  const timestampRegex = /§\[(\d{1,2}(?::\d{1,2}){1,2})\]§/g;
  
  // Replace timestamps with span elements
  return text.replace(timestampRegex, (match, timestamp) => {
    // Format timestamp for display
    const displayTime = formatTimeDisplay(timestamp);
    
    // Return HTML with clickable span
    return `<span class="timestamp-link" data-timestamp="${timestamp}">${displayTime}</span>`;
  });
};

const formatTimeDisplay = (timestamp: string): string => {
  const parts = timestamp.split(':').map(Number);
  
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (hours === 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  const [minutes, seconds] = parts;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const MessageContent: React.FC<MessageContentProps> = ({ content, onClick }) => {
  const contents = parseMessageContent(content);
  
  return (
    <>
      {contents.map((item, index) => {
        if (item.type === 'text' && item.text) {
          // Apply code block cleaning before processing timestamps
          const cleanedText = cleanStreamedContent(item.text);
          const sanitizedContent = DOMPurify.sanitize(
            processTimestamps(cleanedText),
            {
              ADD_TAGS: ['section', 'div', 'h2', 'h3', 'ul', 'ol', 'li', 'p', 'span', 'button', 'strong'],
              ADD_ATTR: ['class', 'data-timestamp'],
              ALLOW_DATA_ATTR: true,
              FORBID_TAGS: ['style', 'script'],
              FORBID_ATTR: ['style', 'onerror', 'onload'],
            }
          );
          return (
            <div 
              key={`text-${index}`}
              className="message-content" 
              dangerouslySetInnerHTML={{ __html: sanitizedContent }} 
              onClick={onClick}
            />
          );
        } else if (item.type === 'image_url' && item.image_url?.url) {
          return (
            <div key={`image-${index}`} className="message-image">
              <img 
                src={item.image_url.url} 
                alt="Message attachment" 
                loading="lazy"
                decoding="async"
                onLoad={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.opacity = '1';
                }}
              />
            </div>
          );
        }
        return null;
      })}
    </>
  );
}; 