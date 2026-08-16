'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { translations, Language, TranslationKey } from '../translations';
import { getPublicEnv } from '@/lib/public-env';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Own-property check: `'constructor' in translations` is true and would let a
// hand-edited localStorage value through as a locale.
const isKnownLanguage = (value: string) => Object.prototype.hasOwnProperty.call(translations, value);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always render "en" first: pages are prerendered at build time in English,
  // while NEXT_PUBLIC_DEFAULT_LANGUAGE is only known at runtime. Resolving it
  // during render would break hydration on every non-English deployment.
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && isKnownLanguage(savedLanguage)) {
      setLanguageState(savedLanguage);
      return;
    }

    const envLang = getPublicEnv('NEXT_PUBLIC_DEFAULT_LANGUAGE');
    if (!envLang) return;

    if (!isKnownLanguage(envLang)) {
      console.warn(
        `[Minepanel] Language "${envLang}" is not available. Available: ${Object.keys(translations).join(', ')}. Falling back to "en".`,
      );
      return;
    }

    setLanguageState(envLang as Language);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return (translations[language] as Record<TranslationKey, string>)[key] || key;
    },
    [language],
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
