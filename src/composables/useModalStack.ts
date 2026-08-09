import { computed, ref } from "vue";

export type ModalLayer = "default" | "above-library";

interface ModalStackEntry {
  id: string;
  layer: ModalLayer;
  onClose: () => void;
}

const stack = ref<ModalStackEntry[]>([]);
const MODAL_Z_INDEX_BASE = 1000;
const MODAL_Z_INDEX_STEP = 10;
const LIBRARY_Z_INDEX_BASE = 900;

let escapeListenerAttached = false;
let scrollLockCount = 0;

function lockBodyScroll(): void {
  if (scrollLockCount === 0) {
    document.body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
}

function unlockBodyScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = "";
  }
}

function ensureEscapeListener(): void {
  if (escapeListenerAttached || typeof document === "undefined") {
    return;
  }

  escapeListenerAttached = true;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || stack.value.length === 0) {
      return;
    }

    event.preventDefault();
    stack.value.at(-1)?.onClose();
  });
}

export function getModalZIndex(layer: ModalLayer, depth: number): number {
  const base = layer === "above-library" ? LIBRARY_Z_INDEX_BASE + 100 : MODAL_Z_INDEX_BASE;
  return base + depth * MODAL_Z_INDEX_STEP;
}

export function useModalStack() {
  function pushModal(
    id: string,
    onClose: () => void,
    layer: ModalLayer = "default",
  ): void {
    ensureEscapeListener();

    const existingIndex = stack.value.findIndex((entry) => entry.id === id);
    if (existingIndex >= 0) {
      stack.value.splice(existingIndex, 1);
    }

    const wasEmpty = stack.value.length === 0;
    stack.value.push({ id, layer, onClose });
    if (wasEmpty) {
      lockBodyScroll();
    }
  }

  function popModal(id?: string): void {
    if (!id) {
      const removed = stack.value.pop();
      if (removed && stack.value.length === 0) {
        unlockBodyScroll();
      }
      return;
    }

    const before = stack.value.length;
    stack.value = stack.value.filter((entry) => entry.id !== id);
    if (before > 0 && stack.value.length === 0) {
      unlockBodyScroll();
    }
  }

  function closeTopModal(): void {
    stack.value.at(-1)?.onClose();
  }

  const topModal = computed(() => stack.value.at(-1) ?? null);

  const stackDepth = computed(() => stack.value.length);

  function isTopModal(id: string): boolean {
    return topModal.value?.id === id;
  }

  function getStackZIndex(id: string): number | undefined {
    const index = stack.value.findIndex((entry) => entry.id === id);
    if (index < 0) {
      return undefined;
    }

    return getModalZIndex(stack.value[index]!.layer, index + 1);
  }

  return {
    stack,
    topModal,
    stackDepth,
    pushModal,
    popModal,
    closeTopModal,
    isTopModal,
    getStackZIndex,
  };
}
