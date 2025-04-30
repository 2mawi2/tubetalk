import { useCallback } from 'react';
import { cleanStreamedContent } from '../utils/streamCleaner';
import { Message } from './Messages';
import { ContentModerationVideoDataError } from '../../common/errors/VideoDataError';

interface StreamHandlerProps {
  setLocalMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversationHistory: React.Dispatch<React.SetStateAction<any[]>>;
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  localMessages: Message[];
  handleInitError: (error: unknown) => void;
  extractSuggestedQuestions: (content: string) => { questions: string[], cleanedContent: string };
}

export const useStreamHandler = ({
  setLocalMessages,
  setConversationHistory,
  setIsStreaming,
  localMessages,
  handleInitError,
  extractSuggestedQuestions
}: StreamHandlerProps) => {
  
  const handleStreamedText = useCallback((_chunk: string, fullMessage: string) => {
    setLocalMessages(prev => {
      const updated = [...prev];
      const lastIndex = updated.length - 1;
      
      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
        const lastMessage = updated[lastIndex];
        
        const cleanMessage = cleanStreamedContent(fullMessage);
        const { questions, cleanedContent } = extractSuggestedQuestions(cleanMessage);
        
        const updatedQuestions = questions.length > 0 ? 
          questions : lastMessage.suggestedQuestions || [];
          
        updated[lastIndex] = {
          ...lastMessage,
          content: cleanedContent,
          suggestedQuestions: updatedQuestions,
          loading: false
        };
        
        return updated;
      }
      
      return prev;
    });
  }, [extractSuggestedQuestions]);

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
                  handleStreamedText(content, assistantMessage);
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
  }, [localMessages, setIsStreaming, setLocalMessages, setConversationHistory, handleInitError, handleStreamedText]);

  return {
    handleStreamedText,
    handleStreamResponse
  };
}; 