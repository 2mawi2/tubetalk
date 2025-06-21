import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageAdapter } from './storageAdapter';
import type { ProvidersConfig } from './types';

// Mock chrome storage
const mockChromeStorage = {
  sync: {
    get: vi.fn(),
    set: vi.fn()
  }
};

// @ts-ignore
global.chrome = {
  storage: mockChromeStorage
};

describe('Storage Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('migrateStorage', () => {
    it('should migrate existing user with API key to new schema', async () => {
      // Setup mock for v1 storage
      mockChromeStorage.sync.get.mockImplementation((key, callback) => {
        const result: Record<string, any> = {};
        
        if (key === 'storageVersion') {
          result.storageVersion = undefined; // No version means v1
        } else if (key === 'openaiApiKey') {
          result.openaiApiKey = 'sk-test-key-123';
        } else if (key === 'modelPreferences') {
          result.modelPreferences = ['gpt-4', 'gpt-3.5-turbo'];
        }
        
        callback(result);
      });

      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback();
      });

      // Run migration
      await storageAdapter.migrateStorage();

      // Verify providers structure was created
      const providersCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].providers !== undefined
      );
      
      expect(providersCall).toBeDefined();
      const providers: ProvidersConfig = providersCall![0].providers;
      
      // Check openrouter has the migrated data
      expect(providers.openrouter.apiKey).toBe('sk-test-key-123');
      expect(providers.openrouter.modelPreferences).toEqual(['gpt-4', 'gpt-3.5-turbo']);
      
      // Check openai has defaults
      expect(providers.openai.apiKey).toBeNull();
      expect(providers.openai.modelPreferences).toEqual(['gpt-4.1', 'gpt-4o-mini']);

      // Verify current provider was set to openrouter
      const providerCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].currentProvider !== undefined
      );
      expect(providerCall![0].currentProvider).toBe('openrouter');

      // Verify version was updated
      const versionCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].storageVersion !== undefined
      );
      expect(versionCall![0].storageVersion).toBe(2);
    });

    it('should migrate custom models from old settingsStorageAdapter', async () => {
      // Setup mock for v1 storage with custom models
      mockChromeStorage.sync.get.mockImplementation((key, callback) => {
        const result: Record<string, any> = {};
        
        if (key === 'storageVersion') {
          result.storageVersion = undefined; // No version means v1
        } else if (key === 'openaiApiKey') {
          result.openaiApiKey = 'sk-test-key-123';
        } else if (key === 'modelPreferences') {
          result.modelPreferences = ['openai/gpt-4.1', 'openai/gpt-4o-mini'];
        } else if (key === 'customModels') {
          // These are the custom models from old settingsStorageAdapter
          result.customModels = ['anthropic/claude-3-haiku', 'meta-llama/llama-3-8b'];
        }
        
        callback(result);
      });

      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback();
      });

      // Run migration
      await storageAdapter.migrateStorage();

      // Verify providers structure was created with custom models
      const providersCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].providers !== undefined
      );
      
      expect(providersCall).toBeDefined();
      const providers: ProvidersConfig = providersCall![0].providers;
      
      // Check openrouter has the migrated custom models (prioritized over legacy modelPreferences)
      expect(providers.openrouter.apiKey).toBe('sk-test-key-123');
      expect(providers.openrouter.modelPreferences).toEqual([
        'gpt-4.1', 
        'anthropic/claude-3-haiku', 
        'meta-llama/llama-3-8b'
      ]);
      
      // Check openai has defaults
      expect(providers.openai.apiKey).toBeNull();
      expect(providers.openai.modelPreferences).toEqual(['gpt-4.1', 'gpt-4o-mini']);
    });

    it('should migrate user with only custom models (no API key)', async () => {
      // Setup mock for user who only had custom models
      mockChromeStorage.sync.get.mockImplementation((key, callback) => {
        const result: Record<string, any> = {};
        
        if (key === 'storageVersion') {
          result.storageVersion = undefined; // No version means v1
        } else if (key === 'customModels') {
          result.customModels = ['anthropic/claude-3-haiku'];
        }
        // No API key or modelPreferences
        
        callback(result);
      });

      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback();
      });

      // Run migration
      await storageAdapter.migrateStorage();

      // Verify providers structure was created
      const providersCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].providers !== undefined
      );
      
      expect(providersCall).toBeDefined();
      const providers: ProvidersConfig = providersCall![0].providers;
      
      // Check openrouter has the custom models even without API key
      expect(providers.openrouter.apiKey).toBeNull();
      expect(providers.openrouter.modelPreferences).toEqual([
        'gpt-4.1', 
        'anthropic/claude-3-haiku'
      ]);
    });

    it('should initialize new user with default schema', async () => {
      // Setup mock for new user (no existing data)
      mockChromeStorage.sync.get.mockImplementation((key, callback) => {
        callback({});
      });

      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback();
      });

      // Run migration
      await storageAdapter.migrateStorage();

      // Verify default providers structure was created
      const providersCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].providers !== undefined
      );
      
      expect(providersCall).toBeDefined();
      const providers: ProvidersConfig = providersCall![0].providers;
      
      // Check both providers have default values
      expect(providers.openrouter.apiKey).toBeNull();
      expect(providers.openrouter.modelPreferences).toEqual(['gpt-4.1', 'gpt-4o-mini']);
      expect(providers.openai.apiKey).toBeNull();
      expect(providers.openai.modelPreferences).toEqual(['gpt-4.1', 'gpt-4o-mini']);

      // Verify current provider defaults to openrouter
      const providerCall = mockChromeStorage.sync.set.mock.calls.find(
        call => call[0].currentProvider !== undefined
      );
      expect(providerCall![0].currentProvider).toBe('openrouter');
    });

    it('should not run migration if already on v2', async () => {
      // Setup mock for v2 storage
      mockChromeStorage.sync.get.mockImplementation((key, callback) => {
        const result: Record<string, any> = {};
        
        if (key === 'storageVersion') {
          result.storageVersion = 2;
        }
        
        callback(result);
      });

      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback();
      });

      // Run migration
      await storageAdapter.migrateStorage();

      // Verify no storage writes happened
      expect(mockChromeStorage.sync.set).not.toHaveBeenCalled();
    });
  });

  describe('Provider management after migration', () => {
    it('should get correct API key for current provider', async () => {
      // Setup mock with migrated data
      mockChromeStorage.sync.get.mockImplementation((key, callback) => {
        const result: Record<string, any> = {};
        
        if (key === 'storageVersion') {
          result.storageVersion = 2;
        } else if (key === 'currentProvider') {
          result.currentProvider = 'openrouter';
        } else if (key === 'providers') {
          result.providers = {
            openrouter: {
              apiKey: 'sk-openrouter-123',
              modelPreferences: ['gpt-4']
            },
            openai: {
              apiKey: 'sk-openai-456',
              modelPreferences: ['gpt-3.5-turbo']
            }
          };
        }
        
        callback(result);
      });

      // Get API key (should return current provider's key)
      const { openaiApiKey } = await storageAdapter.getApiKey();
      expect(openaiApiKey).toBe('sk-openrouter-123');

      // Switch provider
      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        if (data.currentProvider) {
          // Update mock to return new provider
          mockChromeStorage.sync.get.mockImplementation((key, cb) => {
            const result: Record<string, any> = {};
            
            if (key === 'currentProvider') {
              result.currentProvider = 'openai';
            } else if (key === 'providers') {
              result.providers = {
                openrouter: {
                  apiKey: 'sk-openrouter-123',
                  modelPreferences: ['gpt-4']
                },
                openai: {
                  apiKey: 'sk-openai-456',
                  modelPreferences: ['gpt-3.5-turbo']
                }
              };
            }
            
            cb(result);
          });
        }
        callback();
      });

      await storageAdapter.setCurrentProvider('openai');

      // Get API key again (should return new provider's key)
      const { openaiApiKey: newApiKey } = await storageAdapter.getApiKey();
      expect(newApiKey).toBe('sk-openai-456');
    });
  });
});