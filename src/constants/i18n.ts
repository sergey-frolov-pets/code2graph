export const SUPPORTED_LOCALES = ["ru", "en"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const STORAGE_KEY_LOCALE = "code2graph-locale";

export const DEFAULT_LOCALE: AppLocale = "ru";

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export const LOCALE_LABELS: Record<AppLocale, string> = {
  ru: "Русский",
  en: "English",
};
