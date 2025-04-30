import { useCallback, useEffect, useRef } from 'react';
import { useMessagesStore } from '../store/messagesStore';
import { videoDataService } from '../../common/services/VideoDataService';
import { PromptBuilder } from '../utils/promptBuilder';
import type { ApiAdapter } from '../../common/adapters/ApiAdapter';
import type { PromptAdapter } from '../../common/adapters/PromptAdapter';
import { useStreamHandler } from './useStreamHandler';

interface UseMessagesInitializationProps {
  videoId?: string;
  apiKey?: string;
  apiAdapter?: ApiAdapter;
  promptAdapter: PromptAdapter;
  storageAdapter?: any;
}

export const useMessagesInitialization = ({
  videoId,
  apiKey,
  apiAdapter,
  promptAdapter,
  storageAdapter
}: UseMessagesInitializationProps) => {
  const store = useMessagesStore();
  const { handleStreamResponse, initializeStream } = useStreamHandler(apiAdapter!);
  const initializationRef = useRef(false);
  const previousVideoIdRef = useRef<string | undefined>(undefined);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const cleanup = useCallback(() => {
    store.reset();
    initializationRef.current = false;
  }, [store]);

  const handleInitError = useCallback((error: Error) => {
    if (!isMountedRef.current) return;
    const errorMessage = error.message.includes('No captions available')
      ? 'No captions are available for this video. Please try a different video.'
      : `Error: ${error.message}`;

    store.handleError(new Error(errorMessage));
    store.setIsInitialized(true);
  }, [store]);

  const initializeChat = useCallback(async () => {
    if (!videoId || !apiKey || !apiAdapter || store.isInitialized || initializationRef.current) {
      return;
    }

    try {
      initializationRef.current = true;
      const videoData = await videoDataService.fetchVideoData(videoId);

      if (!isMountedRef.current) return;

      if (!videoData.title) {
        throw new Error('Title is required');
      }

      // Get all prompts at once
      const prompts = await promptAdapter.getPrompts();
      const selectedSummaryLanguage = await storageAdapter?.getSelectedSummaryLanguage();
      const promptBuilder = new PromptBuilder(prompts, selectedSummaryLanguage);

      // Get showSponsored setting
      const showSponsored = await storageAdapter?.getShowSponsored() ?? false;
      const showSuggestedQuestions = await storageAdapter?.getShowSuggestedQuestions() ?? false;

      // Build initial context using PromptBuilder
      const initialContext = await promptBuilder.build(
        videoData.title,
        videoData.description,
        videoData.transcript,
        showSponsored,
        selectedSummaryLanguage != null,
        showSuggestedQuestions
      );

      if (!isMountedRef.current) return;

      store.setConversationHistory(initialContext);
      store.setIsInitialized(true);

      const controller = initializeStream();

      const reader = await apiAdapter.generateStreamResponse(
        initialContext,
        // We know controller is not null here because initializeStream always creates a new AbortController
        controller!.signal
      );

      if (!isMountedRef.current) return;

      if (reader) {
        await handleStreamResponse(reader);
      }
    } catch (error) {
      if (isMountedRef.current) {
        handleInitError(error as Error);
      }
    } finally {
      if (isMountedRef.current) {
        initializationRef.current = false;
      }
    }
  }, [videoId, apiKey, apiAdapter, promptAdapter, storageAdapter, store, initializeStream, handleStreamResponse, handleInitError]);

  // Handle cleanup when videoId changes
  useEffect(() => {
    if (videoId !== previousVideoIdRef.current) {
      cleanup();
      previousVideoIdRef.current = videoId;
    }
  }, [videoId, cleanup]);

  // Handle initialization after cleanup
  useEffect(() => {
    if (videoId && apiKey && !store.isInitialized && apiAdapter && !initializationRef.current) {
      // Use a microtask to ensure cleanup is complete
      Promise.resolve().then(() => {
        initializeChat();
      });
    }
  }, [videoId, apiKey, store.isInitialized, apiAdapter, initializeChat]);

  return {
    initializeChat
  };
}; 