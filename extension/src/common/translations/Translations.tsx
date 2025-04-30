import React, { createContext, useContext, useEffect, useState } from 'react';
import { storageAdapter } from '../../storage/storageAdapter';

// Import all translations statically
import ar from './ar.json';
import de from './de.json';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import hi from './hi.json';
import id from './id.json';
import ja from './ja.json';
import pt from './pt.json';

type TranslationsMap = {
  [locale: string]: { [key: string]: string };
};

const ALL_TRANSLATIONS: TranslationsMap = {
  ar,
  de,
  en,
  es,
  fr,
  hi,
  id,
  ja,
  pt,
};

// Defaults
const DEFAULT_LOCALE = 'en';
const AVAILABLE_LOCALES = Object.keys(ALL_TRANSLATIONS);

interface TranslationsContextValue {
  currentLocale: string;
  getMessage: (key: string) => string;
  setLocale: (locale: string) => Promise<void>;
  availableLocales: string[];
}

const TranslationsContext = createContext<TranslationsContextValue | null>(null);

function getBrowserLocale() {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.slice(0, 2);
    if (AVAILABLE_LOCALES.includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

export const TranslationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLocale, setCurrentLocale] = useState<string>(DEFAULT_LOCALE);

  // Load stored or browser locale on mount
  useEffect(() => {
    const initLocale = async () => {
      try {
        const { selectedLocale } = await storageAdapter.getSelectedLocale();
        let localeToUse = selectedLocale || getBrowserLocale();
        if (!AVAILABLE_LOCALES.includes(localeToUse)) {
          localeToUse = DEFAULT_LOCALE;
        }
        await setLocale(localeToUse);
      } catch (e) {
        console.error('Error initializing locale:', e);
        await setLocale(DEFAULT_LOCALE);
      }
    };
    initLocale();
  }, []);

  const getMessage = (key: string): string => {
    const translation = ALL_TRANSLATIONS[currentLocale]?.[key];
    if (translation) return translation;
    // fallback to English if key not found
    const fallback = ALL_TRANSLATIONS['en']?.[key];
    return fallback || key;
  };

  const setLocale = async (locale: string) => {
    if (!AVAILABLE_LOCALES.includes(locale)) {
      console.warn(`Locale ${locale} is not available. Falling back to ${DEFAULT_LOCALE}.`);
      locale = DEFAULT_LOCALE;
    }
    setCurrentLocale(locale);
    await storageAdapter.setSelectedLocale(locale);
  };

  return (
    <TranslationsContext.Provider value={{ currentLocale, getMessage, setLocale, availableLocales: AVAILABLE_LOCALES }}>
      {children}
    </TranslationsContext.Provider>
  );
};

export function useTranslations() {
  const context = useContext(TranslationsContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationsProvider');
  }
  return context;
}
