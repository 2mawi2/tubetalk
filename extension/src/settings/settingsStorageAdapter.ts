/// <reference types="chrome"/>

export const STORAGE_KEYS = {
  CUSTOM_MODELS: 'customModels'
} as const;

export const DEFAULT_MODEL = 'gpt-4o';

export const DEFAULT_VALUES = {
  CUSTOM_MODELS: [] as string[]
} as const;

export interface SettingsStorageAdapter {
  getCustomModels(): Promise<string[]>;
  setCustomModels(models: string[]): Promise<void>;
}

const settingsStorageAdapter: SettingsStorageAdapter = {
  async getCustomModels(): Promise<string[]> {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(STORAGE_KEYS.CUSTOM_MODELS, (result = {}) => {
          const customModels = result[STORAGE_KEYS.CUSTOM_MODELS] ?? DEFAULT_VALUES.CUSTOM_MODELS;
          // Always ensure default model is first and only appears once
          resolve([DEFAULT_MODEL, ...customModels.filter((model: string) => model !== DEFAULT_MODEL)]);
        });
      } else {
        const value = localStorage.getItem(STORAGE_KEYS.CUSTOM_MODELS);
        const customModels = value ? JSON.parse(value) : DEFAULT_VALUES.CUSTOM_MODELS;
        // Always ensure default model is first and only appears once
        resolve([DEFAULT_MODEL, ...customModels.filter((model: string) => model !== DEFAULT_MODEL)]);
      }
    });
  },

  async setCustomModels(models: string[]): Promise<void> {
    // Filter out the default model before saving
    const modelsToSave = models.filter((model: string) => model !== DEFAULT_MODEL);
    
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.set({ [STORAGE_KEYS.CUSTOM_MODELS]: modelsToSave }, () => {
          resolve();
        });
      } else {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_MODELS, JSON.stringify(modelsToSave));
        resolve();
      }
    });
  }
};

export { settingsStorageAdapter };
export default settingsStorageAdapter; 