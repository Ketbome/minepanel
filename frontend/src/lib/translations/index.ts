import { es } from './es';
import { en } from './en';
import { nl } from './nl';

export const translations = {
  es,
  en,
  nl
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof en;
