import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIApiAdapter } from './OpenAIApiAdapter';
import type { ConversationMessage } from './ApiAdapter';

// Mock fetch globally
global.fetch = vi.fn();

describe('OpenAIApiAdapter', () => {
  let adapter: OpenAIApiAdapter;
  const mockApiKey = 'test-api-key';
  const mockOrgId = 'test-org-id';

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new OpenAIApiAdapter(mockApiKey, mockOrgId);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchAvailableModels', () => {
    it('should fetch and filter OpenAI models from API', async () => {
      const mockResponse = {
        data: [
          // Text chat models that should be included
          { id: 'gpt-4o', created: 123456 },
          { id: 'gpt-4o-mini', created: 123456 },
          { id: 'gpt-4-turbo', created: 123456 },
          { id: 'gpt-3.5-turbo', created: 123456 },
          { id: 'o1-preview', created: 123456 },
          { id: 'o1-mini', created: 123456 },
          { id: 'o3', created: 123456 },
          { id: 'o3-mini', created: 123456 },
          
          // Models that should be filtered out
          { id: 'gpt-3.5-turbo-instruct', created: 123456 }, // instruct model
          { id: 'gpt-4-0125-preview', created: 123456 }, // dated version
          { id: 'text-davinci-003', created: 123456 }, // legacy completion
          { id: 'whisper-1', created: 123456 }, // audio model
          { id: 'dall-e-3', created: 123456 }, // image model
          { id: 'dall-e-2', created: 123456 }, // image model
          { id: 'text-embedding-3-large', created: 123456 }, // embedding model
          { id: 'text-embedding-3-small', created: 123456 }, // embedding model
          { id: 'text-embedding-ada-002', created: 123456 }, // embedding model
          { id: 'text-moderation-latest', created: 123456 }, // moderation model
          { id: 'gpt-image-1', created: 123456 }, // image model
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const models = await adapter.fetchAvailableModels();
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockApiKey}`,
          'OpenAI-Organization': mockOrgId
        }
      });

      expect(models).toHaveLength(8); // Should include 8 text chat models
      expect(models).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'gpt-4o',
          name: 'GPT-4o',
          context_length: 128000
        }),
        expect.objectContaining({
          id: 'gpt-4o-mini',
          name: 'GPT-4o Mini',
          context_length: 128000
        }),
        expect.objectContaining({
          id: 'gpt-4-turbo',
          name: 'GPT-4 Turbo',
          context_length: 128000
        }),
        expect.objectContaining({
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5 Turbo',
          context_length: 16385
        }),
        expect.objectContaining({
          id: 'o1-preview',
          name: 'o1 Preview',
          context_length: 128000
        }),
        expect.objectContaining({
          id: 'o1-mini',
          name: 'o1 Mini',
          context_length: 128000
        }),
        expect.objectContaining({
          id: 'o3',
          name: 'o3',
          context_length: 200000
        }),
        expect.objectContaining({
          id: 'o3-mini',
          name: 'o3 Mini',
          context_length: 128000
        })
      ]));
      
      // Verify excluded models are not in the results
      const modelIds = models.map(m => m.id);
      expect(modelIds).not.toContain('whisper-1');
      expect(modelIds).not.toContain('dall-e-3');
      expect(modelIds).not.toContain('dall-e-2');
      expect(modelIds).not.toContain('text-embedding-3-large');
      expect(modelIds).not.toContain('text-embedding-ada-002');
      expect(modelIds).not.toContain('text-moderation-latest');
      expect(modelIds).not.toContain('gpt-3.5-turbo-instruct');
      expect(modelIds).not.toContain('gpt-4-0125-preview');
      expect(modelIds).not.toContain('text-davinci-003');
      expect(modelIds).not.toContain('gpt-image-1');
    });

    it('should properly filter out non-text chat models', async () => {
      const mockResponse = {
        data: [
          // These should be included
          { id: 'gpt-4o', created: 123456 },
          { id: 'o1-preview', created: 123456 },
          
          // These should be excluded
          { id: 'whisper-1', created: 123456 },
          { id: 'dall-e-3', created: 123456 },
          { id: 'text-embedding-3-large', created: 123456 },
          { id: 'text-moderation-stable', created: 123456 },
          { id: 'text-davinci-003', created: 123456 },
          { id: 'gpt-3.5-turbo-instruct', created: 123456 },
          { id: 'gpt-4-0125-preview', created: 123456 },
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const models = await adapter.fetchAvailableModels();
      
      expect(models).toHaveLength(2);
      expect(models.map(m => m.id)).toEqual(['o1-preview', 'gpt-4o']); // Sorted order
      
      // Verify all excluded models are not present
      const modelIds = models.map(m => m.id);
      ['whisper-1', 'dall-e-3', 'text-embedding-3-large', 'text-moderation-stable', 
       'text-davinci-003', 'gpt-3.5-turbo-instruct', 'gpt-4-0125-preview'].forEach(excludedId => {
        expect(modelIds).not.toContain(excludedId);
      });
    });

    it('should handle future models dynamically without hardcoding', async () => {
      const mockResponse = {
        data: [
          // Future models that should be included (hypothetical)
          { id: 'gpt-5', created: 123456 },
          { id: 'gpt-4o-ultra', created: 123456 },
          { id: 'o5-mini', created: 123456 },
          { id: 'gpt-10-turbo', created: 123456 },
          
          // Future models that should be excluded
          { id: 'gpt-5-instruct', created: 123456 }, // instruct variant
          { id: 'whisper-v3', created: 123456 }, // audio model
          { id: 'dall-e-4', created: 123456 }, // image model
          { id: 'text-embedding-4-large', created: 123456 }, // embedding model
          { id: 'gpt-6-0425-preview', created: 123456 }, // deprecated version pattern
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const models = await adapter.fetchAvailableModels();
      
      // Should include future chat models
      const modelIds = models.map(m => m.id);
      expect(modelIds).toContain('gpt-5');
      expect(modelIds).toContain('gpt-4o-ultra');
      expect(modelIds).toContain('o5-mini');
      expect(modelIds).toContain('gpt-10-turbo');
      
      // Should exclude non-chat models
      expect(modelIds).not.toContain('gpt-5-instruct');
      expect(modelIds).not.toContain('whisper-v3');
      expect(modelIds).not.toContain('dall-e-4');
      expect(modelIds).not.toContain('text-embedding-4-large');
      expect(modelIds).not.toContain('gpt-6-0425-preview');
      
      expect(models).toHaveLength(4); // Only the 4 future chat models
    });

    it('should handle API errors and return fallback models', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const models = await adapter.fetchAvailableModels();
      
      expect(models).toHaveLength(4);
      expect(models[0].id).toBe('gpt-4.1');
    });

    it('should handle 401 unauthorized error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } })
      });

      // Should return fallback models on error
      const models = await adapter.fetchAvailableModels();
      expect(models).toHaveLength(4);
      expect(models[0].id).toBe('gpt-4.1');
    });

    it('should cache models for 5 minutes', async () => {
      const mockResponse = {
        data: [
          { id: 'gpt-4o', created: 123456 }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call
      await adapter.fetchAvailableModels();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await adapter.fetchAvailableModels();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should work without organization ID', async () => {
      const adapterNoOrg = new OpenAIApiAdapter(mockApiKey);
      const mockResponse = {
        data: [
          { id: 'gpt-4o', created: 123456 }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await adapterNoOrg.fetchAvailableModels();
      
      expect(global.fetch).toHaveBeenCalledWith('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockApiKey}`
        }
      });
    });

    it('should require API key', async () => {
      const adapterNoKey = new OpenAIApiAdapter('');
      
      // Should return fallback models when no API key
      const models = await adapterNoKey.fetchAvailableModels();
      expect(models).toHaveLength(4);
      expect(models[0].id).toBe('gpt-4.1');
    });
  });

  describe('generateStreamResponse', () => {
    const mockMessages: ConversationMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, how are you?' }
    ];

    it('should make request to OpenAI API with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'));
            controller.close();
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await adapter.generateStreamResponse(mockMessages);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`,
            'OpenAI-Organization': mockOrgId
          }),
          body: expect.stringContaining('"stream":true')
        })
      );
    });

    it('should handle API errors with proper error messages', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'Invalid API key',
            type: 'invalid_api_key'
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

      await expect(adapter.generateStreamResponse(mockMessages))
        .rejects.toThrow('Invalid OpenAI API key');
    });

    it('should handle insufficient quota error', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 402,
        statusText: 'Payment Required',
        json: vi.fn().mockResolvedValue({
          error: {
            message: 'You exceeded your current quota',
            type: 'insufficient_quota'
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

      await expect(adapter.generateStreamResponse(mockMessages))
        .rejects.toThrow('insufficient quota');
    });

    it('should handle rate limit errors', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: vi.fn().mockResolvedValue(null)
      };

      (global.fetch as any).mockResolvedValueOnce(mockErrorResponse);

      await expect(adapter.generateStreamResponse(mockMessages))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle abort signal', async () => {
      const abortController = new AbortController();
      const error = new Error('Aborted');
      error.name = 'AbortError';

      (global.fetch as any).mockRejectedValueOnce(error);

      const result = await adapter.generateStreamResponse(mockMessages, abortController.signal);
      expect(result).toBeNull();
    });

    it('should retry when API key is missing', async () => {
      const adapterWithoutKey = new OpenAIApiAdapter('');
      
      // First call should throw after retries
      await expect(adapterWithoutKey.generateStreamResponse(mockMessages))
        .rejects.toThrow('OpenAI API key is required');
    });

    it('should not include organization header when org ID is not provided', async () => {
      const adapterWithoutOrg = new OpenAIApiAdapter(mockApiKey);
      
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.close();
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      await adapterWithoutOrg.generateStreamResponse(mockMessages);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'OpenAI-Organization': expect.any(String)
          })
        })
      );
    });
  });

  describe('stream transformation', () => {
    it('should properly handle streaming data', async () => {
      const mockStreamData = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n',
        'data: [DONE]\n'
      ];

      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            mockStreamData.forEach(data => {
              controller.enqueue(new TextEncoder().encode(data));
            });
            controller.close();
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const reader = await adapter.generateStreamResponse([
        { role: 'user', content: 'Test' }
      ]);

      expect(reader).not.toBeNull();
      
      // Read the stream
      const chunks: string[] = [];
      const decoder = new TextDecoder();
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(decoder.decode(value));
      }

      // Verify that data was passed through
      expect(chunks.join('')).toContain('Hello');
      expect(chunks.join('')).toContain('world');
    });

    it('should handle streaming errors', async () => {
      const mockResponse = {
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"error":{"message":"Stream error","type":"stream_error"}}\n'));
          }
        })
      };

      (global.fetch as any).mockResolvedValueOnce(mockResponse);

      const reader = await adapter.generateStreamResponse([
        { role: 'user', content: 'Test' }
      ]);

      // Try to read from the stream - it should throw an error
      await expect(reader!.read()).rejects.toThrow('Stream error');
    });
  });
});