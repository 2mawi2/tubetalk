import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMessagesInitialization } from '../hooks/useMessagesInitialization';
import { useMessagesStore } from '../store/messagesStore';
import { videoDataService } from '../../common/services/VideoDataService';
import type { Prompts } from '../../common/adapters/PromptAdapter';

vi.mock('../../common/services/VideoDataService', () => ({
  videoDataService: {
    fetchVideoData: vi.fn()
  }
}));

describe('useMessagesInitialization', () => {
  const mockApiAdapter = {
    generateStreamResponse: vi.fn()
  };

  const mockPrompts: Prompts = {
    system: 'System prompt',
    sponsored: 'Sponsored prompt',
    suggestedQuestions: 'Suggested questions prompt'
  };

  const mockPromptAdapter = {
    getPrompts: vi.fn().mockResolvedValue(mockPrompts)
  };

  const mockStorageAdapter = {
    getShowSponsored: vi.fn().mockResolvedValue(false),
    getSelectedSummaryLanguage: vi.fn().mockResolvedValue('en'),
    getShowSuggestedQuestions: vi.fn().mockResolvedValue(false)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useMessagesStore.setState({
      messages: [],
      isStreaming: false,
      isInitialized: false,
      currentMessageId: null,
      conversationHistory: [],
      shouldAutoScroll: true,
      hasError: false,
      streamController: null
    });
  });

  it('should initialize chat when videoId and apiKey are provided', async () => {
    vi.mocked(videoDataService.fetchVideoData).mockResolvedValueOnce({
      transcript: 'Test transcript',
      title: 'Test title',
      description: 'Test description',
      videoId: 'test-video',
      timestamp: 0
    });

    const mockReader = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Test response"}}]}\n\n'));
        controller.close();
      }
    }).getReader();

    mockApiAdapter.generateStreamResponse.mockResolvedValueOnce(mockReader);

    await act(async () => {
      renderHook(() => useMessagesInitialization({
        videoId: 'test-video',
        apiKey: 'test-key',
        apiAdapter: mockApiAdapter,
        promptAdapter: mockPromptAdapter,
        storageAdapter: mockStorageAdapter
      }));

      // Wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const store = useMessagesStore.getState();
    expect(store.isInitialized).toBe(true);
    expect(videoDataService.fetchVideoData).toHaveBeenCalledWith('test-video');
    expect(mockApiAdapter.generateStreamResponse).toHaveBeenCalled();
    expect(mockPromptAdapter.getPrompts).toHaveBeenCalled();
  });

  it('should handle initialization errors', async () => {
    vi.mocked(videoDataService.fetchVideoData).mockRejectedValueOnce(new Error('Fetch error'));

    await act(async () => {
      renderHook(() => useMessagesInitialization({
        videoId: 'test-video',
        apiKey: 'test-key',
        apiAdapter: mockApiAdapter,
        promptAdapter: mockPromptAdapter,
        storageAdapter: mockStorageAdapter
      }));

      // Wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const store = useMessagesStore.getState();
    expect(store.isInitialized).toBe(true);
    expect(store.hasError).toBe(true);
    expect(store.messages[0]?.error).toBe(true);
    expect(store.messages[0]?.content).toContain('Fetch error');
  });

  it('should not initialize without videoId or apiKey', async () => {
    await act(async () => {
      renderHook(() => useMessagesInitialization({
        videoId: '',
        apiKey: '',
        apiAdapter: mockApiAdapter,
        promptAdapter: mockPromptAdapter,
        storageAdapter: mockStorageAdapter
      }));

      // Wait for all promises to resolve
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    const store = useMessagesStore.getState();
    expect(store.isInitialized).toBe(false);
    expect(videoDataService.fetchVideoData).not.toHaveBeenCalled();
  });
}); 