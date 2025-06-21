import type { ProviderType } from '../storage/types';

export interface Settings {
  isDarkMode: boolean;
  apiKey: string;
  provider: ProviderType;
  showSponsored: boolean;
  showSuggestedQuestions: boolean;
  selectedLocale: string;
  selectedSummaryLanguage: string | null;
  customModels: string[];
} 