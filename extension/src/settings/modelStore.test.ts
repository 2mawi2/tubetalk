import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configure, runInAction } from 'mobx'
import type { ApiAdapter, OpenRouterModel } from '../common/adapters/ApiAdapter'

// Mock the storage adapter
vi.mock('./settingsStorageAdapter', () => {
  return {
    DEFAULT_MODEL: 'openai/gpt-4.1',
    settingsStorageAdapter: {
      getCustomModels: vi.fn(),
      setCustomModels: vi.fn(),
      getApiKey: vi.fn()
    }
  }
})

// Mock the storage adapter module
vi.mock('../storage/storageAdapter', () => {
  return {
    storageAdapter: {
      getCurrentProvider: vi.fn(() => Promise.resolve('openrouter')),
      getProviderApiKey: vi.fn(),
      getProviderModelPreferences: vi.fn(() => Promise.resolve(['openai/gpt-4.1'])),
      setProviderModelPreferences: vi.fn(),
      setCurrentProvider: vi.fn()
    }
  }
})

// Mock the API adapters
vi.mock('../common/adapters/ApiAdapter')
vi.mock('../common/adapters/OpenAIApiAdapter')

// Import after mocks
import { ModelStore } from './modelStore'

// Configure MobX for strict mode
configure({
  enforceActions: 'always',
})

// Reference to the mocked object for test usage
const mockSettingsStorageAdapter = vi.mocked(
  (await import('./settingsStorageAdapter')).settingsStorageAdapter
)

class TestApiAdapter implements ApiAdapter {
  async generateStreamResponse() {
    return null
  }

  async fetchAvailableModels(): Promise<OpenRouterModel[]> {
    return [
      {
        id: 'test-model',
        name: 'Test Model',
        context_length: 4096,
        pricing: {
          prompt: '0.000001',
          completion: '0.000002',
          image: '0',
          request: '0'
        }
      }
    ]
  }
}

// Sample models for testing
const sampleModels = [
  {
    id: 'openai/gpt-4.1',
    name: 'Gemini 2.0 Flash',
    context_length: 4096,
    pricing: {
      prompt: '0.00025',
      completion: '0.00125',
      image: '0',
      request: '0'
    }
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    context_length: 4096,
    pricing: {
      prompt: '0.0015',
      completion: '0.0015',
      image: '0',
      request: '0'
    }
  },
  {
    id: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    context_length: 4096,
    pricing: {
      prompt: '0.00025',
      completion: '0.00125',
      image: '0',
      request: '0'
    }
  }
];

// Import storage adapter mock
const mockStorageAdapter = vi.mocked(
  (await import('../storage/storageAdapter')).storageAdapter
)

// Import API adapter mocks
const { OpenRouterApiAdapter } = await import('../common/adapters/ApiAdapter')
const { OpenAIApiAdapter } = await import('../common/adapters/OpenAIApiAdapter')

describe('ModelStore', () => {
  let modelStore: ModelStore
  let storedModels: string[] = []
  
  const mockOpenRouterAdapter = {
    fetchAvailableModels: vi.fn(),
    generateStreamResponse: vi.fn()
  }
  
  const mockOpenAIAdapter = {
    fetchAvailableModels: vi.fn(),
    generateStreamResponse: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    storedModels = []
    
    // Mock adapter constructors
    vi.mocked(OpenRouterApiAdapter).mockImplementation(() => mockOpenRouterAdapter as any)
    vi.mocked(OpenAIApiAdapter).mockImplementation(() => mockOpenAIAdapter as any)
    
    // Reset mock implementations for old storage adapter (still used by some tests)
    mockSettingsStorageAdapter.getCustomModels.mockImplementation(async () => {
      if (storedModels.length > 0) {
        return ['openai/gpt-4.1', ...storedModels]
      }
      return ['openai/gpt-4.1']
    })
    
    mockSettingsStorageAdapter.setCustomModels.mockImplementation(async (models: string[]) => {
      storedModels = [...models]
      return Promise.resolve()
    })
    
    // Mock new storage adapter
    mockStorageAdapter.getCurrentProvider.mockResolvedValue('openrouter')
    mockStorageAdapter.getProviderApiKey.mockImplementation(async (provider) => {
      return provider === 'openrouter' ? 'openrouter-key' : 'openai-key'
    })
    mockStorageAdapter.getProviderModelPreferences.mockImplementation(async () => {
      if (storedModels.length > 0) {
        return ['openai/gpt-4.1', ...storedModels]
      }
      return ['openai/gpt-4.1']
    })
    mockStorageAdapter.setProviderModelPreferences.mockImplementation(async (provider, models) => {
      storedModels = models.filter(m => m !== 'openai/gpt-4.1')
      return Promise.resolve()
    })
    mockStorageAdapter.setCurrentProvider.mockResolvedValue(undefined)
    
    // Mock the available models
    mockOpenRouterAdapter.fetchAvailableModels.mockResolvedValue([
      {
        id: 'openai/gpt-4.1',
        name: 'Gemini 2.0 Flash',
        context_length: 4096,
        pricing: { prompt: '0.0001', completion: '0.0001', image: '0', request: '0' }
      },
      {
        id: 'test-model',
        name: 'Test Model',
        context_length: 4096,
        pricing: { prompt: '0.0001', completion: '0.0001', image: '0', request: '0' }
      }
    ])
    
    mockOpenAIAdapter.fetchAvailableModels.mockResolvedValue([
      {
        id: 'gpt-4',
        name: 'GPT-4',
        context_length: 8192,
        pricing: { prompt: '0', completion: '0', image: '0', request: '0' }
      }
    ])
    
    modelStore = new ModelStore()
  })

  it('initializes with default model', async () => {
    await modelStore.init()
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    expect(mockStorageAdapter.getCurrentProvider).toHaveBeenCalled()
    expect(mockStorageAdapter.getProviderModelPreferences).toHaveBeenCalled()
  })

  it('loads custom models on init', async () => {
    const customModel = 'test-model'
    storedModels = [customModel]
    
    await modelStore.init()
    expect(modelStore.models).toEqual(['openai/gpt-4.1', customModel])
  })

  it('prevents adding duplicate models', async () => {
    await modelStore.init()
    
    // Try to add the default model
    await modelStore.addModel('openai/gpt-4.1')
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    expect(modelStore.error).toEqual({ message: 'duplicateModelError' })
    
    // Add a custom model
    const customModel = 'test-model'
    await modelStore.addModel(customModel)
    expect(modelStore.models).toEqual(['openai/gpt-4.1', customModel])
    expect(modelStore.error).toBeNull()
    
    // Try to add the same custom model again
    await modelStore.addModel(customModel)
    expect(modelStore.models).toEqual(['openai/gpt-4.1', customModel])
    expect(modelStore.error).toEqual({ message: 'duplicateModelError' })
  })

  it('successfully adds and removes custom models', async () => {
    await modelStore.init()
    const customModel = 'test-model'
    
    // Add model
    await modelStore.addModel(customModel)
    expect(modelStore.models).toEqual(['openai/gpt-4.1', customModel])
    expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledWith('openrouter', ['openai/gpt-4.1', customModel])
    
    // Remove model
    await modelStore.removeModel(customModel)
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledWith('openrouter', ['openai/gpt-4.1'])
  })

  it('prevents removing the default model', async () => {
    await modelStore.init()
    
    await modelStore.removeModel('openai/gpt-4.1')
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    // Should not call setProviderModelPreferences when trying to remove default model
    expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledTimes(0)
  })

  it('handles empty input gracefully', async () => {
    await modelStore.init()
    await modelStore.addModel('')
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    expect(modelStore.error).toBeNull()
  })

  it('clears error when requested', async () => {
    await modelStore.init()
    
    // Set error by adding duplicate
    await modelStore.addModel('openai/gpt-4.1')
    expect(modelStore.error).toEqual({ message: 'duplicateModelError' })
    
    // Clear error
    modelStore.clearError()
    expect(modelStore.error).toBeNull()
  })

  it('provides custom models list without default model', async () => {
    await modelStore.init()
    const customModel = 'test-model'
    
    await modelStore.addModel(customModel)
    expect(modelStore.customModels).toEqual([customModel])
  })

  it('persists models across store instances', async () => {
    // First instance adds a model
    const store1 = new ModelStore()
    await store1.init()
    await store1.addModel('test-model')

    // Second instance should load the same models
    const store2 = new ModelStore()
    await store2.init()
    expect(store2.models).toEqual(['openai/gpt-4.1', 'test-model'])
  })

  describe('Provider-specific model management', () => {
    beforeEach(() => {
      // Setup separate model storage for each provider
      const providerModels: Record<string, string[]> = {
        openrouter: ['openai/gpt-4.1'],
        openai: ['gpt-4-turbo-preview', 'gpt-3.5-turbo']
      }

      mockStorageAdapter.getProviderModelPreferences.mockImplementation(async (provider) => {
        return providerModels[provider] || ['openai/gpt-4.1']
      })

      mockStorageAdapter.setProviderModelPreferences.mockImplementation(async (provider, models) => {
        providerModels[provider] = models
        return Promise.resolve()
      })
    })

    it('should load models for current provider on init', async () => {
      // Start with openrouter
      mockStorageAdapter.getCurrentProvider.mockResolvedValue('openrouter')
      
      await modelStore.init()
      expect(modelStore.models).toEqual(['openai/gpt-4.1'])
      expect(modelStore.currentProvider).toBe('openrouter')
    })

    it('should switch models when provider changes', async () => {
      await modelStore.init()
      
      // Add a model to openrouter
      await modelStore.addModel('anthropic/claude-3-haiku')
      expect(modelStore.models).toEqual(['openai/gpt-4.1', 'anthropic/claude-3-haiku'])

      // Switch to OpenAI
      await modelStore.setProvider('openai')
      
      // Should see different models
      expect(modelStore.currentProvider).toBe('openai')
      expect(modelStore.models).toEqual(['gpt-4-turbo-preview', 'gpt-3.5-turbo'])
      expect(mockStorageAdapter.setCurrentProvider).toHaveBeenCalledWith('openai')
    })

    it('should maintain separate model lists per provider', async () => {
      await modelStore.init()
      
      // Add model to openrouter
      await modelStore.addModel('anthropic/claude-3-haiku')
      expect(modelStore.models).toEqual(['openai/gpt-4.1', 'anthropic/claude-3-haiku'])
      expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledWith(
        'openrouter', 
        ['openai/gpt-4.1', 'anthropic/claude-3-haiku']
      )

      // Switch to OpenAI and add different model
      await modelStore.setProvider('openai')
      await modelStore.addModel('gpt-4')
      expect(modelStore.models).toEqual(['gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-4'])
      expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledWith(
        'openai', 
        ['gpt-4-turbo-preview', 'gpt-3.5-turbo', 'gpt-4']
      )

      // Switch back to openrouter - should see original models
      await modelStore.setProvider('openrouter')
      expect(modelStore.models).toEqual(['openai/gpt-4.1', 'anthropic/claude-3-haiku'])
    })

    it('should only affect current provider when adding models', async () => {
      await modelStore.init() // starts with openrouter
      
      await modelStore.addModel('test-model')
      
      // Should only update openrouter models
      expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledWith(
        'openrouter',
        ['openai/gpt-4.1', 'test-model']
      )
      expect(mockStorageAdapter.setProviderModelPreferences).not.toHaveBeenCalledWith(
        'openai',
        expect.any(Array)
      )
    })

    it('should only affect current provider when removing models', async () => {
      await modelStore.init()
      await modelStore.addModel('test-model')
      
      vi.clearAllMocks() // Clear previous calls
      
      await modelStore.removeModel('test-model')
      
      // Should only update openrouter models
      expect(mockStorageAdapter.setProviderModelPreferences).toHaveBeenCalledWith(
        'openrouter',
        ['openai/gpt-4.1']
      )
      expect(mockStorageAdapter.setProviderModelPreferences).not.toHaveBeenCalledWith(
        'openai',
        expect.any(Array)
      )
    })
  })

  it('should format price correctly for OpenRouter', () => {
    modelStore.currentProvider = 'openrouter'
    const model = sampleModels[0];
    const price = modelStore.formatPrice(model);
    // (0.00025 + 0.00125) * 1000000 = 1500
    expect(price).toBe('$1500.00M');
  });
  
  it('should return standard rates for OpenAI', () => {
    modelStore.currentProvider = 'openai'
    const model = sampleModels[0];
    const price = modelStore.formatPrice(model);
    expect(price).toBe('Standard rates');
  });

  it('should sort available models by name', () => {
    runInAction(() => {
      modelStore.availableModels = sampleModels;
    });

    const sortedModels = modelStore.sortedAvailableModels;
    expect(sortedModels[0].name).toBe('Claude 3 Haiku');
    expect(sortedModels[1].name).toBe('Gemini 2.0 Flash');
    expect(sortedModels[2].name).toBe('GPT-4o Mini');
  });
  
  describe('Provider Management', () => {
    it('should set provider and fetch models', async () => {
      await modelStore.setProvider('openai')
      
      expect(modelStore.currentProvider).toBe('openai')
      expect(mockOpenAIAdapter.fetchAvailableModels).toHaveBeenCalled()
    })
    
    it('should clear available models when switching providers', async () => {
      runInAction(() => {
        modelStore.availableModels = sampleModels
      })
      
      // Mock to prevent actual fetch
      mockOpenAIAdapter.fetchAvailableModels.mockResolvedValue([])
      
      await modelStore.setProvider('openai')
      
      // Check that models were cleared during provider switch
      // The empty array is from the mocked fetchAvailableModels
      expect(modelStore.availableModels).toEqual([])
    })
    
    it('should create correct adapter for each provider', async () => {
      // Test OpenRouter
      modelStore.currentProvider = 'openrouter'
      const openRouterAdapter = await modelStore.getCurrentAdapter()
      expect(OpenRouterApiAdapter).toHaveBeenCalled()
      expect(openRouterAdapter).not.toBeNull()
      
      // Test OpenAI
      modelStore.currentProvider = 'openai'
      const openAIAdapter = await modelStore.getCurrentAdapter()
      expect(OpenAIApiAdapter).toHaveBeenCalled()
      expect(openAIAdapter).not.toBeNull()
    })
    
    it('should update API key and refresh models', async () => {
      modelStore.currentProvider = 'openai'
      await modelStore.updateApiKey('openai', 'new-key')
      
      expect(OpenAIApiAdapter).toHaveBeenCalledWith('new-key')
      expect(mockOpenAIAdapter.fetchAvailableModels).toHaveBeenCalled()
    })
  })
}) 
