import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useMessagesStore } from '../store/messagesStore'
import type { ConversationMessage } from '../../common/adapters/ApiAdapter'

describe('messagesStore', () => {
  beforeEach(() => {
    useMessagesStore.setState({
      messages: [],
      isStreaming: false,
      isInitialized: false,
      currentMessageId: null,
      conversationHistory: [],
      shouldAutoScroll: true,
      hasError: false,
      streamController: null
    })
  })

  it('should initialize with default values', () => {
    const store = useMessagesStore.getState()
    expect(store.messages).toEqual([])
    expect(store.isStreaming).toBe(false)
    expect(store.isInitialized).toBe(false)
    expect(store.currentMessageId).toBeNull()
    expect(store.conversationHistory).toEqual([])
    expect(store.shouldAutoScroll).toBe(true)
  })

  describe('message management', () => {
    it('should add a message', () => {
      const store = useMessagesStore.getState()
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Hello'
      }
      store.addMessage(message)
      expect(useMessagesStore.getState().messages).toEqual([message])
    })

    it('should update message content', () => {
      const store = useMessagesStore.getState()
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Hello'
      }
      store.addMessage(message)
      store.updateMessageContent('1', 'Updated content')
      expect(useMessagesStore.getState().messages[0].content).toBe('Updated content')
    })

    it('should handle streaming message updates', () => {
      const store = useMessagesStore.getState()
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '',
        loading: true
      }
      store.addMessage(message)
      store.handleStreamedText('Hello', 'Hello')
      expect(useMessagesStore.getState().messages[0].content).toBe('Hello')
      expect(useMessagesStore.getState().messages[0].loading).toBe(false)
    })

    it('should extract suggested questions from streamed content', () => {
      const store = useMessagesStore.getState()
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: '',
        loading: true
      }
      store.addMessage(message)
      const content = 'Here are some questions: <div class="suggested-questions"><button class="question-button">Question 1</button></div>'
      store.handleStreamedText(content, content)
      expect(useMessagesStore.getState().messages[0].suggestedQuestions).toContain('Question 1')
    })
  })

  describe('stream handling', () => {
    it('should initialize stream controller', () => {
      const store = useMessagesStore.getState();
      const controller = store.initializeStream();
      expect(controller).toBeInstanceOf(AbortController);
      expect(useMessagesStore.getState().streamController).toBeInstanceOf(AbortController);
    });

    it('should cleanup stream controller', () => {
      const store = useMessagesStore.getState();
      const mockAbort = vi.fn();
      store.streamController = { abort: mockAbort } as any;
      store.cleanupStream();
      expect(mockAbort).toHaveBeenCalled();
      expect(useMessagesStore.getState().streamController).toBeNull();
    });

    it('should handle stream start and end', () => {
      const store = useMessagesStore.getState();
      store.setIsStreaming(true);
      expect(useMessagesStore.getState().isStreaming).toBe(true);
      store.setIsStreaming(false);
      expect(useMessagesStore.getState().isStreaming).toBe(false);
    });
  })

  describe('conversation history', () => {
    it('should update conversation history', () => {
      const store = useMessagesStore.getState()
      const history: ConversationMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' }
      ]
      store.setConversationHistory(history)
      expect(useMessagesStore.getState().conversationHistory).toEqual(history)
    })

    it('should add message to conversation history', () => {
      const store = useMessagesStore.getState()
      const message: ConversationMessage = { role: 'user', content: 'Hello' }
      store.addToConversationHistory(message)
      expect(useMessagesStore.getState().conversationHistory).toEqual([message])
    })
  })

  describe('error handling', () => {
    it('should set error state', () => {
      const store = useMessagesStore.getState()
      store.setHasError(true)
      expect(useMessagesStore.getState().hasError).toBe(true)
    })

    it('should add error message', () => {
      const store = useMessagesStore.getState()
      store.handleError(new Error('Test error'))
      const messages = useMessagesStore.getState().messages
      expect(messages[0].error).toBe(true)
      expect(messages[0].content).toContain('Test error')
    })
  })

  describe('initialization', () => {
    it('should set initialized state', () => {
      const store = useMessagesStore.getState()
      store.setIsInitialized(true)
      expect(useMessagesStore.getState().isInitialized).toBe(true)
    })

    it('should reset state', () => {
      const store = useMessagesStore.getState()
      store.addMessage({ id: '1', role: 'user', content: 'Hello' })
      store.setIsStreaming(true)
      store.setHasError(true)

      store.reset()

      const state = useMessagesStore.getState()
      expect(state.messages).toEqual([])
      expect(state.isStreaming).toBe(false)
      expect(state.hasError).toBe(false)
      expect(state.conversationHistory).toEqual([])
      expect(state.currentMessageId).toBeNull()
    })
  })

  describe('state management', () => {
    it('should update streaming state', () => {
      const store = useMessagesStore.getState()
      store.setIsStreaming(true)
      expect(useMessagesStore.getState().isStreaming).toBe(true)
    })

    it('should update initialized state', () => {
      const store = useMessagesStore.getState()
      store.setIsInitialized(true)
      expect(useMessagesStore.getState().isInitialized).toBe(true)
    })

    it('should update current message ID', () => {
      const store = useMessagesStore.getState()
      store.setCurrentMessageId('test-id')
      expect(useMessagesStore.getState().currentMessageId).toBe('test-id')
    })

    it('should update conversation history', () => {
      const store = useMessagesStore.getState()
      const history = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' }
      ]
      store.setConversationHistory(history)
      expect(useMessagesStore.getState().conversationHistory).toEqual(history)
    })

    it('should update auto-scroll setting', () => {
      const store = useMessagesStore.getState()
      store.setShouldAutoScroll(false)
      expect(useMessagesStore.getState().shouldAutoScroll).toBe(false)
    })
  })

  describe('state consistency', () => {
    it('should maintain state consistency across multiple updates', () => {
      const store = useMessagesStore.getState()
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Hello'
      }
      
      store.setIsStreaming(true)
      store.setIsInitialized(true)
      store.addMessage(message)
      store.setCurrentMessageId('1')
      
      const finalState = useMessagesStore.getState()
      expect(finalState.isStreaming).toBe(true)
      expect(finalState.isInitialized).toBe(true)
      expect(finalState.messages).toEqual([message])
      expect(finalState.currentMessageId).toBe('1')
    })

    it('should handle rapid sequential updates', () => {
      const store = useMessagesStore.getState()
      
      store.setIsStreaming(true)
      store.setIsStreaming(false)
      store.setIsStreaming(true)
      
      expect(useMessagesStore.getState().isStreaming).toBe(true)
    })
  })
}) 