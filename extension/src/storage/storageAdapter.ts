/// <reference types="chrome"/>
import type { StorageAdapter } from './types';

export const DEFAULT_VALUES = {
  MODEL_PREFERENCES: ["openai/gpt-4.1", "openai/gpt-4o-mini"] as string[],
  DARK_MODE: true,
  SHOW_SPONSORED: true,
  INCLUDE_TIMESTAMP: false,
  SHOW_SUGGESTED_QUESTIONS: true
} as const;

export const STORAGE_KEYS = {
  API_KEY: 'openaiApiKey',
  MODEL_PREFERENCES: 'modelPreferences',
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

  async getApiKey(): Promise<{ openaiApiKey: string | null }> {
    const apiKey = await this.getStorageValue(STORAGE_KEYS.API_KEY, null);
    return { openaiApiKey: apiKey };
  },

  async setApiKey(apiKey: string): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.API_KEY, apiKey);
  },

  async getModelPreferences(): Promise<string[]> {
    return this.getStorageValue(STORAGE_KEYS.MODEL_PREFERENCES, DEFAULT_VALUES.MODEL_PREFERENCES);
  },

  async setModelPreferences(models: string[]): Promise<void> {
    return this.setStorageValue(STORAGE_KEYS.MODEL_PREFERENCES, models);
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

