'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { english, isLanguage, languageOptions, loadDictionary, Dictionary, Language, TranslationKey } from '../translations';
import { getPublicEnv } from '@/lib/public-env';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Always render "en" first: pages are prerendered at build time in English,
  // while NEXT_PUBLIC_DEFAULT_LANGUAGE is only known at runtime. Resolving it
  // during render would break hydration on every non-English deployment.
  const [locale, setLocale] = useState<{ language: Language; dictionary: Dictionary }>({ language: 'en', dictionary: english });
  const requested = useRef<Language>('en');

  // The language only switches once its dictionary has arrived, so no render shows raw keys;
  // a slower earlier pick never overrides a later one.
  const apply = useCallback((lang: Language) => {
    requested.current = lang;
    loadDictionary(lang)
      .then((dictionary) => {
        if (requested.current === lang) setLocale({ language: lang, dictionary });
      })
      .catch((error) => console.warn(`[Minepanel] Could not load the "${lang}" translations.`, error));
  }, []);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && isLanguage(savedLanguage)) {
      apply(savedLanguage);
      return;
    }

    const envLang = getPublicEnv('NEXT_PUBLIC_DEFAULT_LANGUAGE');
    if (!envLang) return;

    if (!isLanguage(envLang)) {
      console.warn(
        `[Minepanel] Language "${envLang}" is not available. Available: ${languageOptions.map((option) => option.code).join(', ')}. Falling back to "en".`,
      );
      return;
    }

    apply(envLang);
  }, [apply]);

  const { language, dictionary } = locale;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (lang: Language) => {
      localStorage.setItem('language', lang);
      apply(lang);
    },
    [apply],
  );

  const t = useCallback((key: TranslationKey): string => dictionary[key] || key, [dictionary]);

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
