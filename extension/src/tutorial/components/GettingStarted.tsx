import React from 'react';
import { useTranslations } from '../../common/translations/Translations';
import './Tutorial.scss';

interface GettingStartedProps {
  isVisible: boolean;
}

export const GettingStarted: React.FC<GettingStartedProps> = ({ isVisible }) => {
  const { getMessage } = useTranslations();
  
  if (!isVisible) return null;

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