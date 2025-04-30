export interface StorageValues {
  openaiApiKey: string | null;
  modelPreferences: string[];
  darkMode: boolean;
  showSponsored: boolean;
  selectedLocale: string | null;
  selectedSummaryLanguage: string | null;
  showSuggestedQuestions: boolean;
}

export interface StorageAdapter {
  getStorageValue<T>(key: string, defaultValue: T): Promise<T>;
  setStorageValue<T>(key: string, value: T): Promise<void>;
  getApiKey(): Promise<{ openaiApiKey: string | null }>;
  setApiKey(apiKey: string): Promise<void>;
  getModelPreferences(): Promise<string[]>;
  setModelPreferences(models: string[]): Promise<void>;
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
