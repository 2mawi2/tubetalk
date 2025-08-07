import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageInputStore } from './messageInputStore';
import { modelStore } from '../settings/modelStore';
import storageAdapter from '../storage/storageAdapter';
import { configure, runInAction } from 'mobx';

// Configure MobX for strict mode
configure({
  enforceActions: 'always',
});

vi.mock('../settings/modelStore', () => ({
  modelStore: {
    models: ['openai/gpt-4.1', 'openai/gpt-4o-mini']
  }
}));

vi.mock('../storage/storageAdapter', () => ({
  default: {
    getModelPreferences: vi.fn().mockResolvedValue(['openai/gpt-4.1', 'openai/gpt-4o-mini']),
    setModelPreferences: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('MessageInputStore', () => {
  let store: MessageInputStore;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new MessageInputStore();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Model Selection', () => {
    it('initializes model selection from storage', async () => {
      const initialModel = 'openai/gpt-4.1';
      vi.mocked(storageAdapter.getModelPreferences).mockResolvedValueOnce([initialModel]);
      const store = new MessageInputStore();
      await vi.waitFor(() => {
        expect(store.selectedModel).toBe(initialModel);
      });
    });

    it('uses default model when no stored model', async () => {
      vi.mocked(storageAdapter.getModelPreferences).mockResolvedValueOnce([]);
      const store = new MessageInputStore();
      await vi.waitFor(() => {
        expect(store.selectedModel).toBe(modelStore.models[0]);
      });
    });

    it('updates model and storage when setModel is called', async () => {
      const newModel = 'openai/gpt-4o-mini';
      await store.setModel(newModel);
      expect(store.selectedModel).toBe(newModel);
      expect(storageAdapter.setModelPreferences).toHaveBeenCalledWith([
        newModel,
        'openai/gpt-4.1'
      ]);
    });

    it('uses default model when setModel is called with empty string', async () => {
      await store.setModel('');
      expect(store.selectedModel).toBe(modelStore.models[0]);
      expect(storageAdapter.setModelPreferences).not.toHaveBeenCalled();
    });

    it('should initialize with the default model from preferences', async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(store.selectedModel).toBe('openai/gpt-4.1');
    });
  });

  describe('Message Handling', () => {
    it('prepares plain text message correctly', () => {
      store.setMessage('test message');
      const result = store.prepareMessage();
      expect(result).toBe('test message');
    });

    it('includes timestamp when enabled', () => {
      store.setMessage('test message');
      store.toggleTimestamp();
      
      // Mock video element
      const mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'currentTime', { value: 65 });
      document.querySelector = vi.fn().mockReturnValue(mockVideo);
      
      const result = store.prepareMessage();
      expect(result).toBe('§[1:05]§ test message');
    });

    it('prepares multimodal message when frame is captured', () => {
      store.setMessage('test message');
      store.setCapturedFrame('test-frame-data');
      
      const result = store.prepareMessage() as any[];
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'text',
        text: 'test message'
      });
      expect(result[1]).toEqual({
        type: 'image_url',
        image_url: {
          url: 'test-frame-data',
          detail: 'auto'
        }
      });
    });

    it('resets state correctly', () => {
      store.setMessage('test message');
      store.setCapturedFrame('test-frame-data');
      store.reset();
      
      expect(store.message).toBe('');
      expect(store.capturedFrame).toBeNull();
    });

    it('should properly format a message with timestamp', () => {
      vi.spyOn(store, 'getCurrentVideoTime').mockReturnValue('1:23');
      runInAction(() => {
        store.message = 'test message';
        store.isTimestampEnabled = true;
      });

      const formattedMessage = store.prepareMessage();
      expect(formattedMessage).toBe('§[1:23]§ test message');
    });

    it('should properly format a message with an image', () => {
      const imageUrl = 'data:image/png;base64,test';
      runInAction(() => {
        store.message = 'test message';
        store.capturedFrame = imageUrl;
      });

      const messageContent = store.prepareMessage() as any[];
      expect(messageContent).toHaveLength(2);
      expect(messageContent[0].type).toBe('text');
      expect(messageContent[0].text).toBe('test message');
      expect(messageContent[1].type).toBe('image_url');
      expect(messageContent[1].image_url.url).toBe(imageUrl);
    });
  });

  describe('Submit State', () => {
    it('prevents submission when disabled', () => {
      store.setMessage('test message');
      store.setDisabled(true);
      expect(store.canSubmit()).toBe(false);
    });

    it('prevents submission when send is disabled', () => {
      store.setMessage('test message');
      store.setSendDisabled(true);
      expect(store.canSubmit()).toBe(false);
    });

    it('prevents submission when message is empty and no frame', () => {
      store.setMessage('');
      store.setSendDisabled(false);
      expect(store.canSubmit()).toBe(false);
    });

    it('allows submission with captured frame even if message is empty', () => {
      store.setSendDisabled(false);
      store.setCapturedFrame('test-frame-data');
      expect(store.canSubmit()).toBe(true);
    });

    it('allows submission with message even if no frame', () => {
      store.setSendDisabled(false);
      store.setMessage('test message');
      expect(store.canSubmit()).toBe(true);
    });

    it('should return canSubmit() true only when conditions met', () => {
      // Default state
      expect(store.canSubmit()).toBe(false);
      
      // Has message but disabled
      runInAction(() => {
        store.message = 'test message';
        store.disabled = true;
        store.sendDisabled = false;
      });
      expect(store.canSubmit()).toBe(false);
      
      // Has message and not disabled
      runInAction(() => {
        store.disabled = false;
        store.sendDisabled = false;
      });
      expect(store.canSubmit()).toBe(true);
      
      // Has image but no message
      runInAction(() => {
        store.message = '';
        store.capturedFrame = 'data:image/png;base64,test';
      });
      expect(store.canSubmit()).toBe(true);
    });
  });
}); 