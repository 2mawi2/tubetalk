import React from 'react';
import { modelStore } from '../settings/modelStore';
import { observer } from 'mobx-react-lite';

interface InputControlsProps {
  onImageCapture: () => void;
  onTimestampToggle: () => void;
  onModelChange: (model: string) => void;
  onSendMessage: () => void;
  isTimestampEnabled: boolean;
  selectedModel: string;
  disabled: boolean;
  sendDisabled: boolean;
}

export const InputControls: React.FC<InputControlsProps> = observer(({
  onImageCapture,
  onTimestampToggle,
  onModelChange,
  onSendMessage,
  isTimestampEnabled,
  selectedModel,
  disabled,
  sendDisabled
}) => {
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    if (newModel) {
      onModelChange(newModel);
    }
  };

  return (
    <div className="button-row">
      <div className="left-buttons">
        <button 
          id="yt-sidebar-imageButton" 
          title="Capture frame"
          disabled={disabled}
          data-testid="image-button"
          onClick={onImageCapture}
        >
          <svg className="image-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
          </svg>
        </button>
        <button 
          id="yt-sidebar-timestampButton"
          className={`timestamp-button ${isTimestampEnabled ? 'selected' : ''}`}
          onClick={onTimestampToggle}
          title="Include timestamp"
          disabled={disabled}
          data-testid="timestamp-button"
        >
          <svg className="timestamp-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
            <path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
          </svg>
        </button>
      </div>
      <div className="right-buttons">
        {modelStore.models.length > 0 && (
          <select 
            id="yt-sidebar-modelSelect" 
            className="model-select" 
            title="Select AI model"
            value={selectedModel}
            onChange={handleModelChange}
            data-testid="model-select"
          >
            {Array.from(new Set(selectedModel ? [selectedModel, ...modelStore.models] : [...modelStore.models]))
              .map(modelId => {
              const model = modelStore.availableModels.find(m => m.id === modelId);
              return (
                <option key={modelId} value={modelId}>
                  {model ? model.name : modelId}
                </option>
              );
              })}
          </select>
        )}
        <button 
          id="yt-sidebar-sendMessage"
          onClick={onSendMessage}
          title="Send message"
          disabled={disabled || sendDisabled}
          data-testid="send-button"
        >
          <svg className="send-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}); 