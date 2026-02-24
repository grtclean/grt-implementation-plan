export type Language = 'zh' | 'en' | 'de' | 'fr';

export const languageNames: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français'
};

export const languageFlags: Record<Language, string> = {
  zh: '🇨🇳',
  en: '🇺🇸',
  de: '🇩🇪',
  fr: '🇫🇷'
};

export type TranslationModule = Record<Language, Record<string, string>>;
