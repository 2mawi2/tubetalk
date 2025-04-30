import { create } from 'zustand'
import type { ConversationMessage } from '../../common/adapters/ApiAdapter'
import { cleanStreamedContent } from '../utils/streamCleaner'

export interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  suggestedQuestions?: string[]
  error?: boolean
  loading?: boolean
}

interface MessagesState {
  messages: Message[]
  isStreaming: boolean
  isInitialized: boolean
  currentMessageId: string | null
  conversationHistory: ConversationMessage[]
  shouldAutoScroll: boolean
  hasError: boolean
  streamController: AbortController | null
  
  // Message management
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessageContent: (id: string, content: string) => void
  handleStreamedText: (chunk: string, fullMessage: string) => void
  
  // Stream handling
  setIsStreaming: (isStreaming: boolean) => void
  initializeStream: () => AbortController
  cleanupStream: () => void
  
  // Conversation history
  setConversationHistory: (history: ConversationMessage[]) => void
  addToConversationHistory: (message: ConversationMessage) => void
  
  // Error handling
  setHasError: (hasError: boolean) => void
  handleError: (error: Error) => void
  
  // Initialization
  setIsInitialized: (isInitialized: boolean) => void
  reset: () => void
  
  // UI State
  setShouldAutoScroll: (shouldScroll: boolean) => void
  setCurrentMessageId: (id: string | null) => void
}

const extractSuggestedQuestions = (content: string): string[] => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  const questions: string[] = [];
  const questionButtons = tempDiv.querySelectorAll('.suggested-questions .question-button');
  
  questionButtons.forEach(button => {
    if (button.textContent) {
      questions.push(button.textContent.trim());
    }
  });
  
  return questions;
};

const initialState = {
  messages: [],
  isStreaming: false,
  isInitialized: false,
  currentMessageId: null,
  conversationHistory: [],
  shouldAutoScroll: true,
  hasError: false,
  streamController: null
};

export const useMessagesStore = create<MessagesState>((set, get) => ({
  ...initialState,

  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),

  updateMessageContent: (id, content) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, content } : msg
    )
  })),

  handleStreamedText: (_, fullMessage) => set((state) => {
    const cleanMessage = cleanStreamedContent(fullMessage);
    const questions = extractSuggestedQuestions(cleanMessage);
    
    return {
      messages: state.messages.map((msg, index) => {
        if (index === state.messages.length - 1 && msg.role === 'assistant') {
          return {
            ...msg,
            content: cleanMessage,
            suggestedQuestions: questions,
            loading: false
          };
        }
        return msg;
      })
    };
  }),

  setIsStreaming: (isStreaming) => set({ isStreaming }),

  // While the return type suggests it could be null, this function always returns a new AbortController
  // The type mismatch is due to the store's state type including null for streamController
  initializeStream: () => {
    const controller = new AbortController();
    set({ streamController: controller });
    return controller;
  },

  cleanupStream: () => {
    const { streamController } = get();
    if (streamController) {
      streamController.abort();
      set({ streamController: null });
    }
  },

  setConversationHistory: (history) => set({ conversationHistory: history }),

  addToConversationHistory: (message) => set((state) => ({
    conversationHistory: [...state.conversationHistory, message]
  })),

  setHasError: (hasError) => set({ hasError }),

  handleError: (error) => set((state) => ({
    messages: [...state.messages, {
      id: `error-${Date.now()}`,
      role: 'assistant',
      content: `Error: ${error.message}`,
      error: true
    }],
    hasError: true
  })),

  setIsInitialized: (isInitialized) => set({ isInitialized }),

  reset: () => {
    const { cleanupStream } = get();
    cleanupStream();
    set({ ...initialState, streamController: null });
  },

  setShouldAutoScroll: (shouldAutoScroll) => set({ shouldAutoScroll }),
  
  setCurrentMessageId: (id) => set({ currentMessageId: id })
})); 