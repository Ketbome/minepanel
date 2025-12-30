import { es } from './es';
import { en } from './en';
import { nl } from './nl';
import { de } from './de';

export const translations = {
  es,
  en,
  nl,
  de
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof en;
