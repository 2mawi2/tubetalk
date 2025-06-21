import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Settings } from './Settings';
import { modelStore } from './modelStore';
import { DEFAULT_MODEL } from './settingsStorageAdapter';
import storageAdapter from '../storage/storageAdapter';

// Mock dependencies
vi.mock('../common/translations/Translations', () => ({
  useTranslations: () => ({
    getMessage: (key: string) => key,
  }),
}));

vi.mock('./modelStore', () => ({
  modelStore: {
    models: [],
    availableModels: [],
    sortedAvailableModels: [],
    isLoading: false,
    error: null,
    inputError: false,
    currentProvider: 'openrouter',
    setProvider: vi.fn(),
    init: vi.fn(),
    fetchAvailableModels: vi.fn(),
    addModel: vi.fn(),
    removeModel: vi.fn(),
    updateApiKey: vi.fn(),
  },
}));

vi.mock('../storage/storageAdapter', () => ({
  default: {
    setCurrentProvider: vi.fn(),
    getProviderApiKey: vi.fn(),
    hasProviderKey: vi.fn(),
    getProviderModelPreferences: vi.fn(),
  },
}));

describe('Settings - Provider Switching with Models', () => {
  const mockSettings = {
    apiKey: 'test-key',
    provider: 'openrouter' as const,
    isDarkMode: true,
    showSponsored: true,
    selectedLocale: 'en',
    selectedSummaryLanguage: 'en',
    showSuggestedQuestions: true,
  };

  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    modelStore.models = [DEFAULT_MODEL, 'gpt-4o-mini'];
    modelStore.currentProvider = 'openrouter';
    modelStore.isLoading = false;
    modelStore.error = null;
  });

  it('should always show default model (gpt-4.1) for OpenAI provider', async () => {
    const openAISettings = { ...mockSettings, provider: 'openai' as const };
    
    render(<Settings settings={openAISettings} onSettingsChange={mockOnSettingsChange} />);
    
    await waitFor(() => {
      const defaultModelElement = screen.getByTestId(`model-item-${DEFAULT_MODEL}`);
      expect(defaultModelElement).toBeInTheDocument();
      expect(defaultModelElement.textContent).toContain(DEFAULT_MODEL);
      expect(defaultModelElement.textContent).toContain('defaultModelLabel');
    });
  });

  it('should always show default model (gpt-4.1) for OpenRouter provider', async () => {
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    await waitFor(() => {
      const defaultModelElement = screen.getByTestId(`model-item-${DEFAULT_MODEL}`);
      expect(defaultModelElement).toBeInTheDocument();
      expect(defaultModelElement.textContent).toContain(DEFAULT_MODEL);
      expect(defaultModelElement.textContent).toContain('defaultModelLabel');
    });
  });

  it('should update model list when switching providers', async () => {
    // Start with OpenRouter
    modelStore.models = [DEFAULT_MODEL, 'anthropic/claude-3-opus'];
    const { rerender } = render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    // Verify OpenRouter models
    await waitFor(() => {
      expect(screen.getByTestId(`model-item-${DEFAULT_MODEL}`)).toBeInTheDocument();
      expect(screen.getByTestId('model-item-anthropic/claude-3-opus')).toBeInTheDocument();
    });

    // Switch to OpenAI
    const openAIRadio = screen.getByDisplayValue('openai');
    fireEvent.click(openAIRadio);

    // Simulate model store update for OpenAI
    await act(async () => {
      modelStore.currentProvider = 'openai';
      modelStore.models = [DEFAULT_MODEL, 'gpt-4o-mini'];
      const openAISettings = { ...mockSettings, provider: 'openai' as const };
      rerender(<Settings settings={openAISettings} onSettingsChange={mockOnSettingsChange} />);
    });

    // Verify OpenAI models
    await waitFor(() => {
      expect(screen.getByTestId(`model-item-${DEFAULT_MODEL}`)).toBeInTheDocument();
      expect(screen.getByTestId('model-item-gpt-4o-mini')).toBeInTheDocument();
      expect(screen.queryByTestId('model-item-anthropic/claude-3-opus')).not.toBeInTheDocument();
    });
  });

  it('should call setProvider and init when provider changes', async () => {
    let currentSettings = { ...mockSettings };
    const mockOnSettingsChangeLocal = vi.fn((key: string, value: any) => {
      currentSettings = { ...currentSettings, [key]: value };
    });
    
    const { rerender } = render(<Settings settings={currentSettings} onSettingsChange={mockOnSettingsChangeLocal} />);
    
    // Clear any initial calls
    vi.clearAllMocks();
    
    const openAIRadio = screen.getByDisplayValue('openai');
    fireEvent.click(openAIRadio);

    // Simulate the settings change by re-rendering with updated provider
    const updatedSettings = { ...currentSettings, provider: 'openai' as const };
    rerender(<Settings settings={updatedSettings} onSettingsChange={mockOnSettingsChangeLocal} />);

    await waitFor(() => {
      expect(modelStore.setProvider).toHaveBeenCalledWith('openai');
      expect(modelStore.init).toHaveBeenCalled();
    });
  });

  it('should maintain default model across multiple provider switches', async () => {
    const { rerender } = render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    // Switch to OpenAI
    const openAIRadio = screen.getByDisplayValue('openai');
    fireEvent.click(openAIRadio);
    
    await act(async () => {
      modelStore.currentProvider = 'openai';
      modelStore.models = [DEFAULT_MODEL, 'gpt-4o-mini'];
      const openAISettings = { ...mockSettings, provider: 'openai' as const };
      rerender(<Settings settings={openAISettings} onSettingsChange={mockOnSettingsChange} />);
    });

    expect(screen.getByTestId(`model-item-${DEFAULT_MODEL}`)).toBeInTheDocument();

    // Switch back to OpenRouter
    const openRouterRadio = screen.getByDisplayValue('openrouter');
    fireEvent.click(openRouterRadio);
    
    await act(async () => {
      modelStore.currentProvider = 'openrouter';
      modelStore.models = [DEFAULT_MODEL, 'anthropic/claude-3-opus'];
      rerender(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    });

    expect(screen.getByTestId(`model-item-${DEFAULT_MODEL}`)).toBeInTheDocument();
  });

  it('should not allow removing the default model', async () => {
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    await waitFor(() => {
      const defaultModelElement = screen.getByTestId(`model-item-${DEFAULT_MODEL}`);
      expect(defaultModelElement).toBeInTheDocument();
      
      // Should not have a remove button for default model
      const removeButtons = defaultModelElement.querySelectorAll('.settings__remove-button');
      expect(removeButtons).toHaveLength(0);
    });
  });

  it('should show provider-specific custom models', async () => {
    // Mock storage to return different models for each provider
    storageAdapter.getProviderModelPreferences = vi.fn().mockImplementation(async (provider) => {
      if (provider === 'openrouter') {
        return [DEFAULT_MODEL, 'anthropic/claude-3-opus', 'meta-llama/llama-3-70b'];
      } else {
        return [DEFAULT_MODEL, 'gpt-4o-mini'];
      }
    });

    // Start with OpenRouter
    modelStore.models = [DEFAULT_MODEL, 'anthropic/claude-3-opus', 'meta-llama/llama-3-70b'];
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('model-item-anthropic/claude-3-opus')).toBeInTheDocument();
      expect(screen.getByTestId('model-item-meta-llama/llama-3-70b')).toBeInTheDocument();
    });
  });
});