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

  // Initialize store
  useEffect(() => {
    modelStore.init();
  }, []);

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
        <div className="settings__input-group">
          <h2>{getMessage('apiKeyLabel')}</h2>
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
                    {model}
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
      </div>
    </div>
  );
})
