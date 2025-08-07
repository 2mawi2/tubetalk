import React, { useState, useEffect } from 'react';
import { convertTimestampsToLinks } from '../utils/timeUtils';
import { useTranslations } from '../../common/translations/Translations';
import './MessageActions.scss';

interface MessageActionsProps {
  content: string;
  role: 'assistant' | 'user';
  videoId?: string;
  disabled?: boolean;
  canListen?: boolean;
  onListen?: (plainText: string) => Promise<{ stop: () => void; onEnded?: (cb: () => void) => void }>;
}

export const MessageActions: React.FC<MessageActionsProps> = ({ content, role, videoId, disabled, canListen, onListen }) => {
  const { getMessage } = useTranslations();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isCopyClicked, setIsCopyClicked] = useState(false);
  const [isShareClicked, setIsShareClicked] = useState(false);
  const [showCopyCheck, setShowCopyCheck] = useState(false);
  const [showShareCheck, setShowShareCheck] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [stopHandle, setStopHandle] = useState<{ stop: () => void; onEnded?: (cb: () => void) => void } | null>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);

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

  const extractPlainText = (html: string) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.innerText;
  };

  const handleListen = async () => {
    if (!onListen || isSpeaking) return;
    try {
      setIsTtsLoading(true);
      const text = extractPlainText(content);
      const handle = await onListen(text);
      if (handle && typeof handle.stop === 'function') {
        setStopHandle(handle);
        setIsSpeaking(true);
        // auto reset when audio fully ends
        if (typeof handle.onEnded === 'function') {
          handle.onEnded(() => {
            setIsSpeaking(false);
            setStopHandle(null);
          });
        }
      }
    } catch (e) {
      // swallow to keep UI responsive
    }
    finally {
      setIsTtsLoading(false);
    }
  };

  const handleStop = () => {
    try {
      stopHandle?.stop();
    } finally {
      setIsSpeaking(false);
      setStopHandle(null);
    }
  };

  // Reset copy/share transient animations when TTS state changes
  useEffect(() => {
    if (isTtsLoading || isSpeaking) {
      setIsCopyClicked(false);
      setShowCopyCheck(false);
      setIsShareClicked(false);
      setShowShareCheck(false);
    }
  }, [isTtsLoading, isSpeaking]);

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

      {canListen && onListen && !disabled && !isSpeaking && !isTtsLoading && (
        <button
          onClick={handleListen}
          className={`action-button`}
          title={getMessage('listenButtonTooltip')}
          aria-label={getMessage('listenButtonTooltip')}
          data-testid="listen-button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 5l-4 4H4v6h3l4 4V5z"></path>
            <path d="M15 9a5 5 0 0 1 0 6"></path>
            <path d="M17.5 6.5a9 9 0 0 1 0 11"></path>
          </svg>
        </button>
      )}

      {canListen && onListen && !disabled && isTtsLoading && (
        <button
          className={`action-button`}
          title={getMessage('listenButtonTooltip')}
          aria-label={getMessage('listenButtonTooltip')}
          data-testid="listen-spinner"
          disabled
        >
          <svg className="spinner" viewBox="0 0 50 50" width="16" height="16">
            <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="4"></circle>
          </svg>
        </button>
      )}

      {canListen && onListen && !disabled && isSpeaking && !isTtsLoading && (
        <button
          onClick={handleStop}
          className={`action-button`}
          title={getMessage('stopButtonTooltip')}
          aria-label={getMessage('stopButtonTooltip')}
          data-testid="stop-button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="6" y="6" width="12" height="12"></rect>
          </svg>
        </button>
      )}
    </div>
  );
};
