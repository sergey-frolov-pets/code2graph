import { onMounted, onUnmounted, ref, type Ref } from "vue";

export function useMediaQuery(query: string): Ref<boolean> {
  const readMatches = (): boolean => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }

    return window.matchMedia(query).matches;
  };

  const matches = ref(readMatches());
  let mediaQuery: MediaQueryList | null = null;

  function sync(event?: MediaQueryListEvent): void {
    if (!mediaQuery) {
      return;
    }

    matches.value = event?.matches ?? mediaQuery.matches;
  }

  onMounted(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    mediaQuery = window.matchMedia(query);
    sync();
    mediaQuery.addEventListener("change", sync);
  });

  onUnmounted(() => {
    mediaQuery?.removeEventListener("change", sync);
    mediaQuery = null;
  });

  return matches;
}
