import { es } from './es';
import { en } from './en';
import { nl } from './nl';
import { de } from './de';
import { pl } from './pl';
import { fr } from './fr';
import { ru } from './ru';
import { pt } from './pt';

const locales = {
  es: { dictionary: es, flag: '🇪🇸', name: 'Español' },
  en: { dictionary: en, flag: '🇺🇸', name: 'English' },
  nl: { dictionary: nl, flag: '🇳🇱', name: 'Nederlands' },
  de: { dictionary: de, flag: '🇩🇪', name: 'Deutsch' },
  pl: { dictionary: pl, flag: '🇵🇱', name: 'Polski' },
  fr: { dictionary: fr, flag: '🇫🇷', name: 'Français' },
  ru: { dictionary: ru, flag: '🇷🇺', name: 'Русский' },
  pt: { dictionary: pt, flag: '🇧🇷', name: 'Português' },
};

export type Language = keyof typeof locales;
export type TranslationKey = keyof typeof en;

export const translations = Object.fromEntries(
  Object.entries(locales).map(([code, { dictionary }]) => [code, dictionary]),
) as { [Code in Language]: (typeof locales)[Code]['dictionary'] };

export const languageOptions = Object.entries(locales).map(([code, { flag, name }]) => ({
  code: code as Language,
  flag,
  name,
}));
