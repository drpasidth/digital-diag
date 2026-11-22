import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const I18nContext = createContext(null);

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  th: { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' }
};

// Default language
const DEFAULT_LANGUAGE = 'en';

// Cache for loaded translations
const translationCache = {};

/**
 * Load translation file for a given language
 */
async function loadTranslations(langCode) {
  if (translationCache[langCode]) {
    return translationCache[langCode];
  }

  try {
    const response = await fetch(`/src/i18n/${langCode}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${langCode} translations`);
    }
    const translations = await response.json();
    translationCache[langCode] = translations;
    return translations;
  } catch (error) {
    console.error(`Error loading translations for ${langCode}:`, error);
    // Fallback to English
    if (langCode !== 'en') {
      return loadTranslations('en');
    }
    return {};
  }
}

/**
 * Get nested translation value using dot notation
 * e.g., getNestedValue(translations, 'app.title') => 'Digital Diagnostic Questionnaire'
 */
function getNestedValue(obj, path, fallback = '') {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return fallback;
    }
  }
  
  // Return the value if found (string, array, object, etc.), only use fallback if key doesn't exist
    return current !== undefined && current !== null ? current : fallback;
}

/**
 * I18n Provider Component
 */
export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    // Try to get saved language from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app-language');
      if (saved && SUPPORTED_LANGUAGES[saved]) {
        return saved;
      }
      // Check browser language
      const browserLang = navigator.language.split('-')[0];
      if (SUPPORTED_LANGUAGES[browserLang]) {
        return browserLang;
      }
    }
    return DEFAULT_LANGUAGE;
  });
  
  const [translations, setTranslations] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations when language changes
  useEffect(() => {
    let mounted = true;
    
    async function load() {
      setIsLoading(true);
      const loaded = await loadTranslations(language);
      if (mounted) {
        setTranslations(loaded);
        setIsLoading(false);
      }
    }
    
    load();
    
    return () => {
      mounted = false;
    };
  }, [language]);

  // Change language
  const setLanguage = useCallback((langCode) => {
    if (SUPPORTED_LANGUAGES[langCode]) {
      setLanguageState(langCode);
      if (typeof window !== 'undefined') {
        localStorage.setItem('app-language', langCode);
      }
    }
  }, []);

  // Translation function
  const t = useCallback((key, fallback = '') => {
    return getNestedValue(translations, key, fallback || key);
  }, [translations]);

  // Translation function with interpolation
  const ti = useCallback((key, params = {}, fallback = '') => {
    let value = getNestedValue(translations, key, fallback || key);
    
    // Simple interpolation: {{param}} => value
    Object.entries(params).forEach(([param, paramValue]) => {
      value = value.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), paramValue);
    });
    
    return value;
  }, [translations]);

  const value = {
    language,
    setLanguage,
    t,
    ti,
    translations,
    isLoading,
    supportedLanguages: SUPPORTED_LANGUAGES
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to use i18n in components
 */
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

/**
 * Helper to get section title in current language
 */
export function useSectionTitle(sectionId) {
  const { t } = useI18n();
  return t(`sections.${sectionId}`, sectionId);
}

export default I18nContext;