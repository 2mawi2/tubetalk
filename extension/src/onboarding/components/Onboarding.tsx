import React, { useEffect, useState } from 'react';
import { useTranslations } from '../../common/translations/Translations';
import { useStorageListener } from '../../common/hooks/useStorageListener';
import storageAdapter from '../../storage/storageAdapter';
import './Onboarding.scss';

interface OnboardingProps {
  isVisible: boolean;
  initialHasKey: boolean;
}

type OnboardingView = 'selection' | 'openrouter-steps' | 'openai-redirect';

export const Onboarding: React.FC<OnboardingProps> = ({ isVisible, initialHasKey }) => {
  const { getMessage } = useTranslations();
  const [hasApiKey, setHasApiKey] = useState(initialHasKey);
  const [currentView, setCurrentView] = useState<OnboardingView>('selection');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const apiKeyUpdate = useStorageListener('openaiApiKey');

  useEffect(() => {
    if (apiKeyUpdate !== null) {
      setHasApiKey(true);
    }
  }, [apiKeyUpdate]);
  
  const handleOpenRouterLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    await storageAdapter.setCurrentProvider('openrouter');
    chrome.runtime.sendMessage({ action: 'start_openrouter_oauth' });
  };

  const handleOpenRouterSelection = () => {
    setCurrentView('openrouter-steps');
  };

  const handleOpenAISelection = async () => {
    setIsRedirecting(true);
    await storageAdapter.setCurrentProvider('openai');
    
    // Send message to open settings with OpenAI pre-selected
    chrome.runtime.sendMessage({ 
      action: 'open_settings',
      provider: 'openai'
    });
    
    // Small delay before closing to show the redirect state
    setTimeout(() => {
      setIsRedirecting(false);
      setCurrentView('openai-redirect');
    }, 500);
  };

  const handleBackToSelection = () => {
    setCurrentView('selection');
  };

  if (!isVisible || hasApiKey) return null;

  if (currentView === 'selection') {
    return (
      <div className="onboarding">
        <h1 className="onboarding__title">{getMessage('welcomeTitle')}</h1>
        <p className="onboarding__description">
          {getMessage('welcomeDescription')}
        </p>
        
        <h2 className="onboarding__subtitle">{getMessage('chooseProvider')}</h2>
        <p className="onboarding__subdescription">
          {getMessage('providerSelectionDescription')}
        </p>

        <div className="onboarding__provider-cards">
          <button 
            onClick={handleOpenRouterSelection}
            className="onboarding__provider-card"
            type="button"
          >
            <img 
              src="https://openrouter.ai/favicon.ico" 
              alt="OpenRouter" 
              className="onboarding__provider-icon" 
            />
            <h3 className="onboarding__provider-name">{getMessage('connectWithOpenRouter')}</h3>
            <p className="onboarding__provider-description">
              {getMessage('openRouterDescription')}
            </p>
          </button>

          <button 
            onClick={handleOpenAISelection}
            className="onboarding__provider-card"
            type="button"
            disabled={isRedirecting}
          >
            <img 
              src={chrome.runtime.getURL('icons/openai.svg')} 
              alt="OpenAI" 
              className="onboarding__provider-icon onboarding__provider-icon--openai" 
            />
            <h3 className="onboarding__provider-name">{getMessage('useOpenAIAPI')}</h3>
            <p className="onboarding__provider-description">
              {getMessage('openAIDescription')}
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'openrouter-steps') {
    return (
      <div className="onboarding">
        <button 
          onClick={handleBackToSelection}
          className="onboarding__back-button"
          type="button"
        >
          ← Back
        </button>

        <h1 className="onboarding__title">{getMessage('connectWithOpenRouter')}</h1>
        <p className="onboarding__description">
          {getMessage('openRouterDescription')}
        </p>
        
        <div className="onboarding__buttons">
          <button 
            onClick={handleOpenRouterLogin}
            className="onboarding__button"
            type="button"
            style={{ justifyContent: 'center' }}
          >
            <img 
              src="https://openrouter.ai/favicon.ico" 
              alt="OpenRouter" 
              className="onboarding__button-icon" 
            />
            {getMessage('getOpenRouterKey')}
          </button>
        </div>

        <div className="onboarding__steps">
          <div className="onboarding__step">
            <div className="onboarding__step-number">1</div>
            <div className="onboarding__step-text">
              {getMessage('step1CreateKey')}
            </div>
          </div>

          <div className="onboarding__step">
            <div className="onboarding__step-number">2</div>
            <div className="onboarding__step-text">
              {getMessage('step2CopyKey')}
            </div>
          </div>

          <div className="onboarding__step">
            <div className="onboarding__step-number">3</div>
            <div className="onboarding__step-text">
              {getMessage('step3PasteKey')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};