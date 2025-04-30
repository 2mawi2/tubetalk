import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TranslationsProvider, useTranslations } from './Translations';
import { storageAdapter } from '../../storage/storageAdapter';

vi.mock('../../storage/storageAdapter', () => ({
  storageAdapter: {
    getSelectedLocale: vi.fn().mockResolvedValue({ selectedLocale: null }),
    setSelectedLocale: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Translations', () => {
  describe('Browser Locale Detection', () => {
    const originalNavigator = global.navigator;

    beforeEach(() => {
      // Arrange - Setup browser locale
      Object.defineProperty(global, 'navigator', {
        value: { language: 'de-DE' },
        writable: true
      });
      (storageAdapter.getSelectedLocale as any).mockResolvedValue({ selectedLocale: null });
    });

    afterEach(() => {
      // Cleanup
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true
      });
    });

    it('should detect browser locale', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.currentLocale).toBe('de');
    });
  });

  describe('Translation Functions', () => {
    beforeEach(() => {
      // Arrange - Reset mocks and storage
      vi.clearAllMocks();
      (storageAdapter.getSelectedLocale as any).mockResolvedValue({ selectedLocale: null });
    });

    it('should return translation for current locale', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.getMessage('sidebarTitle')).toBe('TubeTalk');
    });

    it('should fallback to English when translation missing', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });
      
      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.setLocale('de');
      });

      // Assert
      expect(result.current.getMessage('nonExistentKey')).toBe('nonExistentKey');
    });

    it('should return key if no translation exists', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.getMessage('nonExistentKey')).toBe('nonExistentKey');
    });
  });

  describe('setLocale', () => {
    beforeEach(() => {
      // Arrange - Reset mocks and storage
      vi.clearAllMocks();
      (storageAdapter.getSelectedLocale as any).mockResolvedValue({ selectedLocale: null });
    });

    it('should change locale successfully', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.setLocale('de');
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.currentLocale).toBe('de');
      expect(storageAdapter.setSelectedLocale).toHaveBeenCalledWith('de');
    });

    it('should fallback to default locale for non-existent locale', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.setLocale('nonexistent');
      });

      // Assert
      expect(result.current.currentLocale).toBe('en');
      expect(storageAdapter.setSelectedLocale).toHaveBeenCalledWith('en');
    });
  });

  describe('Available Locales', () => {
    it('should return all available locales', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.availableLocales).toEqual([
        'ar', 'de', 'en', 'es', 'fr', 'hi', 'id', 'ja', 'pt'
      ]);
    });
  });

  describe('Language Persistence', () => {
    beforeEach(() => {
      // Arrange - Reset mocks
      vi.clearAllMocks();
    });

    it('should save language selection to storage', async () => {
      // Arrange
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        await result.current.setLocale('de');
      });

      // Assert
      expect(storageAdapter.setSelectedLocale).toHaveBeenCalledWith('de');
    });

    it('should restore saved locale on initialization', async () => {
      // Arrange
      (storageAdapter.getSelectedLocale as any).mockResolvedValue({ selectedLocale: 'de' });
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.currentLocale).toBe('de');
    });

    it('should use browser locale if no saved locale exists', async () => {
      // Arrange
      (storageAdapter.getSelectedLocale as any).mockResolvedValue({ selectedLocale: null });
      Object.defineProperty(global, 'navigator', {
        value: { language: 'es-ES' },
        writable: true
      });
      const { result } = renderHook(() => useTranslations(), {
        wrapper: TranslationsProvider
      });

      // Act
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // Assert
      expect(result.current.currentLocale).toBe('es');
    });
  });
}); 