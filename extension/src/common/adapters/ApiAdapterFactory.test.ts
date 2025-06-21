import { describe, it, expect, vi } from 'vitest';
import { ApiAdapterFactory } from './ApiAdapterFactory';
import { OpenRouterApiAdapter } from './ApiAdapter';
import { OpenAIApiAdapter } from './OpenAIApiAdapter';

describe('ApiAdapterFactory', () => {
  const mockGetModelPreferences = vi.fn().mockResolvedValue(['gpt-4']);

  describe('createAdapter', () => {
    it('should create OpenRouterApiAdapter for openrouter provider', () => {
      const adapter = ApiAdapterFactory.createAdapter(
        'openrouter',
        'sk-or-test-key',
        mockGetModelPreferences
      );
      
      expect(adapter).toBeInstanceOf(OpenRouterApiAdapter);
    });

    it('should create OpenAIApiAdapter for openai provider', () => {
      const adapter = ApiAdapterFactory.createAdapter(
        'openai',
        'sk-test-key',
        mockGetModelPreferences,
        'org-123'
      );
      
      expect(adapter).toBeInstanceOf(OpenAIApiAdapter);
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        ApiAdapterFactory.createAdapter(
          'unknown' as any,
          'test-key',
          mockGetModelPreferences
        );
      }).toThrow('Unknown provider: unknown');
    });
  });

  describe('validateProvider', () => {
    it('should return true for valid providers', () => {
      expect(ApiAdapterFactory.validateProvider('openrouter')).toBe(true);
      expect(ApiAdapterFactory.validateProvider('openai')).toBe(true);
    });

    it('should return false for invalid providers', () => {
      expect(ApiAdapterFactory.validateProvider('invalid')).toBe(false);
      expect(ApiAdapterFactory.validateProvider('')).toBe(false);
    });
  });

  describe('detectProviderFromApiKey', () => {
    it('should detect OpenRouter keys', () => {
      expect(ApiAdapterFactory.detectProviderFromApiKey('sk-or-test-123')).toBe('openrouter');
      expect(ApiAdapterFactory.detectProviderFromApiKey('sk-or-v1-abc')).toBe('openrouter');
    });

    it('should detect OpenAI keys', () => {
      expect(ApiAdapterFactory.detectProviderFromApiKey('sk-test123')).toBe('openai');
      expect(ApiAdapterFactory.detectProviderFromApiKey('sk-proj-abc')).toBe('openai');
    });

    it('should return null for invalid keys', () => {
      expect(ApiAdapterFactory.detectProviderFromApiKey('invalid-key')).toBe(null);
      expect(ApiAdapterFactory.detectProviderFromApiKey('')).toBe(null);
      expect(ApiAdapterFactory.detectProviderFromApiKey('pk-test')).toBe(null);
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return correct display names', () => {
      expect(ApiAdapterFactory.getProviderDisplayName('openrouter')).toBe('OpenRouter');
      expect(ApiAdapterFactory.getProviderDisplayName('openai')).toBe('OpenAI');
    });
  });

  describe('transformModelName', () => {
    it('should not transform when providers are the same', () => {
      expect(ApiAdapterFactory.transformModelName('gpt-4', 'openai', 'openai')).toBe('gpt-4');
      expect(ApiAdapterFactory.transformModelName('openai/gpt-4', 'openrouter', 'openrouter')).toBe('openai/gpt-4');
    });

    it('should transform from OpenRouter to OpenAI format', () => {
      expect(ApiAdapterFactory.transformModelName('openai/gpt-4', 'openrouter', 'openai')).toBe('gpt-4');
      expect(ApiAdapterFactory.transformModelName('openai/gpt-3.5-turbo', 'openrouter', 'openai')).toBe('gpt-3.5-turbo');
      
      // Non-OpenAI models should not be transformed
      expect(ApiAdapterFactory.transformModelName('anthropic/claude-3', 'openrouter', 'openai')).toBe('anthropic/claude-3');
    });

    it('should transform from OpenAI to OpenRouter format', () => {
      expect(ApiAdapterFactory.transformModelName('gpt-4', 'openai', 'openrouter')).toBe('openai/gpt-4');
      expect(ApiAdapterFactory.transformModelName('gpt-3.5-turbo', 'openai', 'openrouter')).toBe('openai/gpt-3.5-turbo');
      expect(ApiAdapterFactory.transformModelName('gpt-4o-mini', 'openai', 'openrouter')).toBe('openai/gpt-4o-mini');
      
      // Unknown models should not be transformed
      expect(ApiAdapterFactory.transformModelName('custom-model', 'openai', 'openrouter')).toBe('custom-model');
    });
  });

  describe('validateApiKeyForProvider', () => {
    it('should validate matching OpenRouter key and provider', () => {
      const result = ApiAdapterFactory.validateApiKeyForProvider('sk-or-test-123', 'openrouter');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should validate matching OpenAI key and provider', () => {
      const result = ApiAdapterFactory.validateApiKeyForProvider('sk-test-123', 'openai');
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('should reject invalid key format', () => {
      const result = ApiAdapterFactory.validateApiKeyForProvider('invalid-key', 'openai');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid API key format');
    });

    it('should reject mismatched OpenRouter key with OpenAI provider', () => {
      const result = ApiAdapterFactory.validateApiKeyForProvider('sk-or-test-123', 'openai');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('This appears to be a OpenRouter API key');
      expect(result.message).toContain('but OpenAI is selected');
    });

    it('should reject mismatched OpenAI key with OpenRouter provider', () => {
      const result = ApiAdapterFactory.validateApiKeyForProvider('sk-test-123', 'openrouter');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('This appears to be a OpenAI API key');
      expect(result.message).toContain('but OpenRouter is selected');
    });
  });
});