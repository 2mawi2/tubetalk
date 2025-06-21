import React, { useEffect, useRef, useState } from 'react';
import type { Settings as SettingsType } from '../settings/types';
import { Settings } from '../settings/Settings';
import { storageAdapter as defaultStorageAdapter } from '../storage/storageAdapter';
import type { StorageAdapter } from '../storage/types';
import { IconButton } from '../common/components/IconButton';
import { useTranslations } from '../common/translations/Translations';
import { useStorageListener } from '../common/hooks/useStorageListener';
import './Sidebar.scss';
import { Tutorial, useVideoId } from '../tutorial';
import { Onboarding } from '../onboarding/components/Onboarding';
import { MessageInput } from '../message-input/MessageInput';
import { ChromePromptAdapter } from '../common/adapters/PromptAdapter';
import { MessageContent, OpenRouterApiAdapter } from '../common/adapters/ApiAdapter';
import { useSidebarStore } from './sidebarStore';
import { Messages, MessagesRef } from '../messages/components/Messages';

interface SidebarProps {
  onClose: () => void;
  storageAdapter?: StorageAdapter;
}


document.documentElement.setAttribute('data-theme', 'light');

export const Sidebar: React.FC<SidebarProps> = ({
  onClose,
  storageAdapter = defaultStorageAdapter
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<MessagesRef>(null);
  const messageInputRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousVideoIdRef = useRef<string | null>(null);

  const [width, setWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  const { getMessage, setLocale } = useTranslations();
  const videoId = useVideoId();
  const {
    showSettings,
    isInitialized,
    settings,
    messages,
    apiAdapter,
    setShowSettings,
    setIsInitialized,
    setSettings,
    setMessages,
    setApiAdapter
  } = useSidebarStore();

  const promptAdapter = new ChromePromptAdapter();

  const apiKeyUpdate = useStorageListener('openaiApiKey');

  useEffect(() => {
    if (isInitialized && settings.apiKey) {
      setApiAdapter(new OpenRouterApiAdapter(settings.apiKey, () => storageAdapter.getModelPreferences()));
    }
  }, [settings.apiKey, storageAdapter, isInitialized]);

  useEffect(() => {
    const initSettings = async () => {
      try {
        const [isDarkMode, apiKeyData, showSponsoredValue, localeData, selectedSummaryLanguage, showSuggestedQuestions] = await Promise.all([
          storageAdapter.getDarkMode(),
          storageAdapter.getApiKey(),
          storageAdapter.getShowSponsored(),
          storageAdapter.getSelectedLocale(),
          storageAdapter.getSelectedSummaryLanguage(),
          storageAdapter.getShowSuggestedQuestions()
        ]);

        const newSettings: SettingsType = {
          isDarkMode,
          apiKey: apiKeyData.openaiApiKey || '',
          showSponsored: showSponsoredValue,
          selectedLocale: localeData.selectedLocale || 'en',
          selectedSummaryLanguage: selectedSummaryLanguage,
          showSuggestedQuestions: showSuggestedQuestions, 
          customModels: []
        };

        document.documentElement.setAttribute('data-theme', newSettings.isDarkMode ? 'dark' : 'light');

        setSettings(newSettings);
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };

    initSettings();
    adjustYouTubeLayout(width);

    return () => {
      cleanupLayout();
    };
  }, [storageAdapter]);

  useEffect(() => {
    if (settings.apiKey && videoId) {
      setIsStreaming(true);
    }
  }, [settings.apiKey, videoId]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const loadApiKey = async () => {
      // Ensure migration runs on startup
      await storageAdapter.migrateStorage();
      
      const { openaiApiKey } = await storageAdapter.getApiKey();
      setHasApiKey(!!openaiApiKey);
      setIsLoading(false);
    };
    loadApiKey();
  }, []);

  useEffect(() => {
    if (apiKeyUpdate !== null) {
      console.log('[TubeTalk] Updating sidebar with new API key:', apiKeyUpdate);
      
      const newSettings: SettingsType = {
        ...settings,
        apiKey: apiKeyUpdate
      };
      setSettings(newSettings);
      setHasApiKey(true);
      
      setApiAdapter(new OpenRouterApiAdapter(apiKeyUpdate, () => storageAdapter.getModelPreferences()));
      
      setIsStreaming(false);
      setHasError(false);
      
      setIsInitialized(true);
    }
  }, [apiKeyUpdate, storageAdapter, settings]);

  const handleSettingsChange = async (newSettings: SettingsType) => {
    try {
      if (newSettings.isDarkMode !== settings.isDarkMode) {
        document.documentElement.setAttribute('data-theme', newSettings.isDarkMode ? 'dark' : 'light');
      }

      await Promise.all([
        storageAdapter.setDarkMode(newSettings.isDarkMode),
        storageAdapter.setApiKey(newSettings.apiKey),
        storageAdapter.setShowSponsored(newSettings.showSponsored),
        storageAdapter.setSelectedLocale(newSettings.selectedLocale),
        storageAdapter.setSelectedSummaryLanguage(newSettings.selectedSummaryLanguage),
        storageAdapter.setShowSuggestedQuestions(newSettings.showSuggestedQuestions)
      ]);

      setSettings(newSettings);

      if (newSettings.selectedLocale !== settings.selectedLocale) {
        await setLocale(newSettings.selectedLocale);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const cleanupLayout = () => {
    adjustYouTubeLayout(0);
  };

  const adjustYouTubeLayout = (sidebarWidth: number) => {
    const ytdApp = document.querySelector('ytd-app') as HTMLElement;
    if (ytdApp) {
      ytdApp.style.marginRight = `${sidebarWidth}px`;
      ytdApp.style.boxSizing = 'border-box';
    }

    const masthead = document.querySelector('ytd-masthead') as HTMLElement;
    if (masthead) {
      masthead.style.width = `calc(100% - ${sidebarWidth}px)`;
      masthead.style.position = 'fixed';
      masthead.style.zIndex = '2147483647';
    }

    const player = document.getElementById('player');
    if (player) {
      player.style.marginRight = `${sidebarWidth}px`;
    }

    window.dispatchEvent(new Event('resize'));
  };

  const handleSendMessage = (message: string | MessageContent[]) => {
    if (!settings.apiKey || !videoId) return;

    try {
      void messagesRef.current?.handleUserMessage(message);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  const onClickRefresh = () => {
    const wasStreaming = isStreaming;
    
    setIsStreaming(false);
    setHasError(false);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    messagesRef.current?.reset();
    
    messagesRef.current?.scrollToTop();
    
    setMessages([]);
    
    setIsInitialized(false);
    
    if (settings.apiKey && videoId && wasStreaming && messages.length > 0) {
      setIsStreaming(true);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 300 && newWidth <= 800) {
      setWidth(newWidth);
      adjustYouTubeLayout(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (previousVideoIdRef.current !== null && videoId !== previousVideoIdRef.current) {
      console.log(`[Sidebar] Video ID changed:`, {
        from: previousVideoIdRef.current,
        to: videoId
      });
      
      onClickRefresh();
    }
    
    previousVideoIdRef.current = videoId;
  }, [videoId, onClickRefresh]);

  useEffect(() => {
    if (!isLoading && settings.apiKey && videoId && !showSettings) {
      const timer = setTimeout(() => {
        const inputElement = document.querySelector('#yt-sidebar-chatInput') as HTMLTextAreaElement;
        if (inputElement) {
          inputElement.focus();
          if (inputElement.value.length > 0) {
            inputElement.selectionStart = inputElement.selectionEnd = inputElement.value.length;
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, settings.apiKey, videoId, showSettings]);

  if (isLoading) return null;

  return (
    <div className="sidebar" ref={sidebarRef} style={{ width: `${width}px` }}>
      <div className="sidebar__resize-handle" onMouseDown={handleMouseDown} />
      <div className="sidebar__header" data-testid="sidebar-header">
        <IconButton
          type="close"
          onClick={onClose}
          title="Close"
          data-testid="close-button"
        />
        <div className="sidebar__title-container">
          <a 
            href="https://github.com/2mawi2/tubetalk"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar__title-link"
          >
            <img
              src={chrome.runtime.getURL('icons/icon128.png')}
              alt="TubeTalk Logo"
              className="sidebar__logo"
              width="24"
              height="24"
            />
            <h1 className="sidebar__title">{getMessage('sidebarTitle')}</h1>
          </a>
        </div>
        <div className="sidebar__buttons">
          <IconButton
            type="refresh"
            onClick={onClickRefresh}
            title={isStreaming && !hasError && messages.length > 0
              ? getMessage('pleaseWaitStreamingMessage')
              : hasError 
                ? getMessage('refreshToRestartMessage') 
                : messages.length === 0
                  ? getMessage('startNewChatMessage')
                  : getMessage('refreshChatMessage')}
            data-testid="refresh-button"
            disabled={isStreaming && !hasError && messages.length > 0}
          />
          <IconButton
            type="settings"
            onClick={() => setShowSettings(!showSettings)}
            title={getMessage('settingsButtonTooltip')}
            data-testid="settings-button"
            isActive={showSettings}
          />
        </div>
      </div>

      <div className="sidebar__main">
        <div className="sidebar__content-wrapper">
          <div className={`sidebar__settings ${showSettings ? 'visible' : ''}`} data-testid="settings-panel-container">
            <Settings
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          <div className={`sidebar__content ${showSettings ? 'hidden' : ''}`}>
            <Tutorial isVisible={!!settings.apiKey && !videoId} />
            <Onboarding isVisible={!settings.apiKey} initialHasKey={hasApiKey} />
            {settings.apiKey && videoId && (
              <Messages
                ref={messagesRef}
                messages={messages}
                onQuestionClick={handleQuestionClick}
                videoId={videoId}
                apiKey={settings.apiKey}
                storageAdapter={storageAdapter}
                onMessagesUpdate={setMessages}
                promptAdapter={promptAdapter}
                apiAdapter={apiAdapter}
                onStreamingStateChange={setIsStreaming}
                onErrorStateChange={setHasError}
              />
            )}
          </div>
        </div>

        {settings.apiKey && videoId && !showSettings && (
          <div ref={messageInputRef}>
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={hasError}
              sendDisabled={isStreaming || !settings.apiKey}
            />
          </div>
        )}
      </div>
    </div>
  );
};
