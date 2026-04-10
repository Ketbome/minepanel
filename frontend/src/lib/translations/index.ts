import { es } from './es';
import { en } from './en';
import { nl } from './nl';
import { de } from './de';
import { pl } from './pl';
import { fr } from './fr';

export const translations = {
  es,
  en,
  nl,
  de,
  pl,
  fr,
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof en;
