import { makeAutoObservable, runInAction } from 'mobx'
import { DEFAULT_MODEL, settingsStorageAdapter } from './settingsStorageAdapter'
import type { OpenRouterModel } from '../common/adapters/ApiAdapter'
import type { ApiAdapter } from '../common/adapters/ApiAdapter'
import { OpenRouterApiAdapter } from '../common/adapters/ApiAdapter'

type ErrorState = { message: string } | null

export class ModelStore {
  models: string[] = [DEFAULT_MODEL]
  availableModels: OpenRouterModel[] = []
  error: ErrorState = null
  inputError: boolean = false
  isLoading: boolean = false

  constructor(private apiAdapter: ApiAdapter) {
    makeAutoObservable(this)
  }

  get sortedAvailableModels() {
    return [...this.availableModels].sort((a, b) => {
      return a.name.localeCompare(b.name)
    })
  }

  formatPrice(model: OpenRouterModel): string {
    const prompt = parseFloat(model.pricing.prompt)
    const completion = parseFloat(model.pricing.completion)
    const total = (prompt + completion) * 1000000 // Convert to per million tokens
    return `$${total.toFixed(2)}M`
  }

  async init() {
    try {
      // First fetch available models
      await this.fetchAvailableModels()
      
      // Then load custom models
      const customModels = await settingsStorageAdapter.getCustomModels()
      
      runInAction(() => {
        // Filter out any custom models that aren't in the available models list
        // and ensure we don't duplicate the default model
        const validCustomModels = customModels
          .filter(modelId => modelId !== DEFAULT_MODEL)
          .filter(modelId => 
            this.availableModels.some(m => m.id === modelId)
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
      const models = await this.apiAdapter.fetchAvailableModels()
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
    await settingsStorageAdapter.setCustomModels(
      updatedModels.filter(m => m !== DEFAULT_MODEL)
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
    await settingsStorageAdapter.setCustomModels(
      updatedModels.filter(m => m !== DEFAULT_MODEL)
    )
    
    runInAction(() => {
      this.models = updatedModels
      this.error = null
      this.inputError = false
    })
  }
}

// Create the store first
let modelStore: ModelStore

// Then create the adapter with a function that accesses the store
const apiAdapter = new OpenRouterApiAdapter(
  '', // The API key will be set later
  async () => modelStore ? modelStore.models : [DEFAULT_MODEL]
)

// Finally, instantiate the store with the adapter
modelStore = new ModelStore(apiAdapter)

export { modelStore } 
