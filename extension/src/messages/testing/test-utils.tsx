import { render } from '@testing-library/react';
import { Messages, MessagesRef } from '../components/Messages';
import React from 'react';
import { vi } from 'vitest';
import { videoDataService } from '../../common/services/VideoDataService';
import { VideoDataBuilder } from '../../test/builders';
import { TEST_MESSAGES } from '../../test/testData';

// Create a mock TranslationsContext
const TranslationsContext = React.createContext({
  currentLocale: 'en',
  getMessage: (key: string) => {
    if (key === 'summarizeButton') return TEST_MESSAGES.summarizeButton;
    if (key === 'chatButton') return TEST_MESSAGES.chatButton;
    if (key === 'noTranscriptMessage') return TEST_MESSAGES.noTranscriptMessage;
    if (key === 'dataAccessError') return TEST_MESSAGES.dataAccessError;
    if (key === 'contentModerationError') return TEST_MESSAGES.contentModerationError;
    if (key === 'pleaseWaitStreamingMessage') return TEST_MESSAGES.pleaseWaitStreamingMessage;
    if (key === 'refreshToRestartMessage') return TEST_MESSAGES.refreshToRestartMessage;
    if (key === 'startNewChatMessage') return TEST_MESSAGES.startNewChatMessage;
    if (key === 'refreshChatMessage') return TEST_MESSAGES.refreshChatMessage;
    if (key === 'settingsButtonTooltip') return TEST_MESSAGES.settingsButtonTooltip;
    return key;
  },
  setLocale: async () => {},
  availableLocales: ['en']
});

// Mock the useTranslations hook
vi.mock('../../common/translations/Translations', () => ({
  useTranslations: () => React.useContext(TranslationsContext),
  TranslationsProvider: ({ children }: { children: React.ReactNode }) => (
    <TranslationsContext.Provider 
      value={{
        currentLocale: 'en',
        getMessage: (key: string) => {
          if (key === 'summarizeButton') return TEST_MESSAGES.summarizeButton;
          if (key === 'chatButton') return TEST_MESSAGES.chatButton;
          if (key === 'noTranscriptMessage') return TEST_MESSAGES.noTranscriptMessage;
          if (key === 'dataAccessError') return TEST_MESSAGES.dataAccessError;
          if (key === 'contentModerationError') return TEST_MESSAGES.contentModerationError;
          if (key === 'pleaseWaitStreamingMessage') return TEST_MESSAGES.pleaseWaitStreamingMessage;
          if (key === 'refreshToRestartMessage') return TEST_MESSAGES.refreshToRestartMessage;
          if (key === 'startNewChatMessage') return TEST_MESSAGES.startNewChatMessage;
          if (key === 'refreshChatMessage') return TEST_MESSAGES.refreshChatMessage;
          if (key === 'settingsButtonTooltip') return TEST_MESSAGES.settingsButtonTooltip;
          return key;
        },
        setLocale: async () => {},
        availableLocales: ['en']
      }}
    >
      {children}
    </TranslationsContext.Provider>
  )
}));

/**
 * Default mocks for testing Messages component
 */
export const createDefaultMocks = () => {
  const mockOnMessagesUpdate = vi.fn();
  
  const mockPromptAdapter = {
    getPrompts: vi.fn().mockResolvedValue({}),
    buildSuggestedQuestionsPrompt: vi.fn().mockResolvedValue([])
  };
  
  const mockStorageAdapter = {
    getShowSponsored: vi.fn().mockResolvedValue(false),
    getSelectedSummaryLanguage: vi.fn().mockResolvedValue('en'),
    getShowSuggestedQuestions: vi.fn().mockResolvedValue(false)
  };
  
  const mockApiAdapter = {
    generateStreamResponse: vi.fn(),
    fetchAvailableModels: vi.fn().mockResolvedValue([])
  };
  
  // Mock video data service
  const mockVideoData = VideoDataBuilder.create().build();
  vi.mocked(videoDataService.fetchVideoData).mockResolvedValue(mockVideoData);
  
  return {
    mockOnMessagesUpdate,
    mockPromptAdapter,
    mockStorageAdapter,
    mockApiAdapter,
    mockVideoData
  };
};

/**
 * Create a mock stream response for testing
 */
export const createMockStreamResponse = () => {
  return {
    read: vi.fn().mockResolvedValue({ done: true, value: new Uint8Array([]) })
  };
};

/**
 * Helper function to render Messages component with default props
 */
export const renderMessages = (props = {}) => {
  const mocks = createDefaultMocks();
  const ref = React.createRef<MessagesRef>();
  
  const utils = render(
    <Messages
      ref={ref}
      messages={[]}
      videoId="test-video"
      apiKey="test-key"
      storageAdapter={mocks.mockStorageAdapter}
      promptAdapter={mocks.mockPromptAdapter}
      apiAdapter={mocks.mockApiAdapter}
      onMessagesUpdate={mocks.mockOnMessagesUpdate}
      {...props}
    />
  );
  
  return { 
    ...utils, 
    ref,
    mocks
  };
}; 