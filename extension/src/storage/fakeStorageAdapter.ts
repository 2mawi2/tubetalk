import { DEFAULT_VALUES, STORAGE_KEYS } from './storageAdapter';
import type { StorageAdapter } from './types';

export class FakeStorageAdapter implements StorageAdapter {
  private storage: { [key: string]: any } = {};

  constructor() {
    this.storage = {
      [STORAGE_KEYS.API_KEY]: null,
      [STORAGE_KEYS.DARK_MODE]: DEFAULT_VALUES.DARK_MODE,
      [STORAGE_KEYS.MODEL_PREFERENCES]: DEFAULT_VALUES.MODEL_PREFERENCES,
      [STORAGE_KEYS.SHOW_SPONSORED]: DEFAULT_VALUES.SHOW_SPONSORED,
      [STORAGE_KEYS.SELECTED_LOCALE]: null,
      [STORAGE_KEYS.SELECTED_SUMMARY_LANGUAGE]: null,
      [STORAGE_KEYS.SHOW_SUGGESTED_QUESTIONS]: DEFAULT_VALUES.SHOW_SUGGESTED_QUESTIONS,
    };
  }

  reset(): void {
    this.storage = {
      [STORAGE_KEYS.API_KEY]: null,
      [STORAGE_KEYS.DARK_MODE]: DEFAULT_VALUES.DARK_MODE,
      [STORAGE_KEYS.MODEL_PREFERENCES]: DEFAULT_VALUES.MODEL_PREFERENCES,
      [STORAGE_KEYS.SHOW_SPONSORED]: DEFAULT_VALUES.SHOW_SPONSORED,
      [STORAGE_KEYS.SELECTED_LOCALE]: null,
      [STORAGE_KEYS.SELECTED_SUMMARY_LANGUAGE]: null,
      [STORAGE_KEYS.SHOW_SUGGESTED_QUESTIONS]: DEFAULT_VALUES.SHOW_SUGGESTED_QUESTIONS,
    };
  }
  async getStorageValue<T>(key: string, defaultValue: T): Promise<T> {
    return this.storage[key] ?? defaultValue;
  }

  async setStorageValue<T>(key: string, value: T): Promise<void> {
    this.storage[key] = value;
  }

  async getApiKey(): Promise<{ openaiApiKey: string | null }> {
    const apiKey = await this.getStorageValue(STORAGE_KEYS.API_KEY, null);
    return { openaiApiKey: apiKey };
  }

  async setApiKey(apiKey: string): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.API_KEY, apiKey);
  }

  async getModelPreferences(): Promise<string[]> {
    return this.getStorageValue(STORAGE_KEYS.MODEL_PREFERENCES, DEFAULT_VALUES.MODEL_PREFERENCES);
  }

  async setModelPreferences(models: string[]): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.MODEL_PREFERENCES, models);
  }

  async getDarkMode(): Promise<boolean> {
    return this.getStorageValue(STORAGE_KEYS.DARK_MODE, DEFAULT_VALUES.DARK_MODE);
  }

  async setDarkMode(value: boolean): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.DARK_MODE, value);
  }

  async getShowSponsored(): Promise<boolean> {
    return this.getStorageValue(STORAGE_KEYS.SHOW_SPONSORED, DEFAULT_VALUES.SHOW_SPONSORED);
  }

  async setShowSponsored(value: boolean): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SHOW_SPONSORED, value);
  }

  async getSelectedLocale(): Promise<{ selectedLocale: string | null }> {
    const locale = await this.getStorageValue(STORAGE_KEYS.SELECTED_LOCALE, null);
    return { selectedLocale: locale };
  }

  async setSelectedLocale(locale: string): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SELECTED_LOCALE, locale);
  }

  async getSelectedSummaryLanguage(): Promise<string | null> {
    return this.getStorageValue(STORAGE_KEYS.SELECTED_SUMMARY_LANGUAGE, null);
  }

  async setSelectedSummaryLanguage(language: string | null): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SELECTED_SUMMARY_LANGUAGE, language);
  }

  async getShowSuggestedQuestions(): Promise<boolean> {
    return this.getStorageValue(STORAGE_KEYS.SHOW_SUGGESTED_QUESTIONS, DEFAULT_VALUES.SHOW_SUGGESTED_QUESTIONS);
  }

  async setShowSuggestedQuestions(value: boolean): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.SHOW_SUGGESTED_QUESTIONS, value);
  }

}

export default FakeStorageAdapter; 