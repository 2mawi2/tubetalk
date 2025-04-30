import { makeAutoObservable, runInAction } from 'mobx';
import { modelStore } from '../settings/modelStore';
import storageAdapter from '../storage/storageAdapter';
import { MessageContent } from '../common/adapters/ApiAdapter';

export class MessageInputStore {
  message: string = '';
  isTimestampEnabled: boolean = false;
  selectedModel: string = '';
  capturedFrame: string | null = null;
  disabled: boolean = false;
  sendDisabled: boolean = true;

  constructor() {
    makeAutoObservable(this);
    this.initializeState();
  }

  private async initializeState() {
    const defaultModel = modelStore.models[0];
    const storedModels = await storageAdapter.getModelPreferences() || [];
    runInAction(() => {
      this.selectedModel = storedModels[0] || defaultModel;
    });
  }

  setMessage(message: string) {
    this.message = message;
  }

  toggleTimestamp() {
    this.isTimestampEnabled = !this.isTimestampEnabled;
  }

  async setModel(model: string) {
    if (model) {
      await storageAdapter.setModelPreferences([model]);
      runInAction(() => {
        this.selectedModel = model;
      });
    } else {
      runInAction(() => {
        this.selectedModel = modelStore.models[0];
      });
    }
  }

  setDisabled(disabled: boolean) {
    this.disabled = disabled;
  }

  setSendDisabled(sendDisabled: boolean) {
    this.sendDisabled = sendDisabled;
  }

  setCapturedFrame(frame: string | null) {
    this.capturedFrame = frame;
  }

  getCurrentVideoTime(): string {
    const video = document.querySelector('video');
    if (!video) return '00:00';
    
    const totalSeconds = Math.floor(video.currentTime);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  prepareMessage(): string | MessageContent[] {
    const timestamp = this.isTimestampEnabled ? `§[${this.getCurrentVideoTime()}]§ ` : '';

    if (this.capturedFrame) {
      return [
        {
          type: 'text',
          text: timestamp + this.message.trim()
        },
        {
          type: 'image_url',
          image_url: {
            url: this.capturedFrame,
            detail: 'auto'
          }
        }
      ];
    }
    return timestamp + this.message;
  }

  reset() {
    this.message = '';
    this.capturedFrame = null;
  }

  canSubmit(): boolean {
    return !this.disabled && !this.sendDisabled && (!!this.message.trim() || !!this.capturedFrame);
  }
}

export const messageInputStore = new MessageInputStore(); 
