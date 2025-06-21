import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Settings } from './Settings';
import { modelStore } from './modelStore';
import { TranslationsProvider } from '../common/translations/Translations';
import type { Settings as SettingsType } from './types';

// Mock modelStore
vi.mock('./modelStore', () => ({
  modelStore: {
    init: vi.fn().mockResolvedValue(undefined),
    setProvider: vi.fn().mockResolvedValue(undefined),
    updateApiKey: vi.fn().mockResolvedValue(undefined),
    sortedAvailableModels: [],
    models: [],
    formatPrice: vi.fn(() => '$10.00M'),
    inputError: false,
    clearError: vi.fn(),
    addModel: vi.fn().mockResolvedValue(undefined),
    removeModel: vi.fn().mockResolvedValue(undefined),
  }
}));

// Mock chrome API
global.chrome = {
  runtime: {
    sendMessage: vi.fn()
  }
} as any;

describe('Settings Component', () => {
  const defaultSettings: SettingsType = {
    isDarkMode: false,
    apiKey: '',
    provider: 'openrouter',
    showSponsored: true,
    showSuggestedQuestions: true,
    selectedLocale: 'en',
    selectedSummaryLanguage: null,
    customModels: []
  };

  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSettings = (settings: Partial<SettingsType> = {}) => {
    return render(
      <TranslationsProvider>
        <Settings 
          settings={{ ...defaultSettings, ...settings }}
          onSettingsChange={mockOnSettingsChange}
        />
      </TranslationsProvider>
    );
  };

  describe('Provider Selection', () => {
    it('should render provider selection with OpenRouter selected by default', () => {
      renderSettings();
      
      const openRouterRadio = screen.getByRole('radio', { name: /OpenRouter/i });
      const openAIRadio = screen.getByRole('radio', { name: /OpenAI/i });
      
      expect(openRouterRadio).toBeChecked();
      expect(openAIRadio).not.toBeChecked();
    });

    it('should call onSettingsChange when provider is changed', () => {
      renderSettings();
      
      const openAIRadio = screen.getByRole('radio', { name: /OpenAI/i });
      fireEvent.click(openAIRadio);
      
      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'openai'
        })
      );
    });

    it('should update modelStore when provider changes', async () => {
      const { rerender } = renderSettings();
      
      const openAIRadio = screen.getByRole('radio', { name: /OpenAI/i });
      fireEvent.click(openAIRadio);
      
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'openai'
          })
        );
      });
      
      rerender(
        <TranslationsProvider>
          <Settings 
            settings={{ ...defaultSettings, provider: 'openai' }}
            onSettingsChange={mockOnSettingsChange}
          />
        </TranslationsProvider>
      );
      
      await waitFor(() => {
        expect(modelStore.setProvider).toHaveBeenCalledWith('openai');
      });
    });
  });

  describe('OpenRouter Configuration', () => {
    it('should show OpenRouter-specific configuration when OpenRouter is selected', () => {
      renderSettings({ provider: 'openrouter' });
      
      expect(screen.getByPlaceholderText('Enter your API key')).toBeInTheDocument();
      expect(screen.getByText(/Authenticate with OpenRouter/i)).toBeInTheDocument();
    });

    it('should show model selection for OpenRouter', () => {
      renderSettings({ provider: 'openrouter' });
      
      expect(screen.getByText('OpenRouter Models')).toBeInTheDocument();
      expect(screen.getByTestId('settings-model-select')).toBeInTheDocument();
    });

    it('should trigger OAuth when authenticate button is clicked', () => {
      renderSettings({ provider: 'openrouter' });
      
      const authButton = screen.getByText(/Authenticate with OpenRouter/i);
      fireEvent.click(authButton);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'start_openrouter_oauth'
      });
    });
  });

  describe('OpenAI Configuration', () => {
    it('should show OpenAI-specific configuration when OpenAI is selected', () => {
      renderSettings({ provider: 'openai' });
      
      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
      expect(screen.getByText(/Get your OpenAI API key/i)).toBeInTheDocument();
    });

    it('should show model selection for OpenAI', () => {
      renderSettings({ provider: 'openai' });
      
      expect(screen.getByText(/OpenAI Models/i)).toBeInTheDocument();
      expect(screen.getByTestId('settings-model-select')).toBeInTheDocument();
    });

    it('should show standard rates message for OpenAI', () => {
      renderSettings({ provider: 'openai' });
      
      expect(screen.getByText(/Standard OpenAI rates apply/i)).toBeInTheDocument();
    });
  });

  describe('API Key Management', () => {
    it('should show active status indicator when API key is present', () => {
      renderSettings({ apiKey: 'test-api-key' });
      
      const statusIndicator = screen.getByTestId('api-key-input')
        .parentElement?.querySelector('.settings__status-indicator');
      
      expect(statusIndicator).toHaveClass('active');
    });

    it('should call onSettingsChange when API key is updated', () => {
      renderSettings();
      
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });
      
      expect(mockOnSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'new-api-key'
        })
      );
    });

    it('should update modelStore when API key changes', async () => {
      renderSettings({ apiKey: 'test-key', provider: 'openai' });
      
      await waitFor(() => {
        expect(modelStore.updateApiKey).toHaveBeenCalledWith('openai', 'test-key');
      });
    });
  });

  describe('Other Settings', () => {
    it('should render dark mode toggle', () => {
      renderSettings();
      
      expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
    });

    it('should render sponsored content toggle', () => {
      renderSettings();
      
      expect(screen.getByTestId('show-sponsored-toggle')).toBeInTheDocument();
    });

    it('should render suggested questions toggle', () => {
      renderSettings();
      
      expect(screen.getByTestId('show-suggested-questions-toggle')).toBeInTheDocument();
    });

    it('should render language selector', () => {
      renderSettings();
      
      expect(screen.getByTestId('language-select')).toBeInTheDocument();
    });

    it('should render summary language selector', () => {
      renderSettings();
      
      expect(screen.getByTestId('summary-language-select')).toBeInTheDocument();
    });
  });

  describe('Provider Persistence', () => {
    it('should persist provider selection when switching providers', async () => {
      // Start with OpenRouter
      const { rerender } = renderSettings({ provider: 'openrouter' });
      
      // Switch to OpenAI
      const openAIRadio = screen.getByDisplayValue('openai');
      fireEvent.click(openAIRadio);
      
      // Verify provider change was called on parent
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'openai'
          })
        );
      });
      
      // Now rerender with the updated provider to simulate parent state update
      rerender(
        <TranslationsProvider>
          <Settings 
            settings={{ ...defaultSettings, provider: 'openai' }}
            onSettingsChange={mockOnSettingsChange}
          />
        </TranslationsProvider>
      );
      
      // Now verify modelStore.setProvider was called with the new provider
      await waitFor(() => {
        expect(modelStore.setProvider).toHaveBeenCalledWith('openai');
      });
      
      // Verify OpenAI is still selected
      await waitFor(() => {
        const openAIRadioAfterReopen = screen.getByDisplayValue('openai');
        expect(openAIRadioAfterReopen).toBeChecked();
      });
    });

    it('should persist provider selection when switching back to OpenRouter', async () => {
      // Start with OpenAI
      const { rerender } = renderSettings({ provider: 'openai' });
      
      // Switch to OpenRouter
      const openRouterRadio = screen.getByDisplayValue('openrouter');
      fireEvent.click(openRouterRadio);
      
      // Verify provider change was called on parent
      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'openrouter'
          })
        );
      });
      
      // Now rerender with the updated provider to simulate parent state update
      rerender(
        <TranslationsProvider>
          <Settings 
            settings={{ ...defaultSettings, provider: 'openrouter' }}
            onSettingsChange={mockOnSettingsChange}
          />
        </TranslationsProvider>
      );
      
      // Now verify modelStore.setProvider was called with the new provider
      await waitFor(() => {
        expect(modelStore.setProvider).toHaveBeenCalledWith('openrouter');
      });
      
      // Verify OpenRouter is still selected
      await waitFor(() => {
        const openRouterRadioAfterReopen = screen.getByDisplayValue('openrouter');
        expect(openRouterRadioAfterReopen).toBeChecked();
      });
    });

    it('should maintain provider-specific configuration when reopening settings', async () => {
      // Test with OpenAI configuration
      const { rerender } = renderSettings({ provider: 'openai', apiKey: 'sk-test-key' });
      
      // Verify OpenAI-specific UI is shown
      expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
      expect(screen.getByText(/OpenAI Models/i)).toBeInTheDocument();
      
      // Simulate closing and reopening settings
      rerender(
        <TranslationsProvider>
          <Settings 
            settings={{ ...defaultSettings, provider: 'openai', apiKey: 'sk-test-key' }}
            onSettingsChange={mockOnSettingsChange}
          />
        </TranslationsProvider>
      );
      
      // Verify OpenAI configuration is still shown
      await waitFor(() => {
        expect(screen.getByDisplayValue('openai')).toBeChecked();
        expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
        expect(screen.getByText(/OpenAI Models/i)).toBeInTheDocument();
      });
    });
  });
});