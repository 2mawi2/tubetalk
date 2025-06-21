import React, { useState } from 'react';
import { useTranslations } from '../../common/translations/Translations';
import storageAdapter from '../../storage/storageAdapter';
import './Tutorial.scss';

interface GettingStartedProps {
  isVisible: boolean;
  hasAnyProvider?: boolean;
}

export const GettingStarted: React.FC<GettingStartedProps> = ({ isVisible, hasAnyProvider = true }) => {
  const { getMessage } = useTranslations();
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  if (!isVisible) return null;

  const handleOpenRouterSelection = async () => {
    await storageAdapter.setCurrentProvider('openrouter');
    chrome.runtime.sendMessage({ action: 'start_openrouter_oauth' });
  };

  const handleOpenAISelection = async () => {
    setIsRedirecting(true);
    await storageAdapter.setCurrentProvider('openai');

    // Send message to open settings with OpenAI pre-selected
    chrome.runtime.sendMessage({
      action: 'open_settings',
      provider: 'openai'
    });

    // Small delay before resetting redirect state
    setTimeout(() => {
      setIsRedirecting(false);
    }, 500);
  };

  // Show provider selection if no provider is configured
  if (!hasAnyProvider) {
    return (
      <div className="tutorial">
        <h2 className="tutorial__title">{getMessage('tutorialTitle')}</h2>
        <p className="tutorial__description">
          {getMessage('tutorialDescription')}
        </p>

        <div className="tutorial__steps">
          <div className="tutorial__step tutorial__step--provider-selection">
            <div className="tutorial__step-number">0</div>
            <div className="tutorial__step-content">
              <h3 className="tutorial__step-title">{getMessage('chooseProvider')}</h3>
              <p className="tutorial__step-subtitle">{getMessage('providerSelectionDescription')}</p>

              <div className="tutorial__provider-buttons">
                <button
                  onClick={handleOpenRouterSelection}
                  className="tutorial__provider-button"
                  type="button"
                >
                  <img
                    src="https://openrouter.ai/favicon.ico"
                    alt="OpenRouter"
                    className="tutorial__provider-icon"
                  />
                  <div className="tutorial__provider-text">
                    <span className="tutorial__provider-name">{getMessage('connectWithOpenRouter')}</span>
                    <span className="tutorial__provider-desc">{getMessage('openRouterDescription')}</span>
                  </div>
                </button>

                <button
                  onClick={handleOpenAISelection}
                  className="tutorial__provider-button"
                  type="button"
                  disabled={isRedirecting}
                >
                  <img
                    src={chrome.runtime.getURL('icons/openai.svg')}
                    alt="OpenAI"
                    className="tutorial__provider-icon tutorial__provider-icon--openai"
                  />
                  <div className="tutorial__provider-text">
                    <span className="tutorial__provider-name">{getMessage('useOpenAIAPI')}</span>
                    <span className="tutorial__provider-desc">{getMessage('openAIDescription')}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show regular tutorial steps when provider is configured
  return (
    <div className="tutorial">
      <h2 className="tutorial__title">{getMessage('tutorialTitle')}</h2>
      <p className="tutorial__description">
        {getMessage('tutorialDescription')}
      </p>
      
      <div className="tutorial__steps">
        <div className="tutorial__step">
          <div className="tutorial__step-number">1</div>
          <div className="tutorial__step-content">
            {getMessage('tutorialStep1')}
          </div>
        </div>

        <div className="tutorial__step">
          <div className="tutorial__step-number">2</div>
          <div className="tutorial__step-content">
            {getMessage('tutorialStep2')}
          </div>
        </div>

        <div className="tutorial__step">
          <div className="tutorial__step-number">3</div>
          <div className="tutorial__step-content">
            {getMessage('tutorialStep3')}
          </div>
        </div>

        <div className="tutorial__step">
          <div className="tutorial__step-number">4</div>
          <div className="tutorial__step-content">
            {getMessage('tutorialStep4')}
          </div>
        </div>
      </div>

      <div className="tutorial__note">
        <p>
          <strong>{getMessage('tutorialNote')}</strong>
        </p>
      </div>
    </div>
  );
};