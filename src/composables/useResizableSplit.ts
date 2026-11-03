import { computed, ref, type Ref } from "vue";
import {
  DEFAULT_SPLIT_RATIO,
  MAX_SPLIT_RATIO,
  MIN_PANEL_WIDTH_PX,
  MIN_SPLIT_RATIO,
  SPLIT_DIVIDER_WIDTH_PX,
  STORAGE_KEY_SPLIT_RATIO,
} from "@/constants/layout-settings";
import { readStorageJson, writeStorageJson } from "@/core/safe-storage";

export function useResizableSplit(containerRef: Ref<HTMLElement | null>) {
  const splitRatio = ref(DEFAULT_SPLIT_RATIO);
  const isDragging = ref(false);

  let activePointerId = -1;

  function clampRatio(ratio: number, containerWidth: number): number {
    const minRatio = MIN_PANEL_WIDTH_PX / containerWidth;
    const maxRatio =
      1 -
      MIN_PANEL_WIDTH_PX / containerWidth -
      SPLIT_DIVIDER_WIDTH_PX / containerWidth;

    return Math.min(
      MAX_SPLIT_RATIO,
      Math.max(MIN_SPLIT_RATIO, Math.min(maxRatio, Math.max(minRatio, ratio))),
    );
  }

  function loadStoredRatio(): void {
    const saved = readStorageJson(STORAGE_KEY_SPLIT_RATIO, (value) =>
      typeof value === "number" ? value : null,
    );
    if (
      typeof saved === "number" &&
      saved >= MIN_SPLIT_RATIO &&
      saved <= MAX_SPLIT_RATIO
    ) {
      splitRatio.value = saved;
    }
  }

  function persistRatio(): void {
    writeStorageJson(STORAGE_KEY_SPLIT_RATIO, splitRatio.value);
  }

  function updateRatioFromPointer(clientX: number): void {
    const container = containerRef.value;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const available = rect.width - SPLIT_DIVIDER_WIDTH_PX;
    if (available <= 0) {
      return;
    }

    const nextRatio = (clientX - rect.left) / available;
    splitRatio.value = clampRatio(nextRatio, rect.width);
  }

  function onDividerPointerDown(event: PointerEvent): void {
    const divider = event.currentTarget as HTMLElement;
    isDragging.value = true;
    activePointerId = event.pointerId;
    divider.setPointerCapture(event.pointerId);
    updateRatioFromPointer(event.clientX);
  }

  function onDividerPointerMove(event: PointerEvent): void {
    if (!isDragging.value || event.pointerId !== activePointerId) {
      return;
    }

    updateRatioFromPointer(event.clientX);
  }

  function onDividerPointerUp(event: PointerEvent): void {
    if (event.pointerId !== activePointerId) {
      return;
    }

    isDragging.value = false;
    activePointerId = -1;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
    persistRatio();
  }

  const editorPaneStyle = computed(() => ({
    flex: `0 0 calc((100% - ${SPLIT_DIVIDER_WIDTH_PX}px) * ${splitRatio.value})`,
    minWidth: `${MIN_PANEL_WIDTH_PX}px`,
  }));

  const previewPaneStyle = computed(() => ({
    flex: "1 1 0",
    minWidth: `${MIN_PANEL_WIDTH_PX}px`,
  }));

  loadStoredRatio();

  return {
    splitRatio,
    isDragging,
    editorPaneStyle,
    previewPaneStyle,
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  };
}
