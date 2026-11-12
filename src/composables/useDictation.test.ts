// @vitest-environment jsdom

import { ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AI_CHAT_MESSAGE_MAX_CHARS } from "@/constants/ai-chat";
import {
  DICTATION_LOCALE_ORDER,
  DICTATION_PROCESS_LOCALLY,
  DICTATION_RECOGNITION_QUALITY,
  DICTATION_SPEECH_TAGS,
  STORAGE_KEY_DICTATION_LANG,
} from "@/constants/dictation";
import type { AppLocale } from "@/constants/i18n";
import {
  resetDictationForTests,
  setDictationLocale,
  toggleDictation,
  useDictation,
} from "@/composables/useDictation";
import {
  consumeDictationResults,
  dictationDraftText,
  joinDictationText,
  pickDictationLocale,
  probeDictationLocales,
  type DictationAvailabilityQuery,
  type DictationRecognition,
  type DictationRecognitionConstructor,
  type DictationSpeechEvent,
} from "@/utils/dictation-speech";

class FakeRecognition implements DictationRecognition {
  static instances: FakeRecognition[] = [];
  static available = vi.fn(async (_options: DictationAvailabilityQuery): Promise<string> => "unavailable");

  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((event: DictationSpeechEvent) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  startCount = 0;

  start(): void {
    this.startCount += 1;
    FakeRecognition.instances.push(this);
  }

  stop(): void {
    this.onend?.();
  }
}

function installRecognition(
  available: (options: DictationAvailabilityQuery) => Promise<string>,
): void {
  FakeRecognition.available = vi.fn(available);
  FakeRecognition.instances = [];
  const host = window as unknown as { SpeechRecognition?: DictationRecognitionConstructor };
  host.SpeechRecognition = FakeRecognition;
}

function speechEvent(
  resultIndex: number,
  results: Array<{ isFinal: boolean; transcript: string }>,
): DictationSpeechEvent {
  return {
    resultIndex,
    results: results.map((result) => ({
      isFinal: result.isFinal,
      0: { transcript: result.transcript },
    })),
  };
}

describe("dictation speech helpers", () => {
  it("keeps only interface languages the browser marks available", async () => {
    const calls: string[] = [];
    const ctor: DictationRecognitionConstructor = class {
      static available(options: DictationAvailabilityQuery): Promise<string> {
        const tag = options.langs[0] ?? "";
        calls.push(tag);
        expect(options.langs).toHaveLength(1);
        expect(options.quality).toBe(DICTATION_RECOGNITION_QUALITY);
        expect(options.processLocally).toBe(DICTATION_PROCESS_LOCALLY);
        if (tag === "ar-SA") {
          return Promise.reject(new Error("probe failed"));
        }
        if (tag === "ru-RU" || tag === "de-DE") {
          return Promise.resolve("available");
        }
        return Promise.resolve(tag === "en-US" ? "downloadable" : "unavailable");
      }

      lang = "";
      continuous = false;
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
      start(): void {}
      stop(): void {}
    };

    const locales = await probeDictationLocales(ctor);

    expect(locales).toEqual(["ru", "de"]);
    expect(calls).toEqual(DICTATION_LOCALE_ORDER.map((locale) => DICTATION_SPEECH_TAGS[locale]));
    expect(calls).not.toContain("fr-FR");
    expect(await probeDictationLocales(null)).toEqual([]);
    expect(await probeDictationLocales(class {
      lang = "";
      continuous = false;
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
      start(): void {}
      stop(): void {}
    })).toEqual([]);
  });

  it("picks a saved interface language, then the browser language, then the first available", () => {
    const available: AppLocale[] = ["ru", "de"];
    expect(pickDictationLocale(available, "ru", "en-US")).toBe("ru");
    expect(pickDictationLocale(available, "ru-RU", "en-US")).toBe("ru");
    expect(pickDictationLocale(available, "fr-FR", "de-DE")).toBe("de");
    expect(pickDictationLocale(available, "ja", "fr-FR")).toBe("ru");
    expect(pickDictationLocale([], "ru", "ru-RU")).toBeNull();
  });

  it("appends speech to the existing draft without doubling a final result", () => {
    expect(joinDictationText("Hello", "world")).toBe("Hello world");
    expect(joinDictationText("Hello ", "world")).toBe("Hello world");
    expect(joinDictationText("", " world")).toBe(" world");

    const first = consumeDictationResults("", speechEvent(0, [{ isFinal: false, transcript: "hel" }]));
    expect(dictationDraftText("Привет", first.finals, first.interim, AI_CHAT_MESSAGE_MAX_CHARS)).toBe(
      "Привет hel",
    );

    const second = consumeDictationResults(
      first.finals,
      speechEvent(0, [{ isFinal: true, transcript: "hello " }]),
    );
    const third = consumeDictationResults(
      second.finals,
      speechEvent(1, [
        { isFinal: true, transcript: "hello " },
        { isFinal: false, transcript: "there" },
      ]),
    );
    expect(dictationDraftText("", third.finals, third.interim, AI_CHAT_MESSAGE_MAX_CHARS)).toBe(
      "hello there",
    );
    expect(dictationDraftText("x", "y".repeat(20), "", 5)).toBe("x yyy");
  });
});

describe("useDictation", () => {
  afterEach(() => {
    resetDictationForTests();
  });

  it("hides dictation when the browser cannot report languages", async () => {
    const dictation = useDictation();
    await dictation.whenDictationReady();
    expect(dictation.availableLocales.value).toEqual([]);
    expect(dictation.selectedLocale.value).toBeNull();
  });

  it("stores the chosen language and writes recognition into the draft", async () => {
    localStorage.setItem(STORAGE_KEY_DICTATION_LANG, "ru");
    installRecognition(async (options: DictationAvailabilityQuery) => {
      const tag = options.langs[0];
      return tag === "ru-RU" || tag === "en-US" ? "available" : "unavailable";
    });

    const dictation = useDictation();
    await dictation.whenDictationReady();

    expect(dictation.availableLocales.value).toEqual(["en", "ru"]);
    expect(dictation.selectedLocale.value).toBe("ru");
    expect(localStorage.getItem(STORAGE_KEY_DICTATION_LANG)).toBe("ru");
    expect(FakeRecognition.available).toHaveBeenCalledTimes(DICTATION_LOCALE_ORDER.length);
    expect(FakeRecognition.available.mock.calls.map((call) => call[0]?.langs[0])).not.toContain("fr-FR");

    const draft = ref("Уже ");
    const errors: string[] = [];
    toggleDictation(draft, (error) => {
      errors.push(error);
    });

    const recognition = FakeRecognition.instances.at(-1);
    expect(recognition).toBeDefined();
    expect(recognition!.lang).toBe("ru-RU");
    expect(recognition!.continuous).toBe(true);
    expect(recognition!.interimResults).toBe(true);
    expect(dictation.listening.value).toBe(true);

    recognition!.onresult?.(speechEvent(0, [{ isFinal: false, transcript: "текст" }]));
    expect(draft.value).toBe("Уже текст");

    recognition!.onend?.();
    expect(recognition!.startCount).toBe(2);

    recognition!.onresult?.(speechEvent(0, [{ isFinal: true, transcript: "текст" }]));
    toggleDictation(draft, (error) => {
      errors.push(error);
    });
    expect(dictation.listening.value).toBe(false);
    expect(draft.value).toBe("Уже текст");
    expect(recognition!.startCount).toBe(2);

    recognition!.onresult?.(speechEvent(0, [{ isFinal: true, transcript: "ещё" }]));
    expect(draft.value).toBe("Уже текст");
    expect(errors).toEqual([]);
  });

  it("stops on a fatal recognition error and when the language changes", async () => {
    localStorage.setItem(STORAGE_KEY_DICTATION_LANG, "en");
    installRecognition(async (options: DictationAvailabilityQuery) => {
      const tag = options.langs[0];
      return tag === "ru-RU" || tag === "en-US" ? "available" : "unavailable";
    });
    const dictation = useDictation();
    await dictation.whenDictationReady();

    const draft = ref("");
    const errors: string[] = [];
    toggleDictation(draft, (error) => {
      errors.push(error);
    });
    const recognition = FakeRecognition.instances.at(-1)!;
    recognition.onerror?.({ error: "not-allowed" });
    recognition.onend?.();

    expect(errors).toEqual(["not-allowed"]);
    expect(dictation.listening.value).toBe(false);
    expect(recognition.startCount).toBe(1);

    toggleDictation(draft, () => {});
    const restarted = FakeRecognition.instances.at(-1)!;
    expect(restarted.startCount).toBe(1);
    expect(dictation.listening.value).toBe(true);

    setDictationLocale("ru");
    expect(dictation.selectedLocale.value).toBe("ru");
    expect(dictation.listening.value).toBe(false);
    expect(restarted.startCount).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY_DICTATION_LANG)).toBe("ru");
  });
});
