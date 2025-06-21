/// <reference types="chrome"/>
import type { StorageAdapter, ProviderType, ProviderConfig, ProvidersConfig } from './types';

export const DEFAULT_VALUES = {
  MODEL_PREFERENCES: ["gpt-4o", "gpt-4o-mini"] as string[],
  DARK_MODE: true,
  SHOW_SPONSORED: true,
  INCLUDE_TIMESTAMP: false,
  SHOW_SUGGESTED_QUESTIONS: true,
  CURRENT_PROVIDER: 'openrouter' as ProviderType,
  STORAGE_VERSION: 2
} as const;

export const DEFAULT_PROVIDERS: ProvidersConfig = {
  openrouter: {
    apiKey: null,
    modelPreferences: ["gpt-4o", "gpt-4o-mini"]
  },
  openai: {
    apiKey: null,
    modelPreferences: ["gpt-4o", "gpt-4o-mini"]
  }
};

export const STORAGE_KEYS = {
  // Legacy keys
  API_KEY: 'openaiApiKey',
  MODEL_PREFERENCES: 'modelPreferences',
  
  // New provider keys
  CURRENT_PROVIDER: 'currentProvider',
  PROVIDERS: 'providers',
  STORAGE_VERSION: 'storageVersion',
  
  // Other settings
  DARK_MODE: 'darkMode',
  SHOW_SPONSORED: 'showSponsored',
  INCLUDE_TIMESTAMP: 'includeTimestamp',
  SELECTED_LOCALE: 'selectedLocale',
  SELECTED_SUMMARY_LANGUAGE: 'selectedSummaryLanguage',
  SHOW_SUGGESTED_QUESTIONS: 'showSuggestedQuestions'
} as const;

const storageAdapter: StorageAdapter = {
  async getStorageValue<T>(key: string, defaultValue: T): Promise<T> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(key, (result = {}) => {
          resolve(result[key] ?? defaultValue);
        });
      } else {
        const value = localStorage.getItem(key);
        resolve(value ? JSON.parse(value) : defaultValue);
      }
    });
  },

  async setStorageValue<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
        resolve();
      }
    });
  },

  // Provider management methods
  async getCurrentProvider(): Promise<ProviderType> {
    return this.getStorageValue(STORAGE_KEYS.CURRENT_PROVIDER, DEFAULT_VALUES.CURRENT_PROVIDER);
  },

  async setCurrentProvider(provider: ProviderType): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.CURRENT_PROVIDER, provider);
  },

  async getProviderConfig(provider: ProviderType): Promise<ProviderConfig> {
    const providers = await this.getStorageValue(STORAGE_KEYS.PROVIDERS, DEFAULT_PROVIDERS);
    return providers[provider] || DEFAULT_PROVIDERS[provider];
  },

  async setProviderApiKey(provider: ProviderType, apiKey: string): Promise<void> {
    const providers = await this.getStorageValue(STORAGE_KEYS.PROVIDERS, DEFAULT_PROVIDERS);
    providers[provider] = {
      ...providers[provider],
      apiKey
    };
    return this.setStorageValue(STORAGE_KEYS.PROVIDERS, providers);
  },

  async getProviderApiKey(provider: ProviderType): Promise<string | null> {
    const config = await this.getProviderConfig(provider);
    return config.apiKey;
  },

  async setProviderModelPreferences(provider: ProviderType, models: string[]): Promise<void> {
    const providers = await this.getStorageValue(STORAGE_KEYS.PROVIDERS, DEFAULT_PROVIDERS);
    providers[provider] = {
      ...providers[provider],
      modelPreferences: models
    };
    return this.setStorageValue(STORAGE_KEYS.PROVIDERS, providers);
  },

  async getProviderModelPreferences(provider: ProviderType): Promise<string[]> {
    const config = await this.getProviderConfig(provider);
    return config.modelPreferences;
  },

  async getCurrentProviderConfig(): Promise<ProviderConfig> {
    const currentProvider = await this.getCurrentProvider();
    return this.getProviderConfig(currentProvider);
  },

  async hasProviderKey(provider: ProviderType): Promise<boolean> {
    const apiKey = await this.getProviderApiKey(provider);
    return apiKey !== null && apiKey !== '';
  },

  // Migration method
  async migrateStorage(): Promise<void> {
    const version = await this.getStorageValue(STORAGE_KEYS.STORAGE_VERSION, 1);
    
    if (version < 2) {
      // Migrate from v1 to v2
      const legacyApiKey = await this.getStorageValue(STORAGE_KEYS.API_KEY, null);
      const legacyModelPrefs = await this.getStorageValue(STORAGE_KEYS.MODEL_PREFERENCES, DEFAULT_VALUES.MODEL_PREFERENCES);
      
      // Also check for old settingsStorageAdapter custom models
      const legacyCustomModels = await this.getStorageValue('customModels', []);
      
      if (legacyApiKey || legacyCustomModels.length > 0) {
        // Determine model preferences - use custom models if available, else legacy model prefs
        // Also migrate old model names to new ones
        const migrateModelName = (model: string) => {
          if (model === "openai/gpt-4.1" || model === "gpt-4.1") return "gpt-4o";
          if (model === "openai/gpt-4o-mini") return "gpt-4o-mini";
          return model;
        };
        
        const modelsToMigrate = legacyCustomModels.length > 0 
          ? ["gpt-4o", ...legacyCustomModels.filter((m: string) => m !== "openai/gpt-4.1").map(migrateModelName)]
          : legacyModelPrefs.map(migrateModelName);
        
        // Initialize providers structure with legacy data migrated to openrouter
        const providers: ProvidersConfig = {
          openrouter: {
            apiKey: legacyApiKey,
            modelPreferences: modelsToMigrate
          },
          openai: DEFAULT_PROVIDERS.openai
        };
        
        await this.setStorageValue(STORAGE_KEYS.PROVIDERS, providers);
        await this.setStorageValue(STORAGE_KEYS.CURRENT_PROVIDER, 'openrouter');
      } else {
        // No legacy data, just set defaults
        await this.setStorageValue(STORAGE_KEYS.PROVIDERS, DEFAULT_PROVIDERS);
        await this.setStorageValue(STORAGE_KEYS.CURRENT_PROVIDER, DEFAULT_VALUES.CURRENT_PROVIDER);
      }
      
      // Update version
      await this.setStorageValue(STORAGE_KEYS.STORAGE_VERSION, 2);
    }
  },

  async getApiKey(): Promise<{ openaiApiKey: string | null }> {
    // First run migration to ensure we have the new structure
    await this.migrateStorage();
    
    // For backward compatibility, return the current provider's API key
    const currentProvider = await this.getCurrentProvider();
    const apiKey = await this.getProviderApiKey(currentProvider);
    return { openaiApiKey: apiKey };
  },

  async setApiKey(apiKey: string): Promise<void> {
    // First run migration to ensure we have the new structure
    await this.migrateStorage();
    
    // For backward compatibility, set the API key for the current provider
    const currentProvider = await this.getCurrentProvider();
    return this.setProviderApiKey(currentProvider, apiKey);
  },

  async getModelPreferences(): Promise<string[]> {
    // First run migration to ensure we have the new structure
    await this.migrateStorage();
    
    // Get model preferences for the current provider
    const currentProvider = await this.getCurrentProvider();
    return this.getProviderModelPreferences(currentProvider);
  },

  async setModelPreferences(models: string[]): Promise<void> {
    // First run migration to ensure we have the new structure
    await this.migrateStorage();
    
    // Set model preferences for the current provider
    const currentProvider = await this.getCurrentProvider();
    return this.setProviderModelPreferences(currentProvider, models);
  },

  async getDarkMode(): Promise<boolean> {
    return this.getStorageValue(STORAGE_KEYS.DARK_MODE, DEFAULT_VALUES.DARK_MODE);
  },

  async setDarkMode(value: boolean): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.DARK_MODE, value);
  },

  async getShowSponsored(): Promise<boolean> {
    return this.getStorageValue(STORAGE_KEYS.SHOW_SPONSORED, DEFAULT_VALUES.SHOW_SPONSORED);
  },

  async setShowSponsored(value: boolean): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SHOW_SPONSORED, value);
  },

  async getSelectedLocale(): Promise<{ selectedLocale: string | null }> {
    const locale = await (this.getStorageValue(STORAGE_KEYS.SELECTED_LOCALE, null) as Promise<string | null>);
    return { selectedLocale: locale };
  },

  async setSelectedLocale(locale: string): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SELECTED_LOCALE, locale);
  },

  async getSelectedSummaryLanguage(): Promise<string | null> {
    const language = await this.getStorageValue(STORAGE_KEYS.SELECTED_SUMMARY_LANGUAGE, null);
    return language;
  },

  async setSelectedSummaryLanguage(language: string | null): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SELECTED_SUMMARY_LANGUAGE, language);
  },

  async getShowSuggestedQuestions(): Promise<boolean> {
    return this.getStorageValue(STORAGE_KEYS.SHOW_SUGGESTED_QUESTIONS, DEFAULT_VALUES.SHOW_SUGGESTED_QUESTIONS);
  },

  async setShowSuggestedQuestions(value: boolean): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SHOW_SUGGESTED_QUESTIONS, value);
  }
};

export { storageAdapter };
export default storageAdapter;

