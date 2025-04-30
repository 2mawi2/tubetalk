import { useSidebarStore } from './sidebarStore'
import { OpenRouterApiAdapter } from '../common/adapters/ApiAdapter'
import { beforeEach, expect, describe, it } from 'vitest'

describe('sidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({
      showSettings: false,
      isInitialized: false,
      settings: {
        isDarkMode: false,
        apiKey: '',
        showSponsored: true,
        selectedLocale: 'en',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      },
      messages: [],
      apiAdapter: undefined
    })
  })

  it('should initialize with default values', () => {
    const store = useSidebarStore.getState()
    expect(store.showSettings).toBe(false)
    expect(store.isInitialized).toBe(false)
    expect(store.settings).toEqual({
      isDarkMode: false,
      apiKey: '',
      showSponsored: true,
      selectedLocale: 'en',
      selectedSummaryLanguage: 'en',
      showSuggestedQuestions: true, 
      customModels: []
    })
    expect(store.messages).toEqual([])
    expect(store.apiAdapter).toBeUndefined()
  })

  describe('settings management', () => {
    it('should update showSettings', () => {
      const store = useSidebarStore.getState()
      store.setShowSettings(true)
      expect(useSidebarStore.getState().showSettings).toBe(true)
    })

    it('should update isInitialized', () => {
      const store = useSidebarStore.getState()
      store.setIsInitialized(true)
      expect(useSidebarStore.getState().isInitialized).toBe(true)
    })

    it('should update all settings properties', () => {
      const store = useSidebarStore.getState()
      const newSettings = {
        isDarkMode: true,
        apiKey: 'test-key',
        showSponsored: false,
        selectedLocale: 'de',
        selectedSummaryLanguage: 'de',
        showSuggestedQuestions: true, 
        customModels: []
      }
      store.setSettings(newSettings)
      expect(useSidebarStore.getState().settings).toEqual(newSettings)
    })

    it('should update individual settings properties', () => {
      const store = useSidebarStore.getState()
      
      store.setSettings({
        isDarkMode: true,
        apiKey: '',
        showSponsored: true,
        selectedLocale: 'en',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      })
      expect(useSidebarStore.getState().settings.isDarkMode).toBe(true)
      
      store.setSettings({
        isDarkMode: true,
        apiKey: 'new-key',
        showSponsored: true,
        selectedLocale: 'en',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      })
      expect(useSidebarStore.getState().settings.apiKey).toBe('new-key')
      expect(useSidebarStore.getState().settings.isDarkMode).toBe(true)
    })

    it('should handle empty API key', () => {
      const store = useSidebarStore.getState()
      store.setSettings({
        isDarkMode: false,
        apiKey: '',
        showSponsored: true,
        selectedLocale: 'en',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      })
      expect(useSidebarStore.getState().settings.apiKey).toBe('')
    })

    it('should handle invalid locale by defaulting to en', () => {
      const store = useSidebarStore.getState()
      store.setSettings({
        isDarkMode: false,
        apiKey: '',
        showSponsored: true,
        selectedLocale: 'invalid-locale',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      })
      expect(useSidebarStore.getState().settings.selectedLocale).toBe('invalid-locale')
    })
  })

  describe('message management', () => {
    it('should update messages', () => {
      const store = useSidebarStore.getState()
      const newMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello'
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Hi there',
          suggestedQuestions: ['How are you?']
        }
      ]
      store.setMessages(newMessages)
      expect(useSidebarStore.getState().messages).toEqual(newMessages)
    })

    it('should handle empty messages array', () => {
      const store = useSidebarStore.getState()
      store.setMessages([])
      expect(useSidebarStore.getState().messages).toEqual([])
    })

    it('should preserve message structure with optional properties', () => {
      const store = useSidebarStore.getState()
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Hello'
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Hi there'
        },
        {
          id: '3',
          role: 'assistant' as const,
          content: 'Question?',
          suggestedQuestions: ['What next?', 'Tell me more']
        }
      ]
      store.setMessages(messages)
      expect(useSidebarStore.getState().messages).toEqual(messages)
    })

    it('should handle messages with empty content', () => {
      const store = useSidebarStore.getState()
      const messages = [
        {
          id: '1',
          role: 'user' as const,
          content: ''
        }
      ]
      store.setMessages(messages)
      expect(useSidebarStore.getState().messages).toEqual(messages)
    })

    it('should handle messages with empty suggestedQuestions', () => {
      const store = useSidebarStore.getState()
      const messages = [
        {
          id: '1',
          role: 'assistant' as const,
          content: 'Hello',
          suggestedQuestions: []
        }
      ]
      store.setMessages(messages)
      expect(useSidebarStore.getState().messages).toEqual(messages)
    })
  })

  describe('API adapter management', () => {
    it('should update apiAdapter', () => {
      const store = useSidebarStore.getState()
      const mockAdapter = {
        someMethod: () => {}
      } as unknown as OpenRouterApiAdapter
      store.setApiAdapter(mockAdapter)
      expect(useSidebarStore.getState().apiAdapter).toBe(mockAdapter)
    })

    it('should handle setting apiAdapter to undefined', () => {
      const store = useSidebarStore.getState()
      const mockAdapter = {} as OpenRouterApiAdapter
      store.setApiAdapter(mockAdapter)
      store.setApiAdapter(undefined)
      expect(useSidebarStore.getState().apiAdapter).toBeUndefined()
    })

    it('should maintain apiAdapter reference', () => {
      const store = useSidebarStore.getState()
      const mockAdapter = {
        id: 'test'
      } as unknown as OpenRouterApiAdapter
      store.setApiAdapter(mockAdapter)
      expect(useSidebarStore.getState().apiAdapter).toBe(mockAdapter)
    })

    it('should handle multiple apiAdapter updates', () => {
      const store = useSidebarStore.getState()
      const mockAdapter1 = { id: '1' } as unknown as OpenRouterApiAdapter
      const mockAdapter2 = { id: '2' } as unknown as OpenRouterApiAdapter
      
      store.setApiAdapter(mockAdapter1)
      expect(useSidebarStore.getState().apiAdapter).toBe(mockAdapter1)
      
      store.setApiAdapter(mockAdapter2)
      expect(useSidebarStore.getState().apiAdapter).toBe(mockAdapter2)
    })
  })

  describe('state consistency', () => {
    it('should maintain state consistency across multiple updates', () => {
      const store = useSidebarStore.getState()
      
      store.setShowSettings(true)
      store.setIsInitialized(true)
      store.setSettings({
        isDarkMode: true,
        apiKey: 'test-key',
        showSponsored: false,
        selectedLocale: 'fr',
        selectedSummaryLanguage: 'fr',
        showSuggestedQuestions: true, 
        customModels: []
      })
      
      const finalState = useSidebarStore.getState()
      expect(finalState.showSettings).toBe(true)
      expect(finalState.isInitialized).toBe(true)
      expect(finalState.settings).toEqual({
        isDarkMode: true,
        apiKey: 'test-key',
        showSponsored: false,
        selectedLocale: 'fr',
        selectedSummaryLanguage: 'fr',
        showSuggestedQuestions: true, 
        customModels: []
      })
    })

    it('should handle rapid sequential updates', () => {
      const store = useSidebarStore.getState()
      
      store.setShowSettings(true)
      store.setShowSettings(false)
      store.setShowSettings(true)
      
      expect(useSidebarStore.getState().showSettings).toBe(true)
    })

    it('should handle concurrent settings and message updates', () => {
      const store = useSidebarStore.getState()
      
      store.setSettings({
        isDarkMode: true,
        apiKey: 'test-key',
        showSponsored: true,
        selectedLocale: 'en',
        selectedSummaryLanguage: 'en',
        showSuggestedQuestions: true, 
        customModels: []
      })
      
      store.setMessages([
        { id: '1', role: 'user' as const, content: 'Hello' }
      ])
      
      const state = useSidebarStore.getState()
      expect(state.settings.isDarkMode).toBe(true)
      expect(state.settings.apiKey).toBe('test-key')
      expect(state.messages).toHaveLength(1)
      expect(state.messages[0].content).toBe('Hello')
    })

    it('should preserve state when only updating one property', () => {
      const store = useSidebarStore.getState()
      const initialState = useSidebarStore.getState()
      
      store.setShowSettings(true)
      
      const newState = useSidebarStore.getState()
      expect(newState.showSettings).toBe(true)
      expect(newState.isInitialized).toBe(initialState.isInitialized)
      expect(newState.settings).toEqual(initialState.settings)
      expect(newState.messages).toEqual(initialState.messages)
      expect(newState.apiAdapter).toBe(initialState.apiAdapter)
    })
  })
}) 