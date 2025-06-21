import type { Settings as SettingsType } from './types'
import { Toggle } from '../common/components/Toggle'
import { Select, SelectOption } from '../common/components/Select'
import './Settings.scss'
import { useState, useEffect } from 'react'
import { useTranslations } from '../common/translations/Translations'
import { DEFAULT_MODEL } from './settingsStorageAdapter'
import { modelStore } from './modelStore'
import { observer } from 'mobx-react-lite'

interface SettingsProps {
  settings: SettingsType;
  onSettingsChange: (newSettings: SettingsType) => void;
}

export const Settings: React.FC<SettingsProps> = observer(({ 
  settings,
  onSettingsChange
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const { getMessage } = useTranslations();

  // Update parent component when models change
  useEffect(() => {
    handleSettingChange('customModels', modelStore.models);
  }, [modelStore.models]);

  const handleSettingChange = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const handleAddModel = async () => {
    if (!selectedModel) return;
    await modelStore.addModel(selectedModel);
    if (!modelStore.inputError) {
      setSelectedModel('');
    }
  };

  const handleRateExtension = () => {
    const reviewUrl = "https://chromewebstore.google.com/detail/tubetalk-youtube-ki-chat/cbclkjldgdhdnohefkdhlgmdogcnfhhj";
    window.open(reviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenRouterAuth = () => {
    chrome.runtime.sendMessage({ action: 'start_openrouter_oauth' });
  };

  const formatModelDisplay = (modelId: string): string => {
    // For OpenRouter, remove provider prefixes for cleaner display
    if (settings.provider === 'openrouter' && modelId.includes('/')) {
      return modelId.split('/').pop() || modelId;
    }
    return modelId;
  };

  const handleProviderChange = (provider: 'openrouter' | 'openai') => {
    handleSettingChange('provider', provider);
  };

  // Initialize store and update provider
  useEffect(() => {
    const initializeStore = async () => {
      await modelStore.setProvider(settings.provider || 'openrouter');
      await modelStore.init();
    };
    initializeStore();
  }, []);

  // Update provider in model store when it changes
  useEffect(() => {
    modelStore.setProvider(settings.provider || 'openrouter');
  }, [settings.provider]);

  // Update API key in model store when it changes
  useEffect(() => {
    if (settings.apiKey) {
      modelStore.updateApiKey(settings.provider || 'openrouter', settings.apiKey);
    }
  }, [settings.apiKey, settings.provider]);

  const BASE_LANGUAGE_OPTIONS: SelectOption[] = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'hi', label: 'हिंदी' },
    { value: 'pt', label: 'Português' },
    { value: 'ar', label: 'العربية' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'fr', label: 'Français' },
    { value: 'ru', label: 'Русский' },
    { value: 'ja', label: '日本語' },
    { value: 'de', label: 'Deutsch' },
  ];

  const SUMMARY_LANGUAGE_OPTIONS: SelectOption[] = [
    { value: '', label: getMessage('autoLanguage') },
    ...BASE_LANGUAGE_OPTIONS
  ];

  return (
    <div className="settings" data-testid="settings-panel">
      <div className="settings__content">
        <div className="settings__input-group settings__provider-group">
          <h2>{getMessage('providerSelectionLabel') || 'AI Provider'}</h2>
          <div className="settings__provider-options">
            <label className="settings__provider-option">
              <input
                type="radio"
                name="provider"
                value="openrouter"
                checked={settings.provider === 'openrouter'}
                onChange={() => handleProviderChange('openrouter')}
                className="settings__provider-radio"
              />
              <div className="settings__provider-label">
                <span className="settings__provider-name">OpenRouter</span>
                <span className="settings__provider-description">{getMessage('openRouterDescription') || 'Access multiple AI models'}</span>
              </div>
            </label>
            <label className="settings__provider-option">
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={settings.provider === 'openai'}
                onChange={() => handleProviderChange('openai')}
                className="settings__provider-radio"
              />
              <div className="settings__provider-label">
                <span className="settings__provider-name">OpenAI</span>
                <span className="settings__provider-description">{getMessage('openAIDescription') || 'Direct OpenAI API access'}</span>
              </div>
            </label>
          </div>
        </div>

        <div className="settings__input-group">
          <h2>{getMessage('apiKeyLabel')}</h2>
          {settings.provider === 'openrouter' ? (
            <>
              <div className="settings__input-row">
                <div className="settings__input-wrapper">
                  <input 
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                    placeholder={getMessage('apiKeyPlaceholder')}
                    className="settings__input"
                    data-testid="api-key-input"
                  />
                  <div 
                    className="settings__input-status"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <div className={`settings__status-indicator ${settings.apiKey ? 'active' : ''}`} />
                    {showTooltip && (
                      <div className="settings__tooltip">
                        {settings.apiKey ? getMessage('apiKeyLoaded') : 'No API Key Set'}
                      </div>
                    )}
                  </div>
                </div>
                <button className="settings__save-button" data-testid="save-api-key-button">
                  {getMessage('saveKeyButton')}
                </button>
              </div>
              <button 
                onClick={handleOpenRouterAuth}
                className="settings__oauth-button"
                type="button"
              >
                <img 
                  src="https://openrouter.ai/favicon.ico" 
                  alt="OpenRouter" 
                  className="settings__oauth-icon" 
                />
                {getMessage('authenticateWithOpenRouter') || 'Authenticate with OpenRouter'}
              </button>
            </>
          ) : (
            <>
              <div className="settings__input-row">
                <div className="settings__input-wrapper">
                  <input 
                    type="password"
                    value={settings.apiKey}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                    placeholder={getMessage('openAIApiKeyPlaceholder') || 'sk-...'}
                    className="settings__input"
                    data-testid="api-key-input"
                  />
                  <div 
                    className="settings__input-status"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <div className={`settings__status-indicator ${settings.apiKey ? 'active' : ''}`} />
                    {showTooltip && (
                      <div className="settings__tooltip">
                        {settings.apiKey ? getMessage('apiKeyLoaded') : 'No API Key Set'}
                      </div>
                    )}
                  </div>
                </div>
                <button className="settings__save-button" data-testid="save-api-key-button">
                  {getMessage('saveKeyButton')}
                </button>
              </div>
              <div className="settings__help-text">
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="settings__help-link"
                >
                  {getMessage('getOpenAIKey') || 'Get your OpenAI API key'}
                </a>
              </div>
            </>
          )}
        </div>

        <Toggle
          checked={settings.isDarkMode}
          onChange={(checked) => handleSettingChange('isDarkMode', checked)}
          label={getMessage('darkModeLabel')}
          data-testid="dark-mode-toggle"
        />

        <Toggle
          checked={settings.showSponsored}
          onChange={(checked) => handleSettingChange('showSponsored', checked)}
          label={getMessage('showSponsoredLabel')}
          data-testid="show-sponsored-toggle"
        />

        <Toggle
          checked={settings.showSuggestedQuestions}
          onChange={(checked) => handleSettingChange('showSuggestedQuestions', checked)}
          label={getMessage('showSuggestedQuestionsLabel')}
          data-testid="show-suggested-questions-toggle"
        />

        {/* Subtle rating section integrated as a normal toggle-like row */}
        <div className="setting-row settings__rate-row" data-testid="rate-row" onClick={handleRateExtension}>
          <div className="settings__rate-label">
            <span className="settings__rate-star">★</span>
            <span>{getMessage('rateButton')}</span>
          </div>
          <div className="settings__rate-icon">→</div>
        </div>

        <div className="setting-row settings__language-row">
          <Select
            id="language-select"
            value={settings.selectedLocale}
            onChange={(value) => handleSettingChange('selectedLocale', value)}
            options={BASE_LANGUAGE_OPTIONS}
            label={getMessage('languageLabel')}
            className="settings__select"
            testId="language-select"
          />
        </div>

        <div className="setting-row settings__language-row">
          <Select
            value={settings.selectedSummaryLanguage || ''}
            onChange={(value) => handleSettingChange('selectedSummaryLanguage', value === '' ? null : value)}
            options={SUMMARY_LANGUAGE_OPTIONS}
            label={getMessage('summaryLanguageLabel')}
            className="settings__select"
            testId="summary-language-select"
          />
        </div>

        {settings.provider === 'openrouter' && (
          <div className="settings__input-group">
            <h2>{getMessage('modelSelectionLabel')}</h2>
            <div className="settings__input-container">
              <select
                className={`settings__select ${modelStore.inputError ? 'settings__select--error' : ''}`}
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  modelStore.clearError();
                }}
                data-testid="settings-model-select"
              >
                <option value="">{getMessage('settings_model_placeholder')}</option>
                {modelStore.sortedAvailableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({modelStore.formatPrice(model)})
                  </option>
                ))}
              </select>
            <button
              className="settings__add-button"
              onClick={handleAddModel}
              disabled={!selectedModel}
              data-testid="add-model-button"
            >
              {getMessage('settings_add_model')}
            </button>
            <div className={`settings__error-message ${modelStore.inputError ? 'settings__error-message--visible' : ''}`}>
              <span className="settings__error-text">{getMessage('settings_model_duplicate')}</span>
            </div>
          </div>

          <div className="settings__models-wrapper">
            <div className="settings__models-list">
              {modelStore.models.map((model) => (
                <div 
                  key={model} 
                  className={`settings__model-item ${model === DEFAULT_MODEL ? 'settings__model-item--default' : ''}`}
                  data-testid={`model-item-${model}`}
                >
                  <span>
                    {formatModelDisplay(model)}
                    {model === DEFAULT_MODEL && (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px', fontStyle: 'italic' }}>
                        {getMessage('defaultModelLabel')}
                      </span>
                    )}
                  </span>
                  {model !== DEFAULT_MODEL && (
                    <button
                      className="settings__remove-button"
                      onClick={() => modelStore.removeModel(model)}
                      data-testid={`remove-model-${model}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {settings.provider === 'openai' && (
          <div className="settings__input-group">
            <h2>{getMessage('openAIModelSelectionLabel') || 'OpenAI Models'}</h2>
            <div className="settings__input-container">
              <select
                className={`settings__select ${modelStore.inputError ? 'settings__select--error' : ''}`}
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  modelStore.clearError();
                }}
                data-testid="settings-model-select"
              >
                <option value="">{getMessage('settings_model_placeholder')}</option>
                {modelStore.sortedAvailableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <button
                className="settings__add-button"
                onClick={handleAddModel}
                disabled={!selectedModel}
                data-testid="add-model-button"
              >
                {getMessage('settings_add_model')}
              </button>
              <div className={`settings__error-message ${modelStore.inputError ? 'settings__error-message--visible' : ''}`}>
                <span className="settings__error-text">{getMessage('settings_model_duplicate')}</span>
              </div>
            </div>

            <div className="settings__models-wrapper">
              <div className="settings__models-list">
                {modelStore.models.map((model) => (
                  <div 
                    key={model} 
                    className={`settings__model-item ${model === DEFAULT_MODEL ? 'settings__model-item--default' : ''}`}
                    data-testid={`model-item-${model}`}
                  >
                    <span>
                      {formatModelDisplay(model)}
                      {model === DEFAULT_MODEL && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px', fontStyle: 'italic' }}>
                          {getMessage('defaultModelLabel')}
                        </span>
                      )}
                    </span>
                    {model !== DEFAULT_MODEL && (
                      <button
                        className="settings__remove-button"
                        onClick={() => modelStore.removeModel(model)}
                        data-testid={`remove-model-${model}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="settings__model-info">
              <span className="settings__model-info-text">
                {getMessage('openAIModelInfo') || 'Standard OpenAI rates apply'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
})
