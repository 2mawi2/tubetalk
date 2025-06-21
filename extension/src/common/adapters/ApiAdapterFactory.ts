import { ApiAdapter } from './ApiAdapter';
import { OpenRouterApiAdapter } from './ApiAdapter';
import { OpenAIApiAdapter } from './OpenAIApiAdapter';
import type { ProviderType } from '../../storage/types';

export class ApiAdapterFactory {
  static createAdapter(
    provider: ProviderType,
    apiKey: string,
    getModelPreferences: () => Promise<string[]>,
    organizationId?: string
  ): ApiAdapter {
    switch (provider) {
      case 'openrouter':
        return new OpenRouterApiAdapter(apiKey, getModelPreferences);
      case 'openai':
        return new OpenAIApiAdapter(apiKey, organizationId);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  static validateProvider(provider: string): provider is ProviderType {
    return provider === 'openrouter' || provider === 'openai';
  }

  static detectProviderFromApiKey(apiKey: string): ProviderType | null {
    // OpenRouter keys typically start with 'sk-or-'
    if (apiKey.startsWith('sk-or-')) {
      return 'openrouter';
    }
    
    // OpenAI keys typically start with 'sk-'
    if (apiKey.startsWith('sk-') && !apiKey.startsWith('sk-or-')) {
      return 'openai';
    }
    
    return null;
  }

  static getProviderDisplayName(provider: ProviderType): string {
    switch (provider) {
      case 'openrouter':
        return 'OpenRouter';
      case 'openai':
        return 'OpenAI';
      default:
        return provider;
    }
  }

  static transformModelName(modelName: string, fromProvider: ProviderType, toProvider: ProviderType): string {
    // If providers are the same, no transformation needed
    if (fromProvider === toProvider) {
      return modelName;
    }

    // Transform from OpenRouter to OpenAI format
    if (fromProvider === 'openrouter' && toProvider === 'openai') {
      // OpenRouter uses format like "openai/gpt-4"
      // OpenAI uses format like "gpt-4"
      if (modelName.startsWith('openai/')) {
        return modelName.replace('openai/', '');
      }
      // Non-OpenAI models from OpenRouter can't be used with OpenAI
      return modelName;
    }

    // Transform from OpenAI to OpenRouter format
    if (fromProvider === 'openai' && toProvider === 'openrouter') {
      // Add the openai/ prefix if it's a known OpenAI model
      const openAIModels = [
        'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano',
        'gpt-4o', 'gpt-4o-mini', 'gpt-4o-audio', 'gpt-4o-mini-audio',
        'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo',
        'o1-preview', 'o1-mini', 'o3', 'o3-mini', 'o3-pro', 'o4-mini'
      ];
      if (openAIModels.some(model => modelName.startsWith(model))) {
        return `openai/${modelName}`;
      }
    }

    return modelName;
  }

  static validateApiKeyForProvider(apiKey: string, provider: ProviderType): { valid: boolean; message?: string } {
    const detectedProvider = this.detectProviderFromApiKey(apiKey);
    
    if (!detectedProvider) {
      return {
        valid: false,
        message: 'Invalid API key format. API key should start with "sk-" for OpenAI or "sk-or-" for OpenRouter.'
      };
    }

    if (detectedProvider !== provider) {
      return {
        valid: false,
        message: `This appears to be a ${this.getProviderDisplayName(detectedProvider)} API key, but ${this.getProviderDisplayName(provider)} is selected. Please update your provider selection or use the correct API key.`
      };
    }

    return { valid: true };
  }
}