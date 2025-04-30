import { useCallback } from 'react';
import { useMessagesStore } from '../store/messagesStore';
import type { ApiAdapter } from '../../common/adapters/ApiAdapter';

export const useStreamHandler = (apiAdapter: ApiAdapter) => {
  const store = useMessagesStore();

  const initializeStream = useCallback(() => {
    return store.initializeStream();
  }, [store]);

  const cleanupStream = useCallback(() => {
    store.cleanupStream();
  }, [store]);

  const handleStreamResponse = useCallback(async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    if (!reader) return;
    
    let buffer = '';
    let assistantMessage = '';
    store.setIsStreaming(true);
    
    const streamingMessage = {
      id: `streaming-${Date.now()}-${Math.random()}`,
      role: 'assistant' as const,
      content: '',
      loading: true
    };

    store.addMessage(streamingMessage);

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
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  store.handleStreamedText(content, assistantMessage);
                }
              } catch (error) {
                continue;
              }
            }
          }
        }
      }

      if (assistantMessage) {
        store.addToConversationHistory({ role: 'assistant', content: assistantMessage });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      throw error;
    } finally {
      store.setIsStreaming(false);
      reader.releaseLock();
    }
  }, [store]);

  return {
    initializeStream,
    cleanupStream,
    handleStreamResponse
  };
}; 