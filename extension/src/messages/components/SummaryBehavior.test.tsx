import { render, screen, act, waitFor } from '@testing-library/react';
import { Messages, MessagesRef } from './Messages';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { videoDataService } from '../../common/services/VideoDataService';
import { NoCaptionsVideoDataError, ContentModerationVideoDataError } from '../../common/errors/VideoDataError';
import { PromptsBuilder, VideoDataBuilder } from '../../test/builders';
import { TEST_MESSAGES } from '../../test/testData';
import { PromptBuilder } from '../utils/promptBuilder';
import React from 'react';

// Mock setup before imports are used
vi.mock('../../common/services/VideoDataService');
vi.mock('../../common/translations/Translations', () => ({
  useTranslations: () => ({
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
    }
  }),
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
  }
}));

const mockPrompts = PromptsBuilder.create().build();
const mockPromptAdapter = {
  getPrompts: vi.fn().mockResolvedValue(mockPrompts)
};

const mockStorageAdapter = {
  getShowSponsored: vi.fn().mockResolvedValue(false),
  getSelectedSummaryLanguage: vi.fn().mockResolvedValue('en'),
  getShowSuggestedQuestions: vi.fn().mockResolvedValue(false)
};

describe('Messages Component Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(videoDataService.fetchVideoData).mockResolvedValue(VideoDataBuilder.create().build());
    vi.mocked(videoDataService.resetState).mockImplementation(() => {});
  });

  it('should not auto-start summary generation', async () => {
    // Create a mock for the API adapter to track if it's called
    const mockGenerateStreamResponse = vi.fn().mockResolvedValue(null);
    const testApiAdapter = {
      generateStreamResponse: mockGenerateStreamResponse,
      fetchAvailableModels: vi.fn().mockResolvedValue([])
    };

    // Create a component with initial messages
    await act(async () => {
      render(
        <Messages
          messages={[]}
          videoId="test-video"
          apiKey="test-key"
          storageAdapter={mockStorageAdapter}
          promptAdapter={mockPromptAdapter}
          apiAdapter={testApiAdapter}
        />
      );
    });
    
    // Use a small delay to ensure any potential auto-generation would have started
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify that the API was not called automatically (no auto-summary)
    expect(mockGenerateStreamResponse).not.toHaveBeenCalled();
    
    // HTML should contain a messages container
    expect(document.querySelector('[data-testid="messages-container"]')).not.toBeNull();
  });

  it('should generate summary when explicitly requested via user message', async () => {
    // Mock video data and stream response
    vi.mocked(videoDataService.fetchVideoData).mockResolvedValue(VideoDataBuilder.create().build());
    
    // Mock the prompt builder to avoid async issues
    vi.spyOn(PromptBuilder.prototype, 'buildChatPrompt').mockResolvedValue([]);
    
    // Create a mock for the API adapter to track if it's called
    const mockGenerateStreamResponse = vi.fn().mockResolvedValue(null);
    const testApiAdapter = {
      generateStreamResponse: mockGenerateStreamResponse,
      fetchAvailableModels: vi.fn().mockResolvedValue([])
    };
    
    // Create a ref to access component methods
    const ref = React.createRef<MessagesRef>();
    
    await act(async () => {
      render(
        <Messages
          ref={ref}
          messages={[]}
          videoId="test-video"
          apiKey="test-key"
          storageAdapter={mockStorageAdapter}
          promptAdapter={mockPromptAdapter}
          apiAdapter={testApiAdapter}
        />
      );
    });
    
    // Verify the API was not called automatically
    expect(mockGenerateStreamResponse).not.toHaveBeenCalled();
    
    // Now explicitly request a summary via handleUserMessage
    await act(async () => {
      if (ref.current) {
        await ref.current.handleUserMessage('Summarize the video');
      }
    });
    
    // Verify the API was called after the explicit request
    expect(mockGenerateStreamResponse).toHaveBeenCalled();
  });

  it('should handle user message correctly', async () => {
    // Mock the prompt builder to avoid async issues
    vi.spyOn(PromptBuilder.prototype, 'buildChatPrompt').mockResolvedValue([]);
    
    // Create a mock for the API adapter 
    const mockGenerateStreamResponse = vi.fn().mockResolvedValue(null);
    const testApiAdapter = {
      generateStreamResponse: mockGenerateStreamResponse,
      fetchAvailableModels: vi.fn().mockResolvedValue([])
    };
    
    // Create a mock for the message update callback
    const onMessagesUpdate = vi.fn();
    
    // Create a ref to access component methods
    const ref = React.createRef<MessagesRef>();
    
    await act(async () => {
      render(
        <Messages
          ref={ref}
          messages={[]}
          videoId="test-video"
          apiKey="test-key"
          storageAdapter={mockStorageAdapter}
          promptAdapter={mockPromptAdapter}
          apiAdapter={testApiAdapter}
          onMessagesUpdate={onMessagesUpdate}
        />
      );
    });
    
    // Send a user message
    const userQuestion = "What is this video about?";
    await act(async () => {
      if (ref.current) {
        await ref.current.handleUserMessage(userQuestion);
      }
    });
    
    // Verify onMessagesUpdate was called with messages containing the user question
    expect(onMessagesUpdate).toHaveBeenCalled();
    const lastCall = onMessagesUpdate.mock.calls[onMessagesUpdate.mock.calls.length - 1][0];
    const hasUserMessage = lastCall.some((msg: any) => 
      msg.role === 'user' && 
      (typeof msg.content === 'string' ? 
        msg.content === userQuestion : 
        msg.content.some((c: any) => c.type === 'text' && c.text === userQuestion))
    );
    expect(hasUserMessage).toBe(true);
    
    // Verify API was called to get a response
    expect(mockGenerateStreamResponse).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    // Create a mock API adapter that rejects
    const errorApiAdapter = {
      generateStreamResponse: vi.fn().mockRejectedValue(new Error('API Error')),
      fetchAvailableModels: vi.fn().mockResolvedValue([])
    };

    // Create a mock for the error state change callback
    const onErrorStateChange = vi.fn();
    
    // Create a ref to access component methods
    const ref = React.createRef<MessagesRef>();
    
    await act(async () => {
      render(
        <Messages
          ref={ref}
          messages={[]}
          videoId="test-video"
          apiKey="test-key"
          storageAdapter={mockStorageAdapter}
          promptAdapter={mockPromptAdapter}
          apiAdapter={errorApiAdapter}
          onErrorStateChange={onErrorStateChange}
        />
      );
    });
    
    // Send a user message
    await act(async () => {
      if (ref.current) {
        await ref.current.handleUserMessage('Summarize the video');
      }
    });
    
    // Verify onErrorStateChange was called with true
    expect(onErrorStateChange).toHaveBeenCalledWith(true);
    
    // Verify an error message is displayed
    const errorMessageElement = await screen.findByTestId('message-assistant-error');
    expect(errorMessageElement).toBeInTheDocument();
  });

  it('should handle missing video data error by calling onErrorStateChange', async () => {
    // Mock video data service to throw NoCaptionsError
    vi.mocked(videoDataService.fetchVideoData).mockRejectedValueOnce(new NoCaptionsVideoDataError());
    
    // Create a mock for the error state change callback
    const onErrorStateChange = vi.fn();
    
    // Create a mock API adapter
    const testApiAdapter = {
      generateStreamResponse: vi.fn().mockResolvedValue(null),
      fetchAvailableModels: vi.fn().mockResolvedValue([])
    };
    
    // Create a ref to access component methods
    const ref = React.createRef<MessagesRef>();
    
    await act(async () => {
      render(
        <Messages
          ref={ref}
          messages={[]}
          videoId="test-video"
          apiKey="test-key"
          storageAdapter={mockStorageAdapter}
          promptAdapter={mockPromptAdapter}
          apiAdapter={testApiAdapter}
          onErrorStateChange={onErrorStateChange}
        />
      );
    });
    
    // Send a user message to trigger the error
    await act(async () => {
      if (ref.current) {
        await ref.current.handleUserMessage('Summarize the video');
      }
    });
    
    // Verify onErrorStateChange was called at least once
    expect(onErrorStateChange).toHaveBeenCalled();
  });
}); 