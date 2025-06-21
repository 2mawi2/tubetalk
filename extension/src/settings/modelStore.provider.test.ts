import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelStore } from './modelStore';
import { DEFAULT_MODEL } from './settingsStorageAdapter';
import type { StorageAdapter } from '../storage/types';

// Mock storage adapter
const mockStorageAdapter: StorageAdapter = {
  getProviderApiKey: vi.fn(),
  setProviderApiKey: vi.fn(),
  hasProviderKey: vi.fn(),
  getCurrentProvider: vi.fn(),
  setCurrentProvider: vi.fn(),
  getProviderConfig: vi.fn(),
  setProviderConfig: vi.fn(),
  getProviderModelPreferences: vi.fn(),
  setProviderModelPreferences: vi.fn(),
  getCurrentProviderConfig: vi.fn(),
  migrateStorage: vi.fn(),
  
  // Legacy methods
  getApiKey: vi.fn(),
  setApiKey: vi.fn(),
  getModelPreferences: vi.fn(),
  setModelPreferences: vi.fn(),
  getDarkMode: vi.fn(),
  setDarkMode: vi.fn(),
  getShowSponsored: vi.fn(),
  setShowSponsored: vi.fn(),
  getSelectedLocale: vi.fn(),
  setSelectedLocale: vi.fn(),
  getSelectedSummaryLanguage: vi.fn(),
  setSelectedSummaryLanguage: vi.fn(),
  getShowSuggestedQuestions: vi.fn(),
  setShowSuggestedQuestions: vi.fn(),
};

// Mock API adapter factory
vi.mock('../common/adapters/ApiAdapterFactory', () => ({
  ApiAdapterFactory: {
    createApiAdapter: vi.fn().mockResolvedValue({
      fetchAvailableModels: vi.fn().mockResolvedValue([
        { id: 'gpt-4.1', name: 'GPT-4.1' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
      ]),
    }),
  },
}));

describe('ModelStore - Provider Switching', () => {
  let modelStore: ModelStore;

  beforeEach(() => {
    vi.clearAllMocks();
    modelStore = new ModelStore();
    
    // Setup default mocks
    mockStorageAdapter.migrateStorage = vi.fn().mockResolvedValue(undefined);
    mockStorageAdapter.getCurrentProvider = vi.fn().mockResolvedValue('openrouter');
    mockStorageAdapter.getProviderApiKey = vi.fn().mockResolvedValue('test-key');
    mockStorageAdapter.hasProviderKey = vi.fn().mockResolvedValue(true);
    mockStorageAdapter.setCurrentProvider = vi.fn().mockResolvedValue(undefined);
  });

  it('should always include default model for OpenRouter', async () => {
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockResolvedValue([
      DEFAULT_MODEL, 'anthropic/claude-3-opus'
    ]);

    await modelStore.setProvider('openrouter');
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.models).toContain(DEFAULT_MODEL);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);
  });

  it('should always include default model for OpenAI', async () => {
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockResolvedValue([
      DEFAULT_MODEL, 'gpt-4o-mini'
    ]);

    await modelStore.setProvider('openai');
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.models).toContain(DEFAULT_MODEL);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);
  });

  it('should properly switch between providers and maintain default model', async () => {
    // Setup different models for each provider
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockImplementation(async (provider) => {
      if (provider === 'openrouter') {
        return [DEFAULT_MODEL, 'anthropic/claude-3-opus'];
      } else {
        return [DEFAULT_MODEL, 'gpt-4o-mini'];
      }
    });

    // Start with OpenRouter
    await modelStore.setProvider('openrouter', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.currentProvider).toBe('openrouter');
    expect(modelStore.models).toEqual([DEFAULT_MODEL, 'anthropic/claude-3-opus']);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);

    // Switch to OpenAI
    await modelStore.setProvider('openai', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.currentProvider).toBe('openai');
    expect(modelStore.models).toEqual([DEFAULT_MODEL, 'gpt-4o-mini']);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);

    // Switch back to OpenRouter
    await modelStore.setProvider('openrouter', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.currentProvider).toBe('openrouter');
    expect(modelStore.models).toContain(DEFAULT_MODEL);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);
  });

  it('should ensure default model even when not in storage', async () => {
    // Mock storage that doesn't include default model
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockResolvedValue([
      'gpt-4o-mini', 'anthropic/claude-3-opus'
    ]);

    await modelStore.setProvider('openai', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.models).toContain(DEFAULT_MODEL);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);
    expect(modelStore.models).toContain(DEFAULT_MODEL);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);
  });

  it('should clear available models when switching providers', async () => {
    // Set up initial state with available models
    modelStore.availableModels = [
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' }
    ];

    await modelStore.setProvider('openai', mockStorageAdapter);

    expect(modelStore.availableModels).toEqual([]);
  });

  it('should handle provider switching without API key', async () => {
    mockStorageAdapter.getProviderApiKey = vi.fn().mockResolvedValue(null);
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockResolvedValue([
      DEFAULT_MODEL, 'gpt-4o-mini'
    ]);

    await modelStore.setProvider('openai', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    expect(modelStore.models).toContain(DEFAULT_MODEL);
    expect(modelStore.models[0]).toBe(DEFAULT_MODEL);
    expect(modelStore.availableModels).toEqual([]);
  });

  it('should not allow adding default model as custom model', async () => {
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockResolvedValue([DEFAULT_MODEL]);
    
    await modelStore.setProvider('openai', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    // Try to add the default model
    await modelStore.addModel(DEFAULT_MODEL);

    expect(modelStore.error?.message).toBe('duplicateModelError');
    expect(modelStore.inputError).toBe(true);
  });

  it('should not allow removing default model', async () => {
    mockStorageAdapter.getProviderModelPreferences = vi.fn().mockResolvedValue([
      DEFAULT_MODEL, 'gpt-4o-mini'
    ]);
    
    await modelStore.setProvider('openai', mockStorageAdapter);
    await modelStore.init(mockStorageAdapter);

    const initialModels = [...modelStore.models];

    // Try to remove the default model
    await modelStore.removeModel(DEFAULT_MODEL);

    // Models should be unchanged
    expect(modelStore.models).toEqual(initialModels);
    expect(modelStore.models).toContain(DEFAULT_MODEL);
  });

  it('should update storage when provider changes', async () => {
    await modelStore.setProvider('openai', mockStorageAdapter);

    expect(mockStorageAdapter.setCurrentProvider).toHaveBeenCalledWith('openai');
  });
});