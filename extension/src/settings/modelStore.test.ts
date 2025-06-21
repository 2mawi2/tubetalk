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
      getProviderApiKey: vi.fn(),
      getModelPreferences: vi.fn(() => Promise.resolve(['openai/gpt-4.1']))
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
    
    // Reset mock implementations
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
    
    // Mock storage adapter
    mockStorageAdapter.getProviderApiKey.mockImplementation(async (provider) => {
      return provider === 'openrouter' ? 'openrouter-key' : 'openai-key'
    })
    
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
    expect(mockSettingsStorageAdapter.getCustomModels).toHaveBeenCalled()
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
    expect(mockSettingsStorageAdapter.setCustomModels).toHaveBeenCalledWith([customModel])
    
    // Remove model
    await modelStore.removeModel(customModel)
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    expect(mockSettingsStorageAdapter.setCustomModels).toHaveBeenCalledWith([])
  })

  it('prevents removing the default model', async () => {
    await modelStore.init()
    
    await modelStore.removeModel('openai/gpt-4.1')
    expect(modelStore.models).toEqual(['openai/gpt-4.1'])
    expect(mockSettingsStorageAdapter.setCustomModels).not.toHaveBeenCalled()
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
