import {
  DICTATION_LOCALE_ORDER,
  DICTATION_PROCESS_LOCALLY,
  DICTATION_RECOGNITION_QUALITY,
  DICTATION_STATUS_AVAILABLE,
  appLocaleFromLanguageTag,
  dictationSpeechTag,
} from "@/constants/dictation";
import type { AppLocale } from "@/constants/i18n";

export interface DictationAvailabilityQuery {
  langs: string[];
  quality: typeof DICTATION_RECOGNITION_QUALITY;
  processLocally: typeof DICTATION_PROCESS_LOCALLY;
}

export interface DictationSpeechAlternative {
  transcript: string;
}

export interface DictationSpeechResult {
  isFinal: boolean;
  0?: DictationSpeechAlternative;
}

export interface DictationSpeechEvent {
  resultIndex: number;
  results: ArrayLike<DictationSpeechResult | undefined>;
}

export interface DictationRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: DictationSpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export interface DictationRecognitionConstructor {
  new (): DictationRecognition;
  available?: (options: DictationAvailabilityQuery) => Promise<string>;
}

const LEADING_WHITESPACE = /^\s/u;
const TRAILING_WHITESPACE = /\s$/u;

export function readDictationRecognitionConstructor(): DictationRecognitionConstructor | null {
  const host = window as unknown as {
    SpeechRecognition?: DictationRecognitionConstructor;
    webkitSpeechRecognition?: DictationRecognitionConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export async function probeDictationLocales(
  ctor: DictationRecognitionConstructor | null,
): Promise<AppLocale[]> {
  const available = ctor?.available;
  if (!available) {
    return [];
  }

  const checks = await Promise.all(
    DICTATION_LOCALE_ORDER.map(async (locale) => {
      try {
        const status = await available({
          langs: [dictationSpeechTag(locale)],
          quality: DICTATION_RECOGNITION_QUALITY,
          processLocally: DICTATION_PROCESS_LOCALLY,
        });
        return status === DICTATION_STATUS_AVAILABLE ? locale : null;
      } catch {
        return null;
      }
    }),
  );

  return checks.filter((locale): locale is AppLocale => locale !== null);
}

export function pickDictationLocale(
  available: readonly AppLocale[],
  saved: string | null,
  navigatorLanguage: string,
): AppLocale | null {
  if (available.length === 0) {
    return null;
  }

  const savedLocale = saved ? appLocaleFromLanguageTag(saved) : null;
  if (savedLocale && available.includes(savedLocale)) {
    return savedLocale;
  }

  const fromNavigator = appLocaleFromLanguageTag(navigatorLanguage);
  if (fromNavigator && available.includes(fromNavigator)) {
    return fromNavigator;
  }

  return available[0] ?? null;
}

export function joinDictationText(prefix: string, spoken: string): string {
  if (spoken.length === 0) {
    return prefix;
  }
  if (prefix.length === 0) {
    return spoken;
  }
  if (TRAILING_WHITESPACE.test(prefix) || LEADING_WHITESPACE.test(spoken)) {
    return prefix + spoken;
  }
  return `${prefix} ${spoken}`;
}

export function consumeDictationResults(
  finals: string,
  event: DictationSpeechEvent,
): { finals: string; interim: string } {
  let nextFinals = finals;
  let interim = "";
  const { results } = event;
  for (let index = event.resultIndex; index < results.length; index += 1) {
    const result = results[index];
    const transcript = result?.[0]?.transcript ?? "";
    if (result?.isFinal) {
      nextFinals += transcript;
    } else {
      interim += transcript;
    }
  }
  return { finals: nextFinals, interim };
}

export function dictationDraftText(
  prefix: string,
  finals: string,
  interim: string,
  maxChars: number,
): string {
  return joinDictationText(prefix, `${finals}${interim}`).slice(0, maxChars);
}
