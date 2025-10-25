import { es } from './es';
import { en } from './en';

export const translations = {
  es,
  en,
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof en;
