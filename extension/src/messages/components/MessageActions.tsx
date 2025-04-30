import React, { useState, useEffect } from 'react';
import { convertTimestampsToLinks } from '../utils/timeUtils';
import { useTranslations } from '../../common/translations/Translations';
import './MessageActions.scss';

interface MessageActionsProps {
  content: string;
  role: 'assistant' | 'user';
  videoId?: string;
  disabled?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ content, role, videoId, disabled }) => {
  const { getMessage } = useTranslations();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);
  const [showCopyCheck, setShowCopyCheck] = useState(false);
  const [showShareCheck, setShowShareCheck] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEnabled(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const createClipboardItem = (content: string, videoId?: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const plainText = convertTimestampsToLinks(temp.innerText, videoId, false);
    const htmlContent = `<!DOCTYPE html><html><body>
      ${convertTimestampsToLinks(content, videoId, true)}
    </body></html>`;
    return new ClipboardItem({
      'text/plain': new Blob([plainText], { type: 'text/plain' }),
      'text/html': new Blob([htmlContent], { type: 'text/html' })
    });
  };

  const fallbackCopy = async (content: string, videoId?: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    const plainText = convertTimestampsToLinks(temp.innerText, videoId, false);
    await navigator.clipboard.writeText(plainText);
  };

  const updateCopyState = () => {
    setIsCopyClicked(true);
    setShowCopyCheck(true);
    setTimeout(() => {
      setIsCopyClicked(false);
      setTimeout(() => setShowCopyCheck(false), 300);
    }, 500);
  };

  const handleCopy = async () => {
    try {
      const clipboardItem = createClipboardItem(content, videoId);
      await navigator.clipboard.write([clipboardItem]);
      updateCopyState();
    } catch (error) {
      try {
        await fallbackCopy(content, videoId);
        updateCopyState();
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
    }
  };

  const updateShareState = () => {
    setIsShareClicked(true);
    setShowShareCheck(true);
    setTimeout(() => {
      setIsShareClicked(false);
      setTimeout(() => setShowShareCheck(false), 300);
    }, 500);
  };

  const getShareContent = (content: string, videoId?: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = content;
    let text = convertTimestampsToLinks(temp.innerText, videoId, false);
    return text;
  };

  const handleShare = async () => {
    const shareText = getShareContent(content, videoId);
    
    try {
      // Use the Web Share API
      if (navigator.share) {
        await navigator.share({
          title: getMessage('shareTitle'),
          text: shareText,
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : 'https://github.com/2mawi2/tubetalk'
        });
        updateShareState();
      } else {
        // Web Share API not available
        console.error(getMessage('webShareApiNotAvailable'));
      }
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  if (role !== 'assistant') {
    return null;
  }

  return (
    <div className={`message-actions ${isEnabled ? '': 'disabled' }`} data-testid="message-actions">
      <button 
        onClick={handleCopy}
        className={`action-button ${isCopyClicked ? 'clicked' : ''} ${disabled ? 'disabled' : ''}`}
        title={getMessage('copyButtonTooltip')}
        aria-label={getMessage('copyButtonTooltip')}
        data-testid="copy-button"
        disabled={disabled}
      >
        {!showCopyCheck ? (
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            data-testid="copy-icon"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="check-icon"
            className="check-icon"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </button>
      
      <button 
        onClick={handleShare}
        className={`action-button ${isShareClicked ? 'clicked' : ''} ${disabled ? 'disabled' : ''}`}
        title={getMessage('shareButtonTooltip')}
        aria-label={getMessage('shareButtonTooltip')}
        data-testid="share-button"
        disabled={disabled}
      >
        {!showShareCheck ? (
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            data-testid="share-icon"
          >
            <circle cx="18" cy="5" r="3"></circle>
            <circle cx="6" cy="12" r="3"></circle>
            <circle cx="18" cy="19" r="3"></circle>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            data-testid="check-icon-share"
            className="check-icon"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </button>
    </div>
  );
};
