import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Message } from './Message';
import './Messages.scss';
import { videoDataService } from '../../common/services/VideoDataService';
import type { PromptAdapter } from '../../common/adapters/PromptAdapter';
import type { ApiAdapter, ConversationMessage, MessageContent } from '../../common/adapters/ApiAdapter';
import { PromptBuilder } from '../utils/promptBuilder';
import { cleanStreamedContent } from '../utils/streamCleaner';
import { seekToTimestamp } from '../utils/timeUtils';
import { useTranslations } from '../../common/translations/Translations';
import { NoCaptionsVideoDataError, DataAccessVideoDataError, ContentModerationVideoDataError } from '../../common/errors/VideoDataError';
import { MessageService } from '../services/MessageService';
import { useScrollManager } from './ScrollManager';
import { createTtsService, type TtsService } from '../../common/services/tts_service';

const ScrollButton = ({ onClick, visible }: { onClick: () => void; visible: boolean }) => (
  <button 
    className={`scroll-button ${visible ? 'visible' : ''}`} 
    onClick={onClick}
    aria-label="Scroll to bottom"
  >
    <svg 
      className="icon" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
);

export interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string | MessageContent[];
  suggestedQuestions?: string[];
  error?: boolean;
  loading?: boolean;
}

interface MessagesProps {
  messages: Message[];
  onQuestionClick?: (question: string) => void;
  videoId?: string;
  apiKey?: string;
  provider?: 'openai' | 'openrouter';
  storageAdapter?: any;
  promptAdapter: PromptAdapter;
  apiAdapter?: ApiAdapter;
  onMessagesUpdate?: (newMessages: Message[]) => void;
  onStreamingStateChange?: (isStreaming: boolean) => void;
  onErrorStateChange?: (hasError: boolean) => void;
}

export interface MessagesRef {
  handleUserMessage: (message: string | MessageContent[]) => Promise<void>;
  reset: () => void;
  scrollToTop: () => void;
}

export const Messages = forwardRef<MessagesRef, MessagesProps>(({ 
  messages: initialMessages, 
  videoId, 
  apiKey,
  provider,
  storageAdapter,
  promptAdapter,
  apiAdapter,
  onMessagesUpdate,
  onStreamingStateChange,
  onErrorStateChange}, ref) => {
  const { getMessage } = useTranslations();
  const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [summarizeClicked, setSummarizeClicked] = useState(false);
  const streamControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(localMessages);
  const initializationRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialContextRef = useRef<ConversationMessage[]>([]);
  const handleStreamedTextRef = useRef<(chunk: string, fullMessage: string) => void>(() => {});
  const [, setIsLoading] = useState(false);
  const activeRequestCleanup = useRef<(() => void) | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const ttsServiceRef = useRef<TtsService | null>(null);

  const { 
    showScrollButton,
    scrollToBottom,
    scrollToTop,
    // isNearBottom
  } = useScrollManager({
    containerRef,
    messages: localMessages,
    isStreaming
  });

  useEffect(() => {
    messagesRef.current = localMessages;
    onMessagesUpdate?.(localMessages);
  }, [localMessages, onMessagesUpdate]);

  // Initialize TTS when provider and apiKey change
  useEffect(() => {
    ttsServiceRef.current = createTtsService(provider, apiKey ?? null);
  }, [provider, apiKey]);

  const handleListen = useCallback(async (text: string) => {
    if (!ttsServiceRef.current || !ttsServiceRef.current.canSynthesize) {
      throw new Error('TTS not available');
    }
    return ttsServiceRef.current.speak(text);
  }, []);

  const cleanup = useCallback(() => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
  }, []);

  // addMessage helper not used currently

  const handleQuestionClick = useCallback(async (question: string) => {
    if (!apiKey || !apiAdapter) {
      console.error('API key or adapter missing');
      return;
    }

    try {
      setLocalMessages(prev => prev.map(msg => ({
        ...msg,
        suggestedQuestions: msg.suggestedQuestions?.filter(q => q !== question)
      })));
      
      const userMessage = {
        id: `message-${Date.now()}-${Math.random()}`,
        role: 'user' as const,
        content: question
      };
      
      setLocalMessages(prev => [...prev, userMessage]);
      setConversationHistory(prev => [...prev, { role: 'user', content: question }]);

      cleanup();
      streamControllerRef.current = new AbortController();

      const reader = await apiAdapter.generateStreamResponse([
        ...conversationHistory,
        { role: 'user', content: question }
      ], streamControllerRef.current.signal);
      
      if (reader) {
        await handleStreamResponse(reader);
      }
    } catch (error) {
      console.error('Error handling question click:', error);
      const errorMessage = {
        id: `message-${Date.now()}-${Math.random()}`,
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      };
      setLocalMessages(prev => [...prev, errorMessage]);
    }
  }, [apiKey, apiAdapter, conversationHistory, cleanup]);

  const extractSuggestedQuestions = useCallback((content: string): { questions: string[], cleanedContent: string } => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const questions: string[] = [];
    const questionButtons = tempDiv.querySelectorAll('.suggested-questions .question-button');
    
    questionButtons.forEach(button => {
      if (button.textContent) {
        questions.push(button.textContent.trim());
      }
    });

    const suggestedQuestionsElements = tempDiv.querySelectorAll('.suggested-questions');
    suggestedQuestionsElements.forEach(element => {
      element.parentNode?.removeChild(element);
    });
    
    return {
      questions,
      cleanedContent: tempDiv.innerHTML
    };
  }, []);

  const handleStreamedText = useCallback((_chunk: string, fullMessage: string) => {
    setLocalMessages(prev => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        const cleanMessage = cleanStreamedContent(fullMessage);
        const { questions, cleanedContent } = extractSuggestedQuestions(cleanMessage);
        return updated.map((msg, index) => {
          if (index === updated.length - 1) {
            return {
              ...msg,
              content: cleanedContent,
              suggestedQuestions: questions
            };
          }
          return msg;
        });
      }
      return prev;
    });
  }, [extractSuggestedQuestions]);

  useEffect(() => {
    handleStreamedTextRef.current = handleStreamedText;
  }, [handleStreamedText]);

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
  }, [onErrorStateChange, getMessage]);

  useEffect(() => {
    const hasError = localMessages.some(msg => msg.error);
    onErrorStateChange?.(hasError);
  }, [localMessages, onErrorStateChange]);

  const handleStreamResponse = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    if (!reader) return;
    
    let buffer = '';
    let assistantMessage = '';
    setIsStreaming(true);
    
    const existingLoadingIndex = localMessages.findIndex(msg => msg.loading);
    let messageId: string;
    
    if (existingLoadingIndex >= 0) {
      messageId = localMessages[existingLoadingIndex].id;
    } else {
      messageId = `streaming-${Date.now()}-${Math.random()}`;
    const streamingMessage: Message = {
        id: messageId,
      role: 'assistant',
      content: '',
      loading: true
    };

    setLocalMessages(prev => [...prev, streamingMessage]);
    }

    try {
      let isReading = true;
      while (isReading) {
        const { done, value } = await reader.read();
        if (done) {
          isReading = false;
          break;
        }
        buffer += new TextDecoder("utf-8").decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.replace(/^data: /, '').trim();
            if (data === '[DONE]') break;
            
            if (data) {
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.error?.code === 403 && parsed.error?.metadata?.reasons?.includes('sexual')) {
                  throw new ContentModerationVideoDataError(parsed.error.message);
                }
                
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  if (handleStreamedTextRef.current) {
                    handleStreamedTextRef.current(content, assistantMessage);
                  }
                  
                  setLocalMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, content: assistantMessage, loading: false } : msg
                  ));
                }
              } catch (error) {
                if (error instanceof ContentModerationVideoDataError) {
                  setLocalMessages(prev => prev.filter(msg => msg.id !== messageId));
                  handleInitError(error);
                  return;
                }
                continue;
              }
            }
          }
        }
      }

      if (assistantMessage) {
        setConversationHistory(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const error = err instanceof Error ? err : new Error(String(err));
      handleInitError(error);
    } finally {
      setIsStreaming(false);
      reader.releaseLock();
    }
  }, [handleStreamedTextRef, handleInitError, localMessages]);

  const handleTimestampClick = useCallback((timestamp: string) => {
    seekToTimestamp(timestamp);
  }, []);

  // Helper function to get MessageService instance
  const getMessageService = useCallback(() => {
    if (!apiAdapter || !promptAdapter || !storageAdapter) {
      return null;
    }
    return new MessageService(apiAdapter, promptAdapter, storageAdapter);
  }, [apiAdapter, promptAdapter, storageAdapter]);

  const reset = useCallback(() => {
    // Abort any streaming
    cleanup();
    
    // Reset messages and state
    setLocalMessages([]);
    setConversationHistory([]);
    initialContextRef.current = [];
    
    // Reset initialization flags
    setIsInitialized(false);
    initializationRef.current = false;
    
    // Reset summarize button to make it reappear
    setSummarizeClicked(false);
    
    // Clean up any active MessageService instances
    const messageService = getMessageService();
    if (messageService) {
      messageService.cleanup();
    }
    
    // Clean up any active request
    if (activeRequestCleanup.current) {
      activeRequestCleanup.current();
      activeRequestCleanup.current = null;
    }
  }, [cleanup, getMessageService]);

  const requestSuggestedQuestions = useCallback(async (summaryText: string) => {
    if (!videoId || !apiKey || !apiAdapter || !promptAdapter || !storageAdapter) {
      return;
    }

    try {
      // Create a MessageService instance to handle the API call and parsing
      const messageService = getMessageService();
      if (!messageService) {
        return;
      }

      const questions = await messageService.getSuggestedQuestions(videoId, summaryText);
      
      if (questions.length > 0) {
        setLocalMessages(prev => {
          const updated = [...prev];
          
          const lastAssistantIndex = findLastIndex(updated, msg => 
            msg.role === 'assistant' && !msg.error
          );
          
          if (lastAssistantIndex !== -1) {
            updated[lastAssistantIndex] = {
              ...updated[lastAssistantIndex],
              suggestedQuestions: questions
            };
          } else {
            console.warn('Could not find assistant message to add suggested questions to');
          }
          
          return updated;
        });
      } else {
        console.warn('No questions found in response');
      }
    } catch (error) {
      console.error('Error requesting suggested questions:', error);
    }
  }, [videoId, apiKey, apiAdapter, promptAdapter, storageAdapter, getMessageService]);

  const findLastIndex = <T,>(array: T[], predicate: (value: T) => boolean): number => {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i])) {
        return i;
      }
    }
    return -1;
  };

  const initializeSummary = useCallback(async () => {
    if (!videoId || !apiKey || !apiAdapter || !promptAdapter || !storageAdapter) {
      return;
    }

    setSummarizeClicked(true);

    try {
      setIsLoading(true);

      // Add user message to request summarization
      const userMessage = {
        id: `message-${Date.now()}-${Math.random()}`,
        role: 'user' as const,
        content: getMessage('summarizeButton')
      };
      
      setLocalMessages(prev => [...prev, userMessage]);
      setConversationHistory(prev => [...prev, { role: 'user', content: getMessage('summarizeButton') }]);

      const [
        videoData,
        showSuggestedQuestions,
        showSuggestedQuestionsEnabled,
        selectedSummaryLanguage,
        prompts
      ] = await Promise.all([
        videoDataService.fetchVideoData(videoId),
        storageAdapter.getShowSponsored(),
        storageAdapter.getShowSuggestedQuestions(),
        storageAdapter.getSelectedSummaryLanguage(),
        promptAdapter.getPrompts()
      ]);

      const promptBuilder = new PromptBuilder(prompts, selectedSummaryLanguage);
      const messages = await promptBuilder.buildSummaryPrompt(
        videoData.title,
        videoData.description,
        videoData.transcript,
        showSuggestedQuestions,
        true,
        false
      );

      setIsInitialized(true);

      const controller = new AbortController();
      const cleanup = () => controller.abort();
      activeRequestCleanup.current = cleanup;
      
      try {
        const reader = await apiAdapter.generateStreamResponse(messages, controller.signal);
        if (reader) {
          let summaryContent = '';
          
          const originalHandleStreamedText = handleStreamedTextRef.current;
          
          const temporaryHandleStreamedText = (chunk: string, fullMessage: string) => {
            const cleanMessage = cleanStreamedContent(fullMessage);
            summaryContent = cleanMessage;
            if (originalHandleStreamedText) {
              originalHandleStreamedText(chunk, cleanMessage);
            }
          };
          
          handleStreamedTextRef.current = temporaryHandleStreamedText;
          
          await handleStreamResponse(reader);
          
          handleStreamedTextRef.current = originalHandleStreamedText;
          
          if (showSuggestedQuestionsEnabled && summaryContent) {
            
            setTimeout(() => {
              requestSuggestedQuestions(summaryContent).catch(error => {
                console.error('Error requesting suggested questions:', error);
              });
            }, 100);
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        handleInitError(error);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      handleInitError(error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId, apiKey, apiAdapter, storageAdapter, promptAdapter, handleStreamResponse, handleInitError, requestSuggestedQuestions, handleStreamedTextRef, getMessage]);

  const handleUserMessage = useCallback(async (message: string | MessageContent[]) => {
    if (!videoId || !apiKey || !apiAdapter || !promptAdapter || !storageAdapter) {
      return;
    }

    if (activeRequestCleanup.current) {
      activeRequestCleanup.current();
      activeRequestCleanup.current = null;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: message
    };

    setLocalMessages(prev => [...prev, userMessage]);
    
    if (onMessagesUpdate) {
      onMessagesUpdate([...localMessages, userMessage]);
    }

    try {
      if (onStreamingStateChange) {
        onStreamingStateChange(true);
      }

      if (onErrorStateChange) {
        onErrorStateChange(false);
      }

      const controller = new AbortController();
      const cleanup = () => controller.abort();
      activeRequestCleanup.current = cleanup;

      let apiMessages;
      const videoData = await videoDataService.fetchVideoData(videoId);
      const prompts = await promptAdapter.getPrompts();
      const promptBuilder = new PromptBuilder(prompts, null);

      // Check if this is the first user message (no previous user messages exist)
      const isFirstUserMessage = !localMessages.some(msg => msg.role === 'user');
      
      if (isFirstUserMessage) {
        // First user message: create full context with transcript
        const userMessageText = typeof message === 'string' ? message : message.map(m => 
          m.type === 'text' && m.text ? m.text : ''
        ).join('');
        
        apiMessages = await promptBuilder.buildChatPrompt(
          videoData.title,
          videoData.description,
          videoData.transcript,
          userMessageText
        );
        
        // Save the system message with context to conversationHistory
        if (apiMessages.length >= 2 && apiMessages[0].role === 'system') {
          initialContextRef.current = [apiMessages[0]];
        }
        
        if (Array.isArray(message)) {
          const lastIndex = apiMessages.length - 1;
          apiMessages[lastIndex] = {
            ...apiMessages[lastIndex],
            content: message
          };
        }
      } else {
        // Subsequent messages: reuse the system message with context
        const userMessageText = typeof message === 'string' ? message : message.map(m => 
          m.type === 'text' && m.text ? m.text : ''
        ).join('');
        
        // Get conversation messages without including system messages
        const conversationMessages = localMessages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })) as ConversationMessage[];
        
        // Combine the initial system message with context + conversation history + new message
        apiMessages = [
          ...(initialContextRef.current.length > 0 ? initialContextRef.current : []),
          ...conversationMessages,
          {
            role: 'user' as const,
            content: message
          }
        ];
        
        // If we don't have an initial context saved, regenerate it
        if (initialContextRef.current.length === 0) {
          apiMessages = await promptBuilder.buildChatPrompt(
            videoData.title,
            videoData.description,
            videoData.transcript,
            userMessageText
          );
          
          if (apiMessages.length >= 2 && apiMessages[0].role === 'system') {
            initialContextRef.current = [apiMessages[0]];
          }
        }
      }

      try {
        const reader = await apiAdapter.generateStreamResponse(apiMessages, controller.signal);
        if (reader) {
          await handleStreamResponse(reader);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error generating response:', err);
          
          const error = err instanceof Error ? err : new Error(String(err));
          handleInitError(error);

          if (onStreamingStateChange) {
            onStreamingStateChange(false);
          }

          if (onErrorStateChange) {
            onErrorStateChange(true);
          }
        }
      }
    } catch (error) {
      console.error('Error handling user message:', error);
      handleInitError(error);
    }
  }, [
    videoId,
    apiKey,
    apiAdapter,
    promptAdapter,
    storageAdapter,
    localMessages,
    onMessagesUpdate,
    onStreamingStateChange,
    onErrorStateChange,
    handleStreamResponse,
    handleInitError
  ]);

  useImperativeHandle(ref, () => ({
    handleUserMessage: handleUserMessage,
    reset: reset,
    scrollToTop: scrollToTop
  }), [handleUserMessage, reset, scrollToTop]);

  useEffect(() => {
    if (videoId && apiKey && !isInitialized && apiAdapter) {
      
      if (initialMessages.length === 0) {
        const welcomeMessage: Message = {
          id: 'welcome-message', 
          role: 'assistant',
          content: 'How can I help you with this YouTube video?'
        };
        
        setLocalMessages([welcomeMessage]);
        if (onMessagesUpdate) {
          onMessagesUpdate([welcomeMessage]);
        }
      } else {
        setLocalMessages(initialMessages);
      }
      setIsInitialized(true);
    }
  }, [videoId, apiKey, isInitialized, apiAdapter, initialMessages, onMessagesUpdate]);

  useEffect(() => {
    if (videoId) {
      cleanup();
      setLocalMessages([]);
      setConversationHistory([]);
      initialContextRef.current = [];
      if (!initializationRef.current) {
        setIsInitialized(false);
      }
      initializationRef.current = false;
    }
  }, [videoId, cleanup]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (isStreaming !== undefined) {
      onStreamingStateChange?.(isStreaming);
    }
  }, [isStreaming, onStreamingStateChange]);

  const memoizedMessages = useMemo(() => localMessages, [localMessages]);

  const hasNoCaptionsError = useMemo(() => {
    return localMessages.some(
      msg => msg.error && msg.role === 'assistant' && 
      typeof msg.content === 'string' && 
      msg.content === getMessage('noTranscriptMessage')
    );
  }, [localMessages, getMessage]);

  useEffect(() => {
    if (isInitialLoad) {
      requestAnimationFrame(() => {
        setIsInitialLoad(false);
      });
    }
  }, [isInitialLoad]);

  if (hasNoCaptionsError) {
    return (
      <div className="messages" data-testid="messages-container">
        <div data-testid="message-assistant-error" className="message assistant error">
          {getMessage('noTranscriptMessage')}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`messages ${isInitialLoad ? 'initial-load' : ''}`}
      ref={containerRef} 
      data-testid="messages-container"
    >
      {memoizedMessages.map((message, index) => (
        <Message
          key={message.id}
          message={message}
          onQuestionClick={handleQuestionClick}
          onTimestampClick={handleTimestampClick}
          isStreaming={isStreaming && index === memoizedMessages.length - 1}
          isLastMessage={index === memoizedMessages.length - 1}
          videoId={videoId}
          onSummarizeClick={message.id === 'welcome-message' && !summarizeClicked ? initializeSummary : undefined}
          canListen={provider === 'openai' && !isStreaming}
          onListen={provider === 'openai' ? handleListen : undefined}
          data-testid={`message-${message.role}${message.id === 'welcome-message' ? '-welcome' : ''}${message.error ? '-error' : ''}${message.loading ? '-loading' : ''}`}
        />
      ))}
      {showScrollButton && localMessages.length > 0 && (
        <ScrollButton
          onClick={scrollToBottom}
          visible={true}
          data-testid="scroll-button"
        />
      )}
      <div className="bottom-spacer" aria-hidden="true"></div>
    </div>
  );
});

Messages.displayName = 'Messages';
