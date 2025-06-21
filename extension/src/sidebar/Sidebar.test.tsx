import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from './sidebarStore';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import { OpenRouterApiAdapter } from '../common/adapters/ApiAdapter';
import type { StorageAdapter } from '../storage/types';
import type { Message } from '../messages/components/Messages';
import { useTranslations } from '../common/translations/Translations';
import storageAdapter from '../storage/storageAdapter';

// Mock chrome API
(global as any).chrome = {
  runtime: {
    getURL: vi.fn((path: string) => path)
  }
};

vi.mock('../common/adapters/ApiAdapter', () => ({
  OpenRouterApiAdapter: vi.fn().mockImplementation((_: string, getModelPreferences: () => Promise<string[]>) => ({
    generateStreamResponse: vi.fn(),
    getModelPreferences
  }))
}));

vi.mock('../common/adapters/PromptAdapter', () => ({
  ChromePromptAdapter: vi.fn().mockImplementation(() => ({
    getSystemPrompt: vi.fn().mockResolvedValue('System prompt'),
    getSponsoredPrompt: vi.fn().mockResolvedValue('Sponsored prompt')
  }))
}));

vi.mock('../tutorial', () => ({
  useVideoId: () => 'test-video-id',
  Tutorial: () => null
}));

vi.mock('../onboarding/components/Onboarding', () => ({
  Onboarding: () => null
}));

vi.mock('../common/translations/Translations', () => ({
  useTranslations: vi.fn()
}));

// Mock the Messages component
vi.mock('../messages/components/Messages', () => ({
  Messages: vi.fn().mockImplementation(({ messages, onStreamingStateChange, onErrorStateChange }) => {
    React.useEffect(() => {
      // Simulate initial streaming state
      onStreamingStateChange?.(true);
      
      // If there's an error message, trigger error state
      if (messages?.some((msg: Message) => msg.error)) {
        onErrorStateChange?.(true);
      }
    }, [messages, onStreamingStateChange, onErrorStateChange]);
    
    return null;
  })
}));

// Mock the MessageInput component
vi.mock('../messages/MessageInput', () => ({
  MessageInput: vi.fn().mockImplementation(({ sendDisabled, isStreaming, hasError }) => (
    <div>
      <button data-testid="send-button" disabled={sendDisabled || isStreaming || hasError}>Send</button>
      <button data-testid="image-button" disabled={hasError}>Image</button>
      <select data-testid="model-select">
        <option value="test">Test Model</option>
      </select>
      <textarea data-testid="yt-sidebar-chatInput" disabled={hasError} />
    </div>
  ))
}));

// Mock the Settings component to properly handle changes
vi.mock('../settings/Settings', () => ({
  Settings: vi.fn().mockImplementation(({ settings, onSettingsChange }) => (
    <div>
      <input
        type="checkbox"
        data-testid="dark-mode-toggle"
        checked={settings.isDarkMode}
        onChange={(e) => onSettingsChange({ ...settings, isDarkMode: e.target.checked })}
      />
    </div>
  ))
}));

vi.mock('../storage/storageAdapter', () => ({
  default: {
    getApiKey: vi.fn(),
    setApiKey: vi.fn(),
    getDarkMode: vi.fn(),
    setDarkMode: vi.fn(),
    getShowSponsored: vi.fn(),
    setShowSponsored: vi.fn(),
    getLanguage: vi.fn(),
    setLanguage: vi.fn(),
    getModelPreferences: vi.fn(),
    setModelPreferences: vi.fn()
  }
}));

const mockStorageAdapter: StorageAdapter = {
  getDarkMode: vi.fn().mockResolvedValue(false),
  getApiKey: vi.fn().mockResolvedValue({ openaiApiKey: 'test-key' }),
  getShowSponsored: vi.fn().mockResolvedValue(true),
  getSelectedLocale: vi.fn().mockResolvedValue({ selectedLocale: 'en' }),
  setDarkMode: vi.fn().mockResolvedValue(undefined),
  setApiKey: vi.fn().mockResolvedValue(undefined),
  setShowSponsored: vi.fn().mockResolvedValue(undefined),
  setSelectedLocale: vi.fn().mockResolvedValue(undefined),
  getModelPreferences: vi.fn().mockResolvedValue(undefined),
  getStorageValue: vi.fn().mockResolvedValue(undefined),
  setStorageValue: vi.fn().mockResolvedValue(undefined),
  setModelPreferences: vi.fn().mockResolvedValue(undefined),
  getSelectedSummaryLanguage: vi.fn().mockResolvedValue('en'),
  setSelectedSummaryLanguage: vi.fn().mockResolvedValue(undefined),
  getShowSuggestedQuestions: vi.fn().mockResolvedValue(true),
  setShowSuggestedQuestions: vi.fn().mockResolvedValue(undefined),
  migrateStorage: vi.fn().mockResolvedValue(undefined),
  getCurrentProvider: vi.fn().mockResolvedValue('openrouter'),
  setCurrentProvider: vi.fn().mockResolvedValue(undefined),
  getProviderConfig: vi.fn().mockResolvedValue({ apiKey: null, modelPreferences: [] }),
  setProviderApiKey: vi.fn().mockResolvedValue(undefined),
  getProviderApiKey: vi.fn().mockResolvedValue(null),
  setProviderModelPreferences: vi.fn().mockResolvedValue(undefined),
  getProviderModelPreferences: vi.fn().mockResolvedValue([]),
  getCurrentProviderConfig: vi.fn().mockResolvedValue({ apiKey: null, modelPreferences: [] }),
  hasProviderKey: vi.fn().mockResolvedValue(true)
};

describe('Sidebar', () => {
  const mockOnClose = vi.fn();
  const mockGetMessage = vi.fn((_: string) => 'Test Message');
  const mockSetLocale = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTranslations as Mock).mockReturnValue({
      getMessage: mockGetMessage,
      setLocale: mockSetLocale
    });
    (storageAdapter.getApiKey as Mock).mockResolvedValue('test-key');
    (storageAdapter.getDarkMode as Mock).mockResolvedValue(false);
    (storageAdapter.getShowSponsored as Mock).mockResolvedValue(false);
    (storageAdapter.getModelPreferences as Mock).mockResolvedValue(['openai/gpt-4o-mini']);
    document.documentElement.setAttribute('data-theme', 'light');
    useSidebarStore.setState({
      showSettings: false,
      isInitialized: false,
      settings: {
        isDarkMode: false,
        apiKey: '',
        provider: 'openrouter',
        showSponsored: true,
        selectedLocale: 'en',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      },
      messages: [],
      apiAdapter: undefined
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders without crashing', async () => {
    render(<Sidebar onClose={() => {}} storageAdapter={mockStorageAdapter} />);
    await waitFor(() => {
      expect(screen.getByTestId('close-button')).toBeInTheDocument();
    });
  });

  it('toggles settings panel when settings button is clicked', async () => {
    render(<Sidebar onClose={() => {}} storageAdapter={mockStorageAdapter} />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(mockStorageAdapter.getDarkMode).toHaveBeenCalled();
    });
    
    const settingsButton = screen.getByTestId('settings-button');
    const settingsPanel = screen.getByTestId('settings-panel-container');
    
    expect(settingsPanel).not.toHaveClass('visible');
    
    userEvent.click(settingsButton);
    
    await waitFor(() => {
      expect(settingsPanel).toHaveClass('visible');
    });
  });

  it('initializes settings from storage adapter', async () => {
    const customStorageAdapter = {
      ...mockStorageAdapter,
      getDarkMode: vi.fn().mockResolvedValue(true),
      getApiKey: vi.fn().mockResolvedValue({ openaiApiKey: 'test-key' }),
      getShowSponsored: vi.fn().mockResolvedValue(false),
      getSelectedLocale: vi.fn().mockResolvedValue({ selectedLocale: 'de' })
    };

    render(<Sidebar onClose={() => {}} storageAdapter={customStorageAdapter} />);

    // Wait for initialization to complete
    await waitFor(() => {
      expect(customStorageAdapter.getDarkMode).toHaveBeenCalled();
      expect(customStorageAdapter.getApiKey).toHaveBeenCalled();
      expect(customStorageAdapter.getShowSponsored).toHaveBeenCalled();
      expect(customStorageAdapter.getSelectedLocale).toHaveBeenCalled();
    });

    // Then check the state
    await waitFor(() => {
      const state = useSidebarStore.getState();
      expect(state.settings.isDarkMode).toBe(true);
      expect(state.settings.apiKey).toBe('test-key');
      expect(state.settings.showSponsored).toBe(false);
      expect(state.settings.selectedLocale).toBe('de');
      expect(state.settings.customModels).toEqual([]);
    });
  });

  it('creates API adapter when API key is set', async () => {
    const customStorageAdapter = {
      ...mockStorageAdapter,
      getApiKey: vi.fn().mockResolvedValue({ openaiApiKey: 'test-key' })
    };

    render(<Sidebar onClose={() => {}} storageAdapter={customStorageAdapter} />);

    await waitFor(() => {
      expect(OpenRouterApiAdapter).toHaveBeenCalledWith(
        'test-key',
        expect.any(Function)
      );
    });
  });

  it('updates settings in storage when changed', async () => {
    const customStorageAdapter = {
      ...mockStorageAdapter,
      getDarkMode: vi.fn().mockResolvedValue(false),
      getApiKey: vi.fn().mockResolvedValue({ openaiApiKey: '' }),
      getShowSponsored: vi.fn().mockResolvedValue(true),
      getSelectedLocale: vi.fn().mockResolvedValue({ selectedLocale: 'en' }),
      setDarkMode: vi.fn().mockResolvedValue(undefined),
      setApiKey: vi.fn().mockResolvedValue(undefined),
      setShowSponsored: vi.fn().mockResolvedValue(undefined),
      setSelectedLocale: vi.fn().mockResolvedValue(undefined)
    };

    const user = userEvent.setup({ delay: null });
    render(<Sidebar onClose={() => {}} storageAdapter={customStorageAdapter} />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(customStorageAdapter.getDarkMode).toHaveBeenCalled();
    });

    // Get the toggle and verify initial state
    const darkModeToggle = screen.getByTestId('dark-mode-toggle') as HTMLInputElement;
    expect(darkModeToggle.checked).toBe(false);
    expect(useSidebarStore.getState().settings.isDarkMode).toBe(false);

    // Click the toggle using userEvent
    await user.click(darkModeToggle);

    // Wait for the store to update first
    await waitFor(() => {
      expect(useSidebarStore.getState().settings.isDarkMode).toBe(true);
    });

    // Then verify all the changes
    await waitFor(() => {
      expect(darkModeToggle.checked).toBe(true);
      expect(customStorageAdapter.setDarkMode).toHaveBeenCalledWith(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  it('updates theme when dark mode is toggled', async () => {
    const customStorageAdapter = {
      ...mockStorageAdapter,
      getDarkMode: vi.fn().mockResolvedValue(false),
      getApiKey: vi.fn().mockResolvedValue({ openaiApiKey: '' }),
      getShowSponsored: vi.fn().mockResolvedValue(true),
      getSelectedLocale: vi.fn().mockResolvedValue({ selectedLocale: 'en' })
    };

    const user = userEvent.setup({ delay: null });
    render(<Sidebar onClose={() => {}} storageAdapter={customStorageAdapter} />);

    // Wait for initialization
    await waitFor(() => {
      expect(customStorageAdapter.getDarkMode).toHaveBeenCalled();
    });

    // Get the toggle and verify initial state
    const darkModeToggle = screen.getByTestId('dark-mode-toggle') as HTMLInputElement;
    expect(darkModeToggle.checked).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click the toggle using userEvent
    await user.click(darkModeToggle);

    // Verify theme was updated
    await waitFor(() => {
      expect(darkModeToggle.checked).toBe(true);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Sidebar onClose={onClose} storageAdapter={mockStorageAdapter} />);

    // Wait for initialization
    await waitFor(() => {
      expect(mockStorageAdapter.getDarkMode).toHaveBeenCalled();
    });

    const closeButton = screen.getByTestId('close-button');
    userEvent.click(closeButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('has a link to github.com around logo and title', async () => {
    render(<Sidebar onClose={mockOnClose} storageAdapter={mockStorageAdapter} />);

    // Wait for the sidebar to render fully
    await waitFor(() => {
      expect(screen.getByTestId('sidebar-header')).toBeInTheDocument();
    });

    const titleLink = screen.getByTestId('sidebar-header').querySelector('a');
    expect(titleLink).toBeInTheDocument();
    expect(titleLink).toHaveAttribute('href', 'https://github.com/2mawi2/tubetalk');
  });

  it('updates messages in store', async () => {
    render(<Sidebar onClose={() => {}} storageAdapter={mockStorageAdapter} />);

    const newMessages = [
      { id: '1', role: 'user' as const, content: 'Hello' },
      { id: '2', role: 'assistant' as const, content: 'Hi there' }
    ];

    const { setMessages } = useSidebarStore.getState();
    setMessages(newMessages);

    await waitFor(() => {
      expect(useSidebarStore.getState().messages).toEqual(newMessages);
    });
  });

  // New MessageInput state tests
  describe('MessageInput States', () => {
    beforeEach(async () => {
      // Set up store with API key and adapter
      useSidebarStore.setState({
        ...useSidebarStore.getState(),
        settings: {
          ...useSidebarStore.getState().settings,
          apiKey: 'test-key'
        },
        apiAdapter: new OpenRouterApiAdapter('test-key', async () => ['test-model'])
      });
    });

    it('renders MessageInput with correct initial state', async () => {
      await act(async () => {
        render(<Sidebar onClose={() => {}} storageAdapter={mockStorageAdapter} />);
      });

      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('keeps MessageInput send button disabled while streaming', async () => {
      await act(async () => {
        render(<Sidebar onClose={() => {}} storageAdapter={mockStorageAdapter} />);
      });

      const sendButton = screen.getByTestId('send-button');
      const imageButton = screen.getByTestId('image-button');

      expect(sendButton).toBeDisabled();
      expect(imageButton).not.toBeDisabled();
    });

    it('disables all MessageInput controls when error occurs', async () => {
      render(<Sidebar onClose={mockOnClose} storageAdapter={mockStorageAdapter} />);
      
      // Wait for initialization
      await waitFor(() => {
        expect(mockStorageAdapter.getDarkMode).toHaveBeenCalled();
      });
      
      // Add an error message to trigger error state
      act(() => {
        useSidebarStore.setState({
          messages: [{ id: '1', content: 'Error message', role: 'assistant', error: true }]
        });
      });

      const sendButton = screen.getByTestId('send-button');
      const imageButton = screen.getByTestId('image-button');
      const modelSelect = screen.getByTestId('model-select');
      const textarea = screen.getByTestId('yt-sidebar-chatInput');

      expect(sendButton).toBeDisabled();
      expect(imageButton).toBeDisabled();
      expect(modelSelect).not.toBeDisabled();
      expect(textarea).toBeDisabled();
    });
  });
}); 