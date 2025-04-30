let translations = {};
let currentLocale = 'en';

function getBrowserLocale() {
    return typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en';
}

function setTranslations(newTranslations) {
    translations = newTranslations;
}

function getStorageAdapter() {
    if (typeof window !== 'undefined' && window.storageAdapter) {
        return window.storageAdapter;
    }
    return require('../storageAdapter');
}

async function getAvailableLocalesFromDirectory() {
    if (typeof chrome === 'undefined') return ['en'];

    const manifestURL = chrome.runtime.getURL('manifest.json');
    const manifestPath = manifestURL.substring(0, manifestURL.lastIndexOf('/'));
    const translationsPath = `${manifestPath}/translations`;

    const locales = ['en', 'es', 'hi', 'pt', 'ar', 'id', 'fr', 'ru', 'ja', 'de'];
    const availableLocales = [];

    const localeChecks = locales.map(async (locale) => {
        try {
            const response = await fetch(chrome.runtime.getURL(`translations/${locale}.json`), { method: 'GET' });
            if (response.ok) {
                availableLocales.push(locale);
            }
        } catch (e) {
            // Ignore failures
        }
    });

    await Promise.all(localeChecks);
    return availableLocales.length ? availableLocales : ['en'];
}

async function discoverTranslations() {
    try {
        console.log('[discoverTranslations] Starting translation discovery');
        const availableLocales = await getAvailableLocalesFromDirectory();
        console.log('[discoverTranslations] Found locales:', availableLocales);

        const fetchPromises = availableLocales.map(async (locale) => {
            try {
                const response = await fetch(chrome.runtime.getURL(`translations/${locale}.json`));
                if (response.ok) {
                    translations[locale] = await response.json();
                    console.log(`[discoverTranslations] Loaded translations for ${locale}`);
                }
            } catch (e) {
                console.error(`[discoverTranslations] Error loading translations for ${locale}:`, e);
            }
        });

        await Promise.all(fetchPromises);
        console.log('[discoverTranslations] All translations loaded:', Object.keys(translations));

        let selectedLocale = null;
        const storageAdapter = getStorageAdapter();
        const { selectedLocale: storedLocale } = await storageAdapter.getSelectedLocale() || {};

        if (storedLocale && translations[storedLocale]) {
            selectedLocale = storedLocale;
            console.log('[discoverTranslations] Found saved locale:', selectedLocale);
        }

        if (!selectedLocale) {
            console.log('[discoverTranslations] No saved locale, checking browser locale');
            const browserLocale = getBrowserLocale();
            console.log('[discoverTranslations] Browser locale:', browserLocale);
            if (translations[browserLocale]) {
                selectedLocale = browserLocale;
                console.log('[discoverTranslations] Using browser locale:', selectedLocale);
            } else {
                selectedLocale = 'en';
                console.log('[discoverTranslations] Falling back to English');
            }
        }

        if (selectedLocale) {
            console.log('[discoverTranslations] Setting final locale:', selectedLocale);
            await setLocale(selectedLocale);        
        }
    } catch (e) {
        console.error('[discoverTranslations] Error during translation discovery:', e);
    }
}

async function setLocale(locale) {
    console.log('[setLocale] Attempting to set locale:', locale);
    if (!translations[locale]) {
        console.error(`[setLocale] No translations available for ${locale}`);
        return false;
    }

    currentLocale = locale;
    console.log('[setLocale] Current locale set to:', currentLocale);

    const storageAdapter = getStorageAdapter();
    await storageAdapter.setSelectedLocale(locale);
    console.log('[setLocale] Saved locale to storage:', locale);

    // Dispatch an event that content.js can listen for
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale } }));
    }

    console.log('[setLocale] Locale change completed');
    return true;
}

function getMessage(key) {
    const translation = translations[currentLocale]?.[key];
    if (translation) return translation;

    const fallback = translations.en?.[key];
    if (fallback) return fallback;

    return key;
}

function getAvailableLocales() {
    return Object.keys(translations);
}

if (typeof window !== 'undefined') {
    window.getMessage = getMessage;
    window.setLocale = setLocale;
    window.getAvailableLocales = getAvailableLocales;
    window.getCurrentLocale = () => currentLocale;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMessage,
        setLocale,
        getAvailableLocales,
        discoverTranslations,
        setTranslations,
        getBrowserLocale,
        getCurrentLocale: () => currentLocale,
        _testReset: () => {
            translations = {};
            currentLocale = 'en';
        }
    };
}