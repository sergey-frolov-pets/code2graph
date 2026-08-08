import { computed, ref } from "vue";

interface ModalStackEntry {
  id: string;
  layer: "default" | "above-library";
  onClose: () => void;
}

const stack = ref<ModalStackEntry[]>([]);

export function useModalStack() {
  function pushModal(
    id: string,
    onClose: () => void,
    layer: ModalStackEntry["layer"] = "default",
  ): void {
    const existingIndex = stack.value.findIndex((entry) => entry.id === id);
    if (existingIndex >= 0) {
      stack.value.splice(existingIndex, 1);
    }

    stack.value.push({ id, layer, onClose });
  }

  function popModal(id?: string): void {
    if (!id) {
      stack.value.pop();
      return;
    }

    stack.value = stack.value.filter((entry) => entry.id !== id);
  }

  function closeTopModal(): void {
    const top = stack.value.at(-1);
    top?.onClose();
  }

  const topModal = computed(() => stack.value.at(-1) ?? null);

  const stackDepth = computed(() => stack.value.length);

  return {
    stack,
    topModal,
    stackDepth,
    pushModal,
    popModal,
    closeTopModal,
  };
}
