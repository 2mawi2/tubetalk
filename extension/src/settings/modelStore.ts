import { makeAutoObservable, runInAction } from 'mobx'
import { DEFAULT_MODEL } from './settingsStorageAdapter'
import type { OpenRouterModel } from '../common/adapters/ApiAdapter'
import type { ApiAdapter } from '../common/adapters/ApiAdapter'
import { OpenRouterApiAdapter } from '../common/adapters/ApiAdapter'
import { OpenAIApiAdapter } from '../common/adapters/OpenAIApiAdapter'
import type { ProviderType } from '../storage/types'
import { storageAdapter } from '../storage/storageAdapter'

type ErrorState = { message: string } | null

export class ModelStore {
  models: string[] = [DEFAULT_MODEL]
  availableModels: OpenRouterModel[] = []
  error: ErrorState = null
  inputError: boolean = false
  isLoading: boolean = false
  currentProvider: ProviderType = 'openrouter'
  private openRouterAdapter: ApiAdapter | null = null
  private openAIAdapter: ApiAdapter | null = null
  private openRouterApiKey: string | null = null
  private openAIApiKey: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get sortedAvailableModels() {
    return [...this.availableModels].sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
  }

  formatPrice(model: OpenRouterModel): string {
    if (this.currentProvider === 'openai') {
      return 'Standard rates'
    }
    const prompt = parseFloat(model.pricing.prompt)
    const completion = parseFloat(model.pricing.completion)
    const total = (prompt + completion) * 1000000 // Convert to per million tokens
    return `$${total.toFixed(2)}M`
  }

  async init() {
    try {
      // First initialize the current provider
      const currentProvider = await storageAdapter.getCurrentProvider()
      runInAction(() => {
        this.currentProvider = currentProvider
      })
      
      // Then fetch available models
      await this.fetchAvailableModels()
      
      // Load provider-specific models
      const providerModels = await storageAdapter.getProviderModelPreferences(this.currentProvider)
      
      runInAction(() => {
        // Filter out any models that aren't in the available models list
        // Ensure we have the default model and keep valid custom models
        const validCustomModels = providerModels
          .filter(modelId => modelId !== DEFAULT_MODEL)
          .filter(modelId => 
            this.availableModels.some(m => m.id === modelId) || 
            // Allow models that might be valid for this provider but not yet loaded
            modelId.includes('gpt-') || modelId.includes('claude-') || modelId.includes('/')
          );
        
        this.models = [DEFAULT_MODEL, ...validCustomModels];
        this.error = null;
        this.inputError = false;
      })
    } catch (error) {
      runInAction(() => {
        this.error = { message: 'Failed to initialize models' }
        this.isLoading = false
      })
    }
  }

  async fetchAvailableModels() {
    this.isLoading = true
    try {
      const adapter = await this.getCurrentAdapter()
      if (!adapter) {
        throw new Error('No API adapter available')
      }
      
      const models = await adapter.fetchAvailableModels()
      runInAction(() => {
        this.availableModels = models
        this.isLoading = false
      })
    } catch (error) {
      runInAction(() => {
        this.error = { message: 'Failed to fetch models' }
        this.isLoading = false
      })
    }
  }

  get customModels() {
    return this.models.filter(m => m !== DEFAULT_MODEL)
  }

  clearError() {
    runInAction(() => {
      this.error = null
      this.inputError = false
    })
  }

  async addModel(modelId: string) {
    if (!modelId) {
      return
    }

    if (this.models.includes(modelId)) {
      runInAction(() => {
        this.error = { message: 'duplicateModelError' }
        this.inputError = true
      })
      return
    }

    const updatedModels = [...this.models, modelId]
    await storageAdapter.setProviderModelPreferences(
      this.currentProvider,
      updatedModels
    )
    
    runInAction(() => {
      this.models = updatedModels
      this.error = null
      this.inputError = false
    })
  }

  async removeModel(model: string) {
    if (model === DEFAULT_MODEL) {
      return
    }

    const updatedModels = this.models.filter(m => m !== model)
    await storageAdapter.setProviderModelPreferences(
      this.currentProvider,
      updatedModels
    )
    
    runInAction(() => {
      this.models = updatedModels
      this.error = null
      this.inputError = false
    })
  }

  async setProvider(provider: ProviderType) {
    runInAction(() => {
      this.currentProvider = provider
      this.availableModels = [] // Clear models when switching providers
    })
    
    // Update storage with new current provider
    await storageAdapter.setCurrentProvider(provider)
    
    // Load provider-specific models first
    const providerModels = await storageAdapter.getProviderModelPreferences(provider)
    runInAction(() => {
      this.models = providerModels.length > 0 ? providerModels : [DEFAULT_MODEL]
    })
    
    // Then fetch available models for the new provider
    await this.fetchAvailableModels()
  }

  async getCurrentAdapter(): Promise<ApiAdapter | null> {
    
    if (this.currentProvider === 'openrouter') {
      const apiKey = await storageAdapter.getProviderApiKey('openrouter');
      if (!apiKey) return null;
      
      if (!this.openRouterAdapter || this.openRouterApiKey !== apiKey) {
        this.openRouterAdapter = new OpenRouterApiAdapter(apiKey, () => Promise.resolve(this.models));
        this.openRouterApiKey = apiKey;
      }
      return this.openRouterAdapter;
    } else {
      const apiKey = await storageAdapter.getProviderApiKey('openai');
      if (!apiKey) return null;
      
      if (!this.openAIAdapter || this.openAIApiKey !== apiKey) {
        this.openAIAdapter = new OpenAIApiAdapter(apiKey);
        this.openAIApiKey = apiKey;
      }
      return this.openAIAdapter;
    }
  }

  async updateApiKey(provider: ProviderType, apiKey: string) {
    if (provider === 'openrouter') {
      this.openRouterAdapter = new OpenRouterApiAdapter(apiKey, () => Promise.resolve(this.models))
      this.openRouterApiKey = apiKey
    } else {
      this.openAIAdapter = new OpenAIApiAdapter(apiKey)
      this.openAIApiKey = apiKey
    }
    // Refresh models when API key changes
    if (this.currentProvider === provider) {
      await this.fetchAvailableModels()
    }
  }
}

// Create a singleton instance
export const modelStore = new ModelStore() 
