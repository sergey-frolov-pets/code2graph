import { SUPPORTED_LOCALES, isAppLocale, type AppLocale } from "@/constants/i18n";

/** Выбранный язык диктовки хранится как код интерфейса, не как BCP-47. */
export const STORAGE_KEY_DICTATION_LANG = "code2graph-dictation-lang";

/** Качество Web Speech API: связная речь одного говорящего, а не короткая команда. */
export const DICTATION_RECOGNITION_QUALITY = "dictation" as const;

/**
 * `false` — язык годится, если браузер умеет его на устройстве или через свой сервис.
 * Пакеты `downloadable` при этом не запрашиваем и не устанавливаем.
 */
export const DICTATION_PROCESS_LOCALLY = false;

export const DICTATION_STATUS_AVAILABLE = "available" as const;

export const DICTATION_CONTINUOUS = true;

export const DICTATION_INTERIM_RESULTS = true;

/** Ошибки, после которых сессию не перезапускаем. */
export const DICTATION_FATAL_ERRORS = [
  "not-allowed",
  "service-not-allowed",
  "audio-capture",
  "language-not-supported",
  "network",
] as const;

export type DictationFatalError = (typeof DICTATION_FATAL_ERRORS)[number];

/**
 * Один BCP-47 тег на каждый язык интерфейса.
 * `available()` не умеет перечислять языки, поэтому проверяем только этот набор.
 */
export const DICTATION_SPEECH_TAGS = {
  en: "en-US",
  ru: "ru-RU",
  es: "es-ES",
  zh: "zh-CN",
  ja: "ja-JP",
  hi: "hi-IN",
  pt: "pt-BR",
  de: "de-DE",
  ar: "ar-SA",
} as const satisfies Record<AppLocale, string>;

export type DictationSpeechTag = (typeof DICTATION_SPEECH_TAGS)[AppLocale];

export function isDictationFatalError(error: string): error is DictationFatalError {
  return (DICTATION_FATAL_ERRORS as readonly string[]).includes(error);
}

export function dictationSpeechTag(locale: AppLocale): DictationSpeechTag {
  return DICTATION_SPEECH_TAGS[locale];
}

/** `ru-RU` и сохранённый код `ru` сводятся к языку интерфейса. Чужие теги вроде `fr-FR` — нет. */
export function appLocaleFromLanguageTag(language: string): AppLocale | null {
  const primary = language.trim().toLowerCase().split("-")[0] ?? "";
  return isAppLocale(primary) ? primary : null;
}

export const DICTATION_LOCALE_ORDER: readonly AppLocale[] = SUPPORTED_LOCALES;
