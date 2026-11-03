import { onUnmounted, ref } from "vue";

const DEFAULT_NOTICE_DURATION_MS = 3000;

export function useTransientNotice(durationMs = DEFAULT_NOTICE_DURATION_MS) {
  const notice = ref("");
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clearNotice(): void {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    notice.value = "";
  }

  function showNotice(message: string): void {
    notice.value = message;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      notice.value = "";
      timer = undefined;
    }, durationMs);
  }

  onUnmounted(() => {
    clearNotice();
  });

  return {
    notice,
    showNotice,
    clearNotice,
  };
}
