import React, { useEffect, useState } from 'react';
import { useTranslations } from '../../common/translations/Translations';
import { useStorageListener } from '../../common/hooks/useStorageListener';
import './Onboarding.scss';

interface OnboardingProps {
  isVisible: boolean;
  initialHasKey: boolean;
}

export const Onboarding: React.FC<OnboardingProps> = ({ isVisible, initialHasKey }) => {
  const { getMessage } = useTranslations();
  const [hasApiKey, setHasApiKey] = useState(initialHasKey);
  const apiKeyUpdate = useStorageListener('openaiApiKey');

  useEffect(() => {
    if (apiKeyUpdate !== null) {
      setHasApiKey(true);
    }
  }, [apiKeyUpdate]);
  
  const handleOpenRouterLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: 'start_openrouter_oauth' });
  };

  if (!isVisible || hasApiKey) return null;

  return (
    <div className="onboarding">
      <h1 className="onboarding__title">{getMessage('welcomeTitle')}</h1>
      <p className="onboarding__description">
        {getMessage('welcomeDescription')}
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
};