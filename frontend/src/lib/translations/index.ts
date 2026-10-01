import { en } from './en';

export type TranslationKey = keyof typeof en;
export type Dictionary = Record<TranslationKey, string>;

// English is bundled: it is the first render (pages are prerendered in it). Every other
// dictionary is its own chunk, fetched only when that language is picked.
const locales = {
  es: { load: () => import('./es').then((mod) => mod.es), flag: '🇪🇸', name: 'Español' },
  en: { load: () => Promise.resolve<Dictionary>(en), flag: '🇺🇸', name: 'English' },
  nl: { load: () => import('./nl').then((mod) => mod.nl), flag: '🇳🇱', name: 'Nederlands' },
  de: { load: () => import('./de').then((mod) => mod.de), flag: '🇩🇪', name: 'Deutsch' },
  pl: { load: () => import('./pl').then((mod) => mod.pl), flag: '🇵🇱', name: 'Polski' },
  fr: { load: () => import('./fr').then((mod) => mod.fr), flag: '🇫🇷', name: 'Français' },
  ru: { load: () => import('./ru').then((mod) => mod.ru), flag: '🇷🇺', name: 'Русский' },
  pt: { load: () => import('./pt').then((mod) => mod.pt), flag: '🇧🇷', name: 'Português' },
  tr: { load: () => import('./tr').then((mod) => mod.tr), flag: '🇹🇷', name: 'Türkçe' },
};

export type Language = keyof typeof locales;

export const english: Dictionary = en;

// Own-property check: `'constructor' in locales` is true and would let a
// hand-edited localStorage value through as a locale.
export const isLanguage = (value: string): value is Language => Object.prototype.hasOwnProperty.call(locales, value);

export const loadDictionary = (language: Language): Promise<Dictionary> => locales[language].load();

export const languageOptions = Object.entries(locales).map(([code, { flag, name }]) => ({
  code: code as Language,
  flag,
  name,
}));
