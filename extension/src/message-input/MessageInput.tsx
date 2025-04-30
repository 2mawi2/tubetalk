import React, { useRef, useEffect } from 'react';
import { useTranslations } from '../common/translations/Translations';
import './MessageInput.scss';
import { MessageContent } from '../common/adapters/ApiAdapter';
import { InputArea, InputAreaHandle } from './InputArea';
import { ImagePreview } from './ImagePreview';
import { InputControls } from './InputControls';
import { messageInputStore } from './messageInputStore';
import { observer } from 'mobx-react-lite';

interface MessageInputProps {
  onSendMessage: (message: string | MessageContent[]) => void;
  disabled?: boolean;
  sendDisabled?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = observer(({
  onSendMessage,
  disabled = false,
  sendDisabled = true
}) => {
  const { getMessage } = useTranslations();
  const inputAreaRef = useRef<InputAreaHandle>(null);

  // Update store with props
  useEffect(() => {
    messageInputStore.setDisabled(disabled);
    messageInputStore.setSendDisabled(sendDisabled);
  }, [disabled, sendDisabled]);

  // Add method to focus the input area
  const focus = () => {
    inputAreaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (messageInputStore.canSubmit()) {
      onSendMessage(messageInputStore.prepareMessage());
      messageInputStore.reset();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const captureVideoFrame = (): string | null => {
    const video = document.querySelector('video');
    if (!video) return null;

    const targetDimension = 384;
    const aspectRatio = video.videoWidth / video.videoHeight;
    
    let width: number;
    let height: number;
    if (aspectRatio > 1) {
      width = targetDimension;
      height = Math.round(targetDimension / aspectRatio);
    } else {
      height = targetDimension;
      width = Math.round(targetDimension * aspectRatio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, width, height);

    try {
      if (typeof createImageBitmap !== 'undefined') {
        const quality = 0.3;
        const webpData = canvas.toDataURL('image/webp', quality);
        
        if (webpData.length < 25 * 1024) {
          return webpData;
        }
        
        const minQuality = 0.2;
        const reducedWebpData = canvas.toDataURL('image/webp', minQuality);
        if (reducedWebpData.length < 25 * 1024) {
          return reducedWebpData;
        }
      }
    } catch (e) {
      console.warn('WebP encoding failed, falling back to JPEG');
    }

    let quality = 0.3;
    let jpegData = canvas.toDataURL('image/jpeg', quality);
    
    while (jpegData.length > 25 * 1024 && quality > 0.15) {
      quality -= 0.05;
      jpegData = canvas.toDataURL('image/jpeg', quality);
    }

    if (jpegData.length > 25 * 1024) {
      const scaleFactor = 0.75;
      canvas.width = Math.round(width * scaleFactor);
      canvas.height = Math.round(height * scaleFactor);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      quality = 0.3;
      jpegData = canvas.toDataURL('image/jpeg', quality);
    }

    return jpegData;
  };

  const handleImageCapture = () => {
    const frameData = captureVideoFrame();
    if (frameData) {
      messageInputStore.setCapturedFrame(frameData);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (target.closest('button') || 
        target.closest('select') || 
        target.closest('textarea') ||
        target.closest('.image-preview')) {
      return;
    }
    
    inputAreaRef.current?.focus();
  };

  return (
    <div className="input-container">
      <div 
        className={`input-wrapper ${messageInputStore.capturedFrame ? 'has-image' : ''}`}
        onClick={handleContainerClick}
      >
        <ImagePreview 
          imageUrl={messageInputStore.capturedFrame || ''} 
          onRemove={() => messageInputStore.setCapturedFrame(null)} 
        />
        <InputArea
          ref={inputAreaRef}
          value={messageInputStore.message}
          onChange={(e) => messageInputStore.setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getMessage('messagePlaceholder')}
          disabled={messageInputStore.disabled}
        />
        <InputControls
          onImageCapture={handleImageCapture}
          onTimestampToggle={() => messageInputStore.toggleTimestamp()}
          onModelChange={(model) => messageInputStore.setModel(model)}
          onSendMessage={handleSubmit}
          isTimestampEnabled={messageInputStore.isTimestampEnabled}
          selectedModel={messageInputStore.selectedModel}
          disabled={messageInputStore.disabled}
          sendDisabled={messageInputStore.sendDisabled}
        />
      </div>
    </div>
  );
});
