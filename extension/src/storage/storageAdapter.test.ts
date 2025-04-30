import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storageAdapter, DEFAULT_VALUES, STORAGE_KEYS } from './storageAdapter';

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
      // Set up mock to return no stored value
      mockChromeStorage.get.mockImplementation((key, callback) => {
        callback({});
      });

      const result = await storageAdapter.getModelPreferences();
      
      expect(result).toEqual(DEFAULT_VALUES.MODEL_PREFERENCES);
      expect(result[0]).toBe('openai/gpt-4.1');
      expect(result[1]).toBe('openai/gpt-4o-mini');
      expect(mockChromeStorage.get).toHaveBeenCalledWith(STORAGE_KEYS.MODEL_PREFERENCES, expect.any(Function));
    });

    it('should return stored model preferences if they exist', async () => {
      const storedModels = ['custom/model', 'openai/gpt-4o-mini'];
      
      mockChromeStorage.get.mockImplementation((key, callback) => {
        callback({ [STORAGE_KEYS.MODEL_PREFERENCES]: storedModels });
      });

      const result = await storageAdapter.getModelPreferences();
      
      expect(result).toEqual(storedModels);
      expect(mockChromeStorage.get).toHaveBeenCalledWith(STORAGE_KEYS.MODEL_PREFERENCES, expect.any(Function));
    });
  });

  describe('setModelPreferences', () => {
    it('should store model preferences', async () => {
      const models = ['custom/model', 'openai/gpt-4.1'];
      
      mockChromeStorage.set.mockImplementation((data, callback) => {
        callback();
      });

      await storageAdapter.setModelPreferences(models);
      
      expect(mockChromeStorage.set).toHaveBeenCalledWith(
        { [STORAGE_KEYS.MODEL_PREFERENCES]: models },
        expect.any(Function)
      );
    });
  });
}); 