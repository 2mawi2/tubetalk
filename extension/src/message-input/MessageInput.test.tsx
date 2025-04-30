import { vi } from 'vitest';

vi.mock('../settings/modelStore', () => ({
  modelStore: {
    models: ['openai/gpt-4o-mini', 'openai/gpt-4.1-8b', 'openai/gpt-4'],
    availableModels: [
      { id: 'openai/gpt-4o-mini', name: 'GPT-4 Mini' },
      { id: 'openai/gpt-4.1-8b', name: 'Gemini Flash' },
      { id: 'openai/gpt-4', name: 'GPT-4' }
    ]
  }
}));

vi.mock('./messageInputStore', () => ({
  messageInputStore: {
    message: '',
    isTimestampEnabled: false,
    selectedModel: 'openai/gpt-4.1-8b',
    capturedFrame: null,
    disabled: false,
    sendDisabled: false,
    setMessage: vi.fn(),
    toggleTimestamp: vi.fn(),
    setModel: vi.fn(),
    setCapturedFrame: vi.fn(),
    setDisabled: vi.fn(),
    setSendDisabled: vi.fn(),
    prepareMessage: vi.fn(),
    reset: vi.fn(),
    canSubmit: vi.fn()
  }
}));

vi.mock('../storage/storageAdapter', () => ({
  default: {
    getModelPreferences: vi.fn(),
    setModelPreferences: vi.fn(),
    getFeatureFlag: vi.fn()
  }
}));

vi.mock('../common/translations/Translations', () => ({
  useTranslations: () => ({
    getMessage: (key: string) => {
      switch (key) {
        case 'removeFrameTooltip':
          return 'Remove frame';
        case 'messagePlaceholder':
          return 'Type a message...';
        case 'imageButtonTooltip':
          return 'Capture frame';
        case 'timestampButtonTooltip':
          return 'Include timestamp';
        case 'sendButtonTooltip':
          return 'Send';
        default:
          return key;
      }
    }
  }),
  TranslationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

import { render, fireEvent, waitFor, screen, act } from '@testing-library/react';
import { MessageInput } from './MessageInput';
import { messageInputStore } from './messageInputStore';
import storageAdapter from '../storage/storageAdapter';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TranslationsProvider } from '../common/translations/Translations';
import { modelStore } from '../settings/modelStore';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <TranslationsProvider>
      {ui}
    </TranslationsProvider>
  );
};

describe('MessageInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    messageInputStore.selectedModel = 'openai/gpt-4.1-8b';
    vi.mocked(messageInputStore.canSubmit).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('should call setModel when model is changed', async () => {
    renderWithProviders(<MessageInput onSendMessage={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('model-select')).toBeInTheDocument();
    });

    const modelSelect = screen.getByTestId('model-select');
    await act(async () => {
      fireEvent.change(modelSelect, { target: { value: 'openai/gpt-4' } });
    });

    await waitFor(() => {
      expect(messageInputStore.setModel).toHaveBeenCalledWith('openai/gpt-4');
    });
  });

  it('should call prepareMessage when submit button is clicked', async () => {
    messageInputStore.message = 'test message';
    vi.mocked(messageInputStore.canSubmit).mockReturnValue(true);
    
    renderWithProviders(<MessageInput onSendMessage={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    const submitButton = screen.getByTestId('send-button');
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(messageInputStore.prepareMessage).toHaveBeenCalled();
    });
  });

  // ... rest of the file ...
}); 
