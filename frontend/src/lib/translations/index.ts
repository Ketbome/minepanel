import { es } from './es';
import { en } from './en';
import { nl } from './nl';
import { de } from './de';
import { pl } from './pl';
import { fr } from './fr';
import { ru } from './ru';

export const translations = {
  es,
  en,
  nl,
  de,
  pl,
  fr,
  ru,
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof en;
