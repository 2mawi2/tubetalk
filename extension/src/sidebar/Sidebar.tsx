import React, { useEffect, useRef, useState } from 'react';
import type { Settings as SettingsType } from '../settings/types';
import { Settings } from '../settings/Settings';
import { storageAdapter as defaultStorageAdapter } from '../storage/storageAdapter';
import type { StorageAdapter } from '../storage/types';
import { IconButton } from '../common/components/IconButton';
import { useTranslations } from '../common/translations/Translations';
import { useStorageListener } from '../common/hooks/useStorageListener';
import './Sidebar.scss';
import { GettingStarted, useVideoId } from '../tutorial';
import { Onboarding } from '../onboarding/components/Onboarding';
import { MessageInput } from '../message-input/MessageInput';
import { ChromePromptAdapter } from '../common/adapters/PromptAdapter';
import { MessageContent } from '../common/adapters/ApiAdapter';
import { ApiAdapterFactory } from '../common/adapters/ApiAdapterFactory';
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [hasAnyProvider, setHasAnyProvider] = useState<boolean>(false);
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
    if (isInitialized && settings.apiKey && settings.provider) {
      try {
        const adapter = ApiAdapterFactory.createAdapter(
          settings.provider,
          settings.apiKey,
          () => storageAdapter.getModelPreferences()
        );
        setApiAdapter(adapter);
      } catch (error) {
        console.error('Failed to create API adapter:', error);
        setApiAdapter(undefined);
      }
    }
  }, [settings.apiKey, settings.provider, storageAdapter, isInitialized]);

  useEffect(() => {
    const initSettings = async () => {
      try {
        const [isDarkMode, apiKeyData, showSponsoredValue, localeData, selectedSummaryLanguage, showSuggestedQuestions, currentProvider] = await Promise.all([
          storageAdapter.getDarkMode(),
          storageAdapter.getApiKey(),
          storageAdapter.getShowSponsored(),
          storageAdapter.getSelectedLocale(),
          storageAdapter.getSelectedSummaryLanguage(),
          storageAdapter.getShowSuggestedQuestions(),
          storageAdapter.getCurrentProvider()
        ]);

        // Get the API key for the current provider
        const providerApiKey = await storageAdapter.getProviderApiKey(currentProvider);

        const newSettings: SettingsType = {
          isDarkMode,
          apiKey: providerApiKey || '',
          provider: currentProvider,
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
      // Only auto-start streaming if we have messages and are initialized
      // This prevents auto-streaming after provider switches that clear the chat
      if (messages.length > 0 && isInitialized) {
        setIsStreaming(true);
      }
    }
  }, [settings.apiKey, videoId, messages.length, isInitialized]);

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
      
      // Check if any provider has been configured
      const [hasOpenRouter, hasOpenAI] = await Promise.all([
        storageAdapter.hasProviderKey('openrouter'),
        storageAdapter.hasProviderKey('openai')
      ]);
      setHasAnyProvider(hasOpenRouter || hasOpenAI);
      
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
      setHasApiKey(apiKeyUpdate !== null && apiKeyUpdate !== '');
      
      // Re-check if any provider has API key configured
      const checkProviders = async () => {
        const [hasOpenRouter, hasOpenAI] = await Promise.all([
          storageAdapter.hasProviderKey('openrouter'),
          storageAdapter.hasProviderKey('openai')
        ]);
        setHasAnyProvider(hasOpenRouter || hasOpenAI);
      };
      checkProviders();
      
      // Create adapter using factory with current provider
      if (settings.provider) {
        try {
          const adapter = ApiAdapterFactory.createAdapter(
            settings.provider,
            apiKeyUpdate,
            () => storageAdapter.getModelPreferences()
          );
          setApiAdapter(adapter);
        } catch (error) {
          console.error('Failed to create API adapter:', error);
          setApiAdapter(undefined);
        }
      }
      
      setIsStreaming(false);
      setHasError(false);
      
      setIsInitialized(true);
    }
  }, [apiKeyUpdate, storageAdapter, settings]);

  // Listen for show settings event from content script
  useEffect(() => {
    const handleShowSettings = async (event: CustomEvent) => {
      console.log('[TubeTalk] Received show settings event:', event.detail);
      console.log('[TubeTalk] Current provider:', settings.provider);
      setShowSettings(true);
      
      // If a provider was specified, update the settings to reflect the provider switch
      if (event.detail?.provider) {
        console.log('[TubeTalk] Provider specified:', event.detail.provider, 'Current:', settings.provider);
        
        // Always update provider state when specified, even if it's the same
        // This ensures state is consistent when coming from onboarding
        const [newProviderApiKey, hasOpenRouter, hasOpenAI] = await Promise.all([
          storageAdapter.getProviderApiKey(event.detail.provider),
          storageAdapter.hasProviderKey('openrouter'),
          storageAdapter.hasProviderKey('openai')
        ]);
        
        console.log('[TubeTalk] Provider API key check:', {
          provider: event.detail.provider,
          hasKey: !!newProviderApiKey,
          hasOpenRouter,
          hasOpenAI
        });
        
        // Update settings to reflect the new provider
        const updatedSettings = {
          ...settings,
          provider: event.detail.provider,
          apiKey: newProviderApiKey || ''
        };
        
        // Update storage to persist the provider change
        await storageAdapter.setCurrentProvider(event.detail.provider);
        
        // Update all state atomically to prevent inconsistencies
        setSettings(updatedSettings);
        setHasAnyProvider(hasOpenRouter || hasOpenAI);
        setHasApiKey(!!updatedSettings.apiKey);
        
        console.log('[TubeTalk] Updated state after provider switch:', {
          provider: updatedSettings.provider,
          apiKey: updatedSettings.apiKey ? '[REDACTED]' : 'empty',
          hasApiKey: !!updatedSettings.apiKey,
          hasAnyProvider: hasOpenRouter || hasOpenAI,
          hasOpenRouter,
          hasOpenAI,
          showSettings: true
        });
      }
    };

    window.addEventListener('tubetalk-show-settings', handleShowSettings as EventListener);
    
    return () => {
      window.removeEventListener('tubetalk-show-settings', handleShowSettings as EventListener);
    };
  }, [setShowSettings, settings, storageAdapter]);

  const handleSettingsChange = async (newSettings: SettingsType) => {
    try {
      if (newSettings.isDarkMode !== settings.isDarkMode) {
        document.documentElement.setAttribute('data-theme', newSettings.isDarkMode ? 'dark' : 'light');
      }

      // Track if provider changed to call refresh after state updates
      const providerChanged = newSettings.provider !== settings.provider;

      // Handle provider change
      if (providerChanged) {
        await storageAdapter.setCurrentProvider(newSettings.provider);
        // Load the API key for the new provider
        const newProviderApiKey = await storageAdapter.getProviderApiKey(newSettings.provider);
        newSettings.apiKey = newProviderApiKey || '';
        
        // Create new adapter for the new provider
        try {
          const adapter = ApiAdapterFactory.createAdapter(
            newSettings.provider,
            newSettings.apiKey,
            () => storageAdapter.getModelPreferences()
          );
          setApiAdapter(adapter);
        } catch (error) {
          console.error('Failed to create API adapter for new provider:', error);
          setApiAdapter(undefined);
        }
      } else if (newSettings.apiKey !== settings.apiKey) {
        // Just API key changed, save it to current provider
        await storageAdapter.setProviderApiKey(newSettings.provider, newSettings.apiKey);
        // Update adapter with new API key
        if (newSettings.provider) {
          try {
            const adapter = ApiAdapterFactory.createAdapter(
              newSettings.provider,
              newSettings.apiKey,
              () => storageAdapter.getModelPreferences()
            );
            setApiAdapter(adapter);
          } catch (error) {
            console.error('Failed to create API adapter with new key:', error);
            setApiAdapter(undefined);
          }
        }
      }

      await Promise.all([
        storageAdapter.setDarkMode(newSettings.isDarkMode),
        storageAdapter.setShowSponsored(newSettings.showSponsored),
        storageAdapter.setSelectedLocale(newSettings.selectedLocale),
        storageAdapter.setSelectedSummaryLanguage(newSettings.selectedSummaryLanguage),
        storageAdapter.setShowSuggestedQuestions(newSettings.showSuggestedQuestions)
      ]);

      // Re-check if any provider has API key configured whenever settings change
      const [hasOpenRouter, hasOpenAI] = await Promise.all([
        storageAdapter.hasProviderKey('openrouter'),
        storageAdapter.hasProviderKey('openai')
      ]);
      setHasAnyProvider(hasOpenRouter || hasOpenAI);
      setHasApiKey(newSettings.apiKey !== null && newSettings.apiKey !== '');

      setSettings(newSettings);

      // Clear chat history when switching providers (after state is updated)
      if (providerChanged) {
        // Call refresh with the NEW settings, not the old ones
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
        
        // Only restart streaming if the NEW provider has an API key
        if (newSettings.apiKey && videoId && wasStreaming && messages.length > 0) {
          setIsStreaming(true);
        }
      }

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
            {/* Compute mutually exclusive visibility states */}
            {(() => {
              // Priority 1: Show onboarding if current provider doesn't have an API key
              const showOnboarding = !settings.apiKey;
              // Priority 2: Show tutorial only on non-video pages when provider has API key  
              const showGettingStarted = !!settings.apiKey && !videoId;
              // Priority 3: Show messages only on video pages when provider has API key
              const showMessages = !!settings.apiKey && !!videoId;

              return (
                <>
                  <GettingStarted isVisible={showGettingStarted} />
                  <Onboarding isVisible={showOnboarding} initialHasKey={hasApiKey} />
                  {showMessages && (
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
                </>
              );
            })()}
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
