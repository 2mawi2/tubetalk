import { useCallback } from 'react';
import { NoCaptionsVideoDataError, DataAccessVideoDataError, ContentModerationVideoDataError } from '../../common/errors/VideoDataError';
import { useTranslations } from '../../common/translations/Translations';
import { Message } from './Messages';

interface ErrorHandlerProps {
  setLocalMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onErrorStateChange?: (hasError: boolean) => void;
}

export const useErrorHandler = ({
  setLocalMessages,
  onErrorStateChange
}: ErrorHandlerProps) => {
  const { getMessage } = useTranslations();

  const handleInitError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    
    let errorMessage = '';
    if (error instanceof NoCaptionsVideoDataError) {
      errorMessage = getMessage('noTranscriptMessage');
    } else if (error instanceof DataAccessVideoDataError) {
      errorMessage = getMessage('dataAccessError');
    } else if (error instanceof ContentModerationVideoDataError) {
      errorMessage = getMessage('contentModerationError');
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    setLocalMessages(prev => {
      if (prev.some(msg => msg.error)) {
        return prev;
      }
      const newMessages = [...prev, {
        id: `error-${Date.now()}-${Math.random()}`,
        role: 'assistant' as const,
        content: errorMessage,
        error: true
      }];
      onErrorStateChange?.(true);
      return newMessages;
    });
  }, [onErrorStateChange, getMessage, setLocalMessages]);

  const checkForErrors = useCallback((messages: Message[]) => {
    const hasError = messages.some(msg => msg.error);
    onErrorStateChange?.(hasError);
  }, [onErrorStateChange]);

  return {
    handleInitError,
    checkForErrors
  };
}; 