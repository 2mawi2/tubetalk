export type ProviderType = 'openrouter' | 'openai';

export interface ProviderConfig {
  apiKey: string | null;
  modelPreferences: string[];
}

export interface ProvidersConfig {
  openrouter: ProviderConfig;
  openai: ProviderConfig;
}

export interface StorageValues {
  // New multi-provider fields
  currentProvider: ProviderType;
  providers: ProvidersConfig;
  storageVersion: number;
  
  // Legacy fields (kept for migration)
  openaiApiKey: string | null;
  modelPreferences: string[];
  
  // Other settings
  darkMode: boolean;
  showSponsored: boolean;
  selectedLocale: string | null;
  selectedSummaryLanguage: string | null;
  showSuggestedQuestions: boolean;
}

export interface StorageAdapter {
  // Core storage methods
  getStorageValue<T>(key: string, defaultValue: T): Promise<T>;
  setStorageValue<T>(key: string, value: T): Promise<void>;
  
  // Legacy API key methods (for backward compatibility)
  getApiKey(): Promise<{ openaiApiKey: string | null }>;
  setApiKey(apiKey: string): Promise<void>;
  
  // Provider management methods
  getCurrentProvider(): Promise<ProviderType>;
  setCurrentProvider(provider: ProviderType): Promise<void>;
  getProviderConfig(provider: ProviderType): Promise<ProviderConfig>;
  setProviderApiKey(provider: ProviderType, apiKey: string): Promise<void>;
  getProviderApiKey(provider: ProviderType): Promise<string | null>;
  setProviderModelPreferences(provider: ProviderType, models: string[]): Promise<void>;
  getProviderModelPreferences(provider: ProviderType): Promise<string[]>;
  getCurrentProviderConfig(): Promise<ProviderConfig>;
  hasProviderKey(provider: ProviderType): Promise<boolean>;
  
  // Migration
  migrateStorage(): Promise<void>;
  
  // Model preferences (uses current provider)
  getModelPreferences(): Promise<string[]>;
  setModelPreferences(models: string[]): Promise<void>;
  
  // Other settings
  getDarkMode(): Promise<boolean>;
  setDarkMode(value: boolean): Promise<void>;
  getShowSponsored(): Promise<boolean>;
  setShowSponsored(value: boolean): Promise<void>;
  getSelectedLocale(): Promise<{ selectedLocale: string | null }>;
  setSelectedLocale(locale: string): Promise<void>;
  getSelectedSummaryLanguage(): Promise<string | null>;
  setSelectedSummaryLanguage(language: string | null): Promise<void>;
  getShowSuggestedQuestions(): Promise<boolean>;
  setShowSuggestedQuestions(value: boolean): Promise<void>;
} 
