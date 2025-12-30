"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from "react";
import { translations, Language, TranslationKey } from "../translations";
import { env } from "next-runtime-env";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const envLang = env("NEXT_PUBLIC_DEFAULT_LANGUAGE");
  const isValidLang = envLang && envLang in translations;

  if (envLang && !isValidLang) {
    console.warn(`[Minepanel] Language "${envLang}" is not available. Available: ${Object.keys(translations).join(", ")}. Falling back to "en".`);
  }

  const defaultLanguage = isValidLang ? (envLang as Language) : "en";
  const [language, setLanguageState] = useState<Language>(defaultLanguage);

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && translations[savedLanguage]) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
