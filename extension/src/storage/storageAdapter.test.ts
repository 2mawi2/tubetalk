import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storageAdapter, DEFAULT_VALUES, STORAGE_KEYS, DEFAULT_PROVIDERS } from './storageAdapter';

describe('storageAdapter', () => {
  const mockChromeStorage = {
    get: vi.fn(),
    set: vi.fn()
  };

  beforeEach(() => {
    // Mock chrome.storage.sync
    global.chrome = {
      storage: {
        sync: mockChromeStorage
      }
    } as any;

    // Clear mocks between tests
    mockChromeStorage.get.mockClear();
    mockChromeStorage.set.mockClear();
  });

  afterEach(() => {
    // @ts-ignore
    delete global.chrome;
  });

  describe('getModelPreferences', () => {
    it('should return default model preferences with "openai/gpt-4.1" as the first model', async () => {
      // Set up mock to handle migration and provider-based storage
      mockChromeStorage.get.mockImplementation((key, callback) => {
        if (key === STORAGE_KEYS.STORAGE_VERSION) {
          callback({ [STORAGE_KEYS.STORAGE_VERSION]: 2 }); // Already migrated
        } else if (key === STORAGE_KEYS.CURRENT_PROVIDER) {
          callback({ [STORAGE_KEYS.CURRENT_PROVIDER]: 'openrouter' });
        } else if (key === STORAGE_KEYS.PROVIDERS) {
          callback({ [STORAGE_KEYS.PROVIDERS]: DEFAULT_PROVIDERS });
        } else {
          callback({});
        }
      });
      
      mockChromeStorage.set.mockImplementation((data, callback) => {
        callback();
      });

      const result = await storageAdapter.getModelPreferences();
      
      expect(result).toEqual(DEFAULT_VALUES.MODEL_PREFERENCES);
      expect(result[0]).toBe('gpt-4o');
      expect(result[1]).toBe('gpt-4o-mini');
    });

    it('should return stored model preferences if they exist', async () => {
      const storedModels = ['custom/model', 'openai/gpt-4o-mini'];
      
      mockChromeStorage.get.mockImplementation((key, callback) => {
        if (key === STORAGE_KEYS.STORAGE_VERSION) {
          callback({ [STORAGE_KEYS.STORAGE_VERSION]: 2 }); // Already migrated
        } else if (key === STORAGE_KEYS.CURRENT_PROVIDER) {
          callback({ [STORAGE_KEYS.CURRENT_PROVIDER]: 'openrouter' });
        } else if (key === STORAGE_KEYS.PROVIDERS) {
          callback({ 
            [STORAGE_KEYS.PROVIDERS]: {
              openrouter: {
                apiKey: null,
                modelPreferences: storedModels
              },
              openai: DEFAULT_PROVIDERS.openai
            }
          });
        } else {
          callback({});
        }
      });

      const result = await storageAdapter.getModelPreferences();
      
      expect(result).toEqual(storedModels);
    });
  });

  describe('setModelPreferences', () => {
    it('should store model preferences', async () => {
      const models = ['custom/model', 'openai/gpt-4.1'];
      
      // Set up mock to handle migration checks
      mockChromeStorage.get.mockImplementation((key, callback) => {
        if (key === STORAGE_KEYS.STORAGE_VERSION) {
          callback({ [STORAGE_KEYS.STORAGE_VERSION]: 2 }); // Already migrated
        } else if (key === STORAGE_KEYS.CURRENT_PROVIDER) {
          callback({ [STORAGE_KEYS.CURRENT_PROVIDER]: 'openrouter' });
        } else if (key === STORAGE_KEYS.PROVIDERS) {
          callback({ [STORAGE_KEYS.PROVIDERS]: DEFAULT_PROVIDERS });
        } else {
          callback({});
        }
      });
      
      mockChromeStorage.set.mockImplementation((data, callback) => {
        callback();
      });

      await storageAdapter.setModelPreferences(models);
      
      // Should update the providers object with new model preferences
      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        expect.objectContaining({ 
          [STORAGE_KEYS.PROVIDERS]: expect.objectContaining({
            openrouter: expect.objectContaining({
              modelPreferences: models
            })
          })
        }),
        expect.any(Function)
      );
    });
  });
}); 