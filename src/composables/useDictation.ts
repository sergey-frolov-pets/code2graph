import { ref, type Ref } from "vue";
import { AI_CHAT_MESSAGE_MAX_CHARS } from "@/constants/ai-chat";
import {
  DICTATION_CONTINUOUS,
  DICTATION_INTERIM_RESULTS,
  STORAGE_KEY_DICTATION_LANG,
  dictationSpeechTag,
  isDictationFatalError,
  type DictationFatalError,
} from "@/constants/dictation";
import { isAppLocale, type AppLocale } from "@/constants/i18n";
import { readStorageItem, removeStorageItem, writeStorageItem } from "@/core/safe-storage";
import {
  consumeDictationResults,
  dictationDraftText,
  pickDictationLocale,
  probeDictationLocales,
  readDictationRecognitionConstructor,
  type DictationRecognition,
} from "@/utils/dictation-speech";

const availableLocales = ref<AppLocale[]>([]);
const selectedLocale = ref<AppLocale | null>(null);
const listening = ref(false);

let probePromise: Promise<void> | null = null;

interface DictationSession {
  recognition: DictationRecognition;
  prefix: string;
  finals: string;
  draft: Ref<string>;
  onError: (error: DictationFatalError) => void;
  /** Пока true, onend не вызывает start() снова, а поздний result не затирает черновик. */
  suppressRestart: boolean;
}

let activeSession: DictationSession | null = null;

function publish(session: DictationSession, interim: string): void {
  session.draft.value = dictationDraftText(
    session.prefix,
    session.finals,
    interim,
    AI_CHAT_MESSAGE_MAX_CHARS,
  );
}

function ensureProbed(): Promise<void> {
  if (probePromise) {
    return probePromise;
  }

  const ctor = readDictationRecognitionConstructor();
  if (!ctor?.available) {
    availableLocales.value = [];
    selectedLocale.value = null;
    probePromise = Promise.resolve();
    return probePromise;
  }

  probePromise = probeDictationLocales(ctor)
    .then((found) => {
      availableLocales.value = found;
      const picked = pickDictationLocale(
        found,
        readStorageItem(STORAGE_KEY_DICTATION_LANG),
        navigator.language,
      );
      selectedLocale.value = picked;
      if (picked) {
        writeStorageItem(STORAGE_KEY_DICTATION_LANG, picked);
      }
    })
    .catch(() => {
      availableLocales.value = [];
      selectedLocale.value = null;
    });

  return probePromise;
}

export function stopDictation(): void {
  const session = activeSession;
  if (!session) {
    listening.value = false;
    return;
  }

  session.suppressRestart = true;
  listening.value = false;
  try {
    session.recognition.stop();
  } catch {
    if (activeSession === session) {
      activeSession = null;
    }
  }
}

function startDictation(draft: Ref<string>, onError: (error: DictationFatalError) => void): void {
  if (activeSession) {
    stopDictation();
  }

  const locale = selectedLocale.value;
  const Ctor = readDictationRecognitionConstructor();
  if (!locale || !Ctor) {
    return;
  }

  const recognition = new Ctor();
  recognition.lang = dictationSpeechTag(locale);
  recognition.continuous = DICTATION_CONTINUOUS;
  recognition.interimResults = DICTATION_INTERIM_RESULTS;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;

  const session: DictationSession = {
    recognition,
    prefix: draft.value,
    finals: "",
    draft,
    onError,
    suppressRestart: false,
  };

  recognition.onresult = (event) => {
    if (activeSession !== session || session.suppressRestart) {
      return;
    }
    const next = consumeDictationResults(session.finals, event);
    session.finals = next.finals;
    publish(session, next.interim);
  };

  recognition.onerror = (event) => {
    if (activeSession !== session || session.suppressRestart) {
      return;
    }
    if (!isDictationFatalError(event.error)) {
      return;
    }
    session.suppressRestart = true;
    listening.value = false;
    session.onError(event.error);
  };

  recognition.onend = () => {
    if (session.suppressRestart || activeSession !== session) {
      if (activeSession === session) {
        activeSession = null;
        listening.value = false;
      }
      return;
    }

    try {
      recognition.start();
    } catch {
      session.suppressRestart = true;
      listening.value = false;
      activeSession = null;
      session.onError("network");
    }
  };

  activeSession = session;
  listening.value = true;
  try {
    recognition.start();
  } catch {
    session.suppressRestart = true;
    listening.value = false;
    activeSession = null;
    onError("not-allowed");
  }
}

export function toggleDictation(
  draft: Ref<string>,
  onError: (error: DictationFatalError) => void,
): void {
  if (listening.value) {
    stopDictation();
    return;
  }
  startDictation(draft, onError);
}

export function setDictationLocale(locale: AppLocale): void {
  if (!isAppLocale(locale) || !availableLocales.value.includes(locale)) {
    return;
  }
  if (selectedLocale.value !== locale) {
    stopDictation();
  }
  selectedLocale.value = locale;
  writeStorageItem(STORAGE_KEY_DICTATION_LANG, locale);
}

export function whenDictationReady(): Promise<void> {
  return ensureProbed();
}

export function resetDictationForTests(): void {
  if (activeSession) {
    activeSession.suppressRestart = true;
    try {
      activeSession.recognition.stop();
    } catch {
      activeSession = null;
    }
  }
  activeSession = null;
  listening.value = false;
  availableLocales.value = [];
  selectedLocale.value = null;
  probePromise = null;
  removeStorageItem(STORAGE_KEY_DICTATION_LANG);
  const host = window as unknown as {
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;
  };
  delete host.SpeechRecognition;
  delete host.webkitSpeechRecognition;
}

export function useDictation() {
  void ensureProbed();

  return {
    availableLocales,
    selectedLocale,
    listening,
    setDictationLocale,
    toggleDictation,
    stopDictation,
    whenDictationReady,
  };
}
