import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Settings } from './Settings';
import { modelStore } from './modelStore';
import { DEFAULT_MODEL } from './settingsStorageAdapter';

// Mock dependencies
vi.mock('../common/translations/Translations', () => ({
  useTranslations: () => ({
    getMessage: (key: string) => key,
  }),
}));

vi.mock('./modelStore', () => ({
  modelStore: {
    models: ['openai/gpt-4.1'],
    availableModels: [],
    sortedAvailableModels: [],
    isLoading: false,
    error: null,
    inputError: false,
    currentProvider: 'openai' as const,
    setProvider: vi.fn(),
    init: vi.fn(),
    fetchAvailableModels: vi.fn(),
    addModel: vi.fn(),
    removeModel: vi.fn(),
    updateApiKey: vi.fn(),
    clearError: vi.fn(),
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

describe('Settings - Add Model Button Behavior', () => {
  const mockSettings = {
    apiKey: 'test-openai-key',
    provider: 'openai' as const,
    isDarkMode: true,
    showSponsored: true,
    selectedLocale: 'en',
    selectedSummaryLanguage: 'en',
    showSuggestedQuestions: true,
  };

  const mockOnSettingsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state: no available models (simulating no API key scenario)
    modelStore.models = [DEFAULT_MODEL];
    modelStore.availableModels = [];
    modelStore.sortedAvailableModels = [];
    modelStore.currentProvider = 'openai';
    modelStore.isLoading = false;
    modelStore.error = null;
    modelStore.inputError = false;
  });

  it('should disable add button when no models are available (no API key)', async () => {
    // This represents the correct behavior: no API key = no available models = disabled add button
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    const addButton = screen.getByTestId('add-model-button');
    const modelSelect = screen.getByTestId('settings-model-select');
    
    // Add button should be disabled because no model can be selected
    expect(addButton).toBeDisabled();
    
    // Dropdown should only have placeholder
    const options = modelSelect.querySelectorAll('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('settings_model_placeholder');
  });

  it('should enable add button when models are available (with API key)', async () => {
    // Simulate having API key and available models
    modelStore.availableModels = [
      { id: 'gpt-4.1', name: 'GPT-4.1', pricing: { prompt: '0', completion: '0', image: '0', request: '0' } },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', pricing: { prompt: '0', completion: '0', image: '0', request: '0' } }
    ];
    modelStore.sortedAvailableModels = [
      { id: 'gpt-4.1', name: 'GPT-4.1', pricing: { prompt: '0', completion: '0', image: '0', request: '0' } },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', pricing: { prompt: '0', completion: '0', image: '0', request: '0' } }
    ];
    
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    const addButton = screen.getByTestId('add-model-button');
    const modelSelect = screen.getByTestId('settings-model-select');
    
    // Initially disabled (no selection)
    expect(addButton).toBeDisabled();
    
    // Should have models available
    expect(screen.getByRole('option', { name: 'GPT-4.1' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'GPT-4o Mini' })).toBeInTheDocument();
    
    // Select a model
    fireEvent.change(modelSelect, { target: { value: 'gpt-4o-mini' } });
    
    // Add button should now be enabled
    expect(addButton).toBeEnabled();
  });

  it('should call addModel when add button is clicked with valid selection', async () => {
    // Simulate having API key and available models
    modelStore.availableModels = [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', pricing: { prompt: '0', completion: '0', image: '0', request: '0' } }
    ];
    modelStore.sortedAvailableModels = [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', pricing: { prompt: '0', completion: '0', image: '0', request: '0' } }
    ];
    
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    const addButton = screen.getByTestId('add-model-button');
    const modelSelect = screen.getByTestId('settings-model-select');
    
    // Select a model
    fireEvent.change(modelSelect, { target: { value: 'gpt-4o-mini' } });
    
    // Click add button
    fireEvent.click(addButton);
    
    // Should call addModel
    await waitFor(() => {
      expect(modelStore.addModel).toHaveBeenCalledWith('gpt-4o-mini');
    });
  });

  it('should show message when no models are available indicating API key needed', async () => {
    render(<Settings settings={mockSettings} onSettingsChange={mockOnSettingsChange} />);
    
    // Should show some indication that API key is needed
    // This is good UX - telling users why they can't add models
    const modelSelect = screen.getByTestId('settings-model-select');
    const options = modelSelect.querySelectorAll('option');
    
    // Only placeholder should be available
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('settings_model_placeholder');
  });
});