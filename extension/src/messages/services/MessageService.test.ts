import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageService } from './MessageService';
import { VideoDataBuilder } from '../../test/builders/VideoDataBuilder';
import type { ConversationMessage } from '../../common/adapters/ApiAdapter';
import { ContentModerationVideoDataError } from '../../common/errors/VideoDataError';
import { videoDataService } from '../../common/services/VideoDataService';

// Mock videoDataService
vi.mock('../../common/services/VideoDataService', () => ({
  videoDataService: {
    fetchVideoData: vi.fn()
  }
}));

describe('MessageService', () => {
  const mockApiAdapter = {
    generateStreamResponse: vi.fn(),
    fetchAvailableModels: vi.fn().mockResolvedValue([])
  };

  const mockPromptAdapter = {
    getPrompts: vi.fn(),
    buildSuggestedQuestionsPrompt: vi.fn()
  };

  const mockStorageAdapter = {
    getSelectedSummaryLanguage: vi.fn(),
    getShowSponsored: vi.fn(),
    getShowSuggestedQuestions: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize stream and cleanup properly', () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    
    const controller = service.initializeStream();
    expect(controller).toBeInstanceOf(AbortController);
    
    service.cleanup();
    expect(controller.signal.aborted).toBe(true);
  });

  it('should handle user message', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    const mockReader = { read: vi.fn() } as unknown as ReadableStreamDefaultReader<Uint8Array>;
    mockApiAdapter.generateStreamResponse.mockResolvedValue(mockReader);

    const message = 'test message';
    const conversationHistory: ConversationMessage[] = [{ role: 'user' as const, content: 'previous message' }];

    const reader = await service.handleUserMessage(message, conversationHistory);
    
    expect(mockApiAdapter.generateStreamResponse).toHaveBeenCalledWith(
      [...conversationHistory, { role: 'user' as const, content: message }],
      expect.any(AbortSignal)
    );
    expect(reader).toBe(mockReader);
  });

  it('should process stream response', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
        })
        .mockResolvedValueOnce({ 
          done: false, 
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":" World"}}]}\n\n')
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn(),
      closed: Promise.resolve(undefined),
      cancel: vi.fn()
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const onContent = vi.fn();
    const result = await service.processStreamResponse(mockReader, onContent);

    expect(result).toBe('Hello World');
    expect(onContent).toHaveBeenCalledWith('Hello', 'Hello');
    expect(onContent).toHaveBeenCalledWith(' World', 'Hello World');
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('should handle content moderation errors', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"error":{"code":403,"message":"Content blocked","metadata":{"reasons":["sexual"]}}}\n\n')
        }),
      releaseLock: vi.fn()
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const onContent = vi.fn();
    const onError = vi.fn();
    const result = await service.processStreamResponse(mockReader, onContent, onError);

    expect(result).toBe('');
    expect(onError).toHaveBeenCalledWith(expect.any(ContentModerationVideoDataError));
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('should handle abort errors gracefully', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    const mockReader = {
      read: vi.fn()
        .mockRejectedValueOnce(new DOMException('AbortError', 'AbortError')),
      releaseLock: vi.fn()
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const onContent = vi.fn();
    const result = await service.processStreamResponse(mockReader, onContent);

    expect(result).toBe('');
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('should handle invalid JSON data', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: invalid json\n\n')
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn()
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const onContent = vi.fn();
    const result = await service.processStreamResponse(mockReader, onContent);

    expect(result).toBe('');
    expect(onContent).not.toHaveBeenCalled();
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('should handle partial chunks correctly', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(' World"}}]}\n\n')
        })
        .mockResolvedValueOnce({ done: true }),
      releaseLock: vi.fn()
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;

    const onContent = vi.fn();
    const result = await service.processStreamResponse(mockReader, onContent);

    expect(result).toBe('Hello World');
    expect(onContent).toHaveBeenCalledWith('Hello World', 'Hello World');
    expect(mockReader.releaseLock).toHaveBeenCalled();
  });

  it('should abort the stream when cleanup is called', async () => {
    const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
    
    // Create a controller first
    const controller = service.initializeStream();
    const abortSpy = vi.spyOn(controller, 'abort');
    
    service.cleanup();
    expect(abortSpy).toHaveBeenCalled();
  });

  describe('getSuggestedQuestions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // Ensure buildSuggestedQuestionsPrompt is a function
      mockPromptAdapter.buildSuggestedQuestionsPrompt = vi.fn().mockResolvedValue([]);
    });

    it('should return empty array when showSuggestedQuestions is false', async () => {
      mockStorageAdapter.getShowSuggestedQuestions.mockResolvedValue(false);
      
      const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
      const result = await service.getSuggestedQuestions('video123', 'summary text');
      
      expect(result).toEqual([]);
      expect(mockApiAdapter.generateStreamResponse).not.toHaveBeenCalled();
    });

    it('should return empty array when promptAdapter does not implement buildSuggestedQuestionsPrompt', async () => {
      mockStorageAdapter.getShowSuggestedQuestions.mockResolvedValue(true);
      
      // Create a new mock prompt adapter without the buildSuggestedQuestionsPrompt method
      const promptAdapterWithoutMethod = {
        ...mockPromptAdapter,
        buildSuggestedQuestionsPrompt: undefined
      };
      
      const service = new MessageService(mockApiAdapter, promptAdapterWithoutMethod, mockStorageAdapter);
      const result = await service.getSuggestedQuestions('video123', 'summary text');
      
      expect(result).toEqual([]);
      expect(mockApiAdapter.generateStreamResponse).not.toHaveBeenCalled();
    });

    it('should process suggested questions correctly', async () => {
      // Setup
      mockStorageAdapter.getShowSuggestedQuestions.mockResolvedValue(true);
      
      mockPromptAdapter.buildSuggestedQuestionsPrompt = vi.fn().mockResolvedValue([
        { role: 'system', content: 'Generate questions' },
        { role: 'user', content: 'Based on the summary' }
      ]);
      
      // Mock the video data
      videoDataService.fetchVideoData = vi.fn().mockResolvedValue({
        title: 'Test Video',
        description: 'Test Description',
        transcript: 'Test Transcript'
      });
      
      // Setup mock stream reader
      const mockReader = {
        read: vi.fn().mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"{\\"questions\\":["}}]}\n')
        }).mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"\\"Question 1\\""}}]}\n')
        }).mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":","}}]}\n')
        }).mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"\\"Question 2\\""}}]}\n')
        }).mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"]}"}}]}\n')
        }).mockResolvedValueOnce({
          done: true
        }),
        releaseLock: vi.fn()
      };
      
      mockApiAdapter.generateStreamResponse.mockResolvedValue(mockReader);
      
      // Execute
      const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
      const result = await service.getSuggestedQuestions('video123', 'summary text');
      
      // Verify
      expect(mockApiAdapter.generateStreamResponse).toHaveBeenCalled();
      expect(mockPromptAdapter.buildSuggestedQuestionsPrompt).toHaveBeenCalledWith(
        'Test Video',
        'Test Description',
        'Test Transcript',
        'summary text'
      );
      expect(result).toEqual(['Question 1', 'Question 2']);
      expect(mockReader.releaseLock).toHaveBeenCalled();
    });

    it('should return empty array when no reader is returned', async () => {
      mockStorageAdapter.getShowSuggestedQuestions.mockResolvedValue(true);
      mockPromptAdapter.buildSuggestedQuestionsPrompt = vi.fn().mockResolvedValue([]);
      mockApiAdapter.generateStreamResponse.mockResolvedValue(null);
      
      const service = new MessageService(mockApiAdapter, mockPromptAdapter, mockStorageAdapter);
      const result = await service.getSuggestedQuestions('video123', 'summary text');
      
      expect(result).toEqual([]);
    });
  });
}); 
