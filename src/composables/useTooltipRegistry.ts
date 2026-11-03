import { computed, ref } from "vue";
import type { TooltipPlacement } from "@/composables/useLongPressTooltip";

export interface TooltipRegistryEntry {
  id: symbol;
  label: string;
  anchor: HTMLElement;
  placement: TooltipPlacement;
}

const activeEntry = ref<TooltipRegistryEntry | null>(null);

export function useTooltipRegistry() {
  function show(entry: TooltipRegistryEntry): void {
    activeEntry.value = entry;
  }

  function hide(id: symbol): void {
    if (activeEntry.value?.id === id) {
      activeEntry.value = null;
    }
  }

  function hideAll(): void {
    activeEntry.value = null;
  }

  const tooltipState = computed(() => activeEntry.value);

  return {
    tooltipState,
    show,
    hide,
    hideAll,
  };
}
