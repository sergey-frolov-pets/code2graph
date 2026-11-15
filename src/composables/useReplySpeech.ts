import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  AI_CHAT_SPEAK_IMMEDIATE_STORAGE_KEY,
  AI_CHAT_SPEECH_RATE_STORAGE_KEY,
  parseAiChatSpeechRate,
  type AiChatSpeechRate,
} from "@/constants/ai-chat";
import { dictationSpeechTag } from "@/constants/dictation";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";
import { useLocale } from "@/composables/useLocale";
import { stripReplySpeechMarkup } from "@/utils/reply-speech";

const available = ref(false);
const speakingId = ref<string | null>(null);
const speakImmediately = ref(readStorageItem(AI_CHAT_SPEAK_IMMEDIATE_STORAGE_KEY) === "1");
const rate = ref<AiChatSpeechRate>(parseAiChatSpeechRate(readStorageItem(AI_CHAT_SPEECH_RATE_STORAGE_KEY)));

let voicesListener: (() => void) | null = null;
let listenerCount = 0;

function speechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null;
  }
  if (typeof SpeechSynthesisUtterance === "undefined") {
    return null;
  }
  return window.speechSynthesis;
}

function refreshVoices(): void {
  const synth = speechSynthesis();
  available.value = Boolean(synth && synth.getVoices().length > 0);
}

function attachVoicesListener(): void {
  const synth = speechSynthesis();
  if (!synth || voicesListener) {
    refreshVoices();
    return;
  }
  voicesListener = () => {
    refreshVoices();
  };
  synth.addEventListener("voiceschanged", voicesListener);
  refreshVoices();
}

function detachVoicesListener(): void {
  const synth = speechSynthesis();
  if (synth && voicesListener) {
    synth.removeEventListener("voiceschanged", voicesListener);
  }
  voicesListener = null;
}

function stopSpeaking(): void {
  speechSynthesis()?.cancel();
  speakingId.value = null;
}

function speakReply(id: string, text: string): void {
  const synth = speechSynthesis();
  if (!synth || !available.value) {
    return;
  }
  const spoken = stripReplySpeechMarkup(text);
  if (!spoken) {
    return;
  }
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = dictationSpeechTag(useLocale().locale.value);
  utterance.rate = rate.value;
  const finish = () => {
    if (speakingId.value === id) {
      speakingId.value = null;
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  speakingId.value = id;
  synth.speak(utterance);
}

function toggleReplySpeech(id: string, text: string): void {
  if (speakingId.value === id) {
    stopSpeaking();
    return;
  }
  speakReply(id, text);
}

watch(speakImmediately, (value) => {
  writeStorageItem(AI_CHAT_SPEAK_IMMEDIATE_STORAGE_KEY, value ? "1" : "0");
});

watch(rate, (value) => {
  writeStorageItem(AI_CHAT_SPEECH_RATE_STORAGE_KEY, String(value));
});

export function useReplySpeech() {
  onMounted(() => {
    listenerCount += 1;
    attachVoicesListener();
  });

  onBeforeUnmount(() => {
    listenerCount = Math.max(0, listenerCount - 1);
    if (listenerCount === 0) {
      detachVoicesListener();
      stopSpeaking();
    }
  });

  return {
    available,
    speakingId,
    speakImmediately,
    rate,
    speakReply,
    stopSpeaking,
    toggleReplySpeech,
  };
}

/** Сбрасывает состояние между тестами. */
export function resetReplySpeechForTests(): void {
  stopSpeaking();
  detachVoicesListener();
  listenerCount = 0;
  available.value = false;
  speakImmediately.value = readStorageItem(AI_CHAT_SPEAK_IMMEDIATE_STORAGE_KEY) === "1";
  rate.value = parseAiChatSpeechRate(readStorageItem(AI_CHAT_SPEECH_RATE_STORAGE_KEY));
}
