import { create } from 'zustand'
import { Settings } from '../settings/types'
import { OpenRouterApiAdapter } from '../common/adapters/ApiAdapter'
import type { Message as MessagesMessage } from '../messages/components/Messages'

export type Message = MessagesMessage;

interface SidebarState {
  showSettings: boolean
  isInitialized: boolean
  settings: Settings
  messages: Message[]
  apiAdapter?: OpenRouterApiAdapter
  setShowSettings: (show: boolean) => void
  setIsInitialized: (initialized: boolean) => void
  setSettings: (settings: Settings) => void
  setMessages: (messages: Message[]) => void
  setApiAdapter: (adapter: OpenRouterApiAdapter | undefined) => void
}

export const useSidebarStore = create<SidebarState>((set) => ({
  showSettings: false,
  isInitialized: false,
  settings: {
    isDarkMode: false,
    apiKey: '',
    showSponsored: true,
    selectedLocale: 'en',
    selectedSummaryLanguage: null,
    showSuggestedQuestions: true,
    customModels: []
  },
  messages: [],
  apiAdapter: undefined,
  setShowSettings: (show) => set({ showSettings: show }),
  setIsInitialized: (initialized) => set({ isInitialized: initialized }),
  setSettings: (settings) => set({ settings }),
  setMessages: (messages) => set({ messages }),
  setApiAdapter: (adapter) => set({ apiAdapter: adapter })
})) 