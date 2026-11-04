import { computed, nextTick, onUnmounted, ref, watch, type Ref } from "vue";
import {
  SNIPPETS_PANEL_MARGIN,
  SNIPPETS_PANEL_WIDTH,
} from "@/constants/snippets-settings";
import {
  clampSnippetsPanelPosition,
  getDefaultSnippetsPanelPosition,
  loadSnippetsPanelPosition,
  saveSnippetsPanelPosition,
} from "@/storage/snippets";

export function useDraggableFloatingPanel(options: {
  open: Ref<boolean>;
  panelRef: Ref<HTMLElement | null>;
  isMobileSheet: Ref<boolean>;
}) {
  const { open, panelRef, isMobileSheet } = options;

  const panelPosition = ref(getDefaultSnippetsPanelPosition(SNIPPETS_PANEL_WIDTH));
  const isDragging = ref(false);

  const dragState = {
    pointerId: -1,
    offsetX: 0,
    offsetY: 0,
  };

  const panelStyle = computed(() => ({
    left: `${panelPosition.value.x}px`,
    top: `${panelPosition.value.y}px`,
    width: `min(${SNIPPETS_PANEL_WIDTH}px, calc(100vw - ${SNIPPETS_PANEL_MARGIN * 2}px))`,
  }));

  function clampPanelToViewport(): void {
    const panel = panelRef.value;
    if (!panel) {
      return;
    }

    panelPosition.value = clampSnippetsPanelPosition(
      panelPosition.value,
      panel.offsetWidth,
      panel.offsetHeight,
      SNIPPETS_PANEL_MARGIN,
    );
  }

  function persistPanelPosition(): void {
    saveSnippetsPanelPosition(panelPosition.value);
  }

  function onHeaderPointerDown(event: PointerEvent): void {
    if (isMobileSheet.value) {
      return;
    }

    if ((event.target as Element).closest("button")) {
      return;
    }

    const panel = panelRef.value;
    if (!panel) {
      return;
    }

    isDragging.value = true;
    dragState.pointerId = event.pointerId;
    dragState.offsetX = event.clientX - panelPosition.value.x;
    dragState.offsetY = event.clientY - panelPosition.value.y;
    panel.setPointerCapture(event.pointerId);
  }

  function onHeaderPointerMove(event: PointerEvent): void {
    if (!isDragging.value || event.pointerId !== dragState.pointerId) {
      return;
    }

    const panel = panelRef.value;
    if (!panel) {
      return;
    }

    panelPosition.value = clampSnippetsPanelPosition(
      {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      },
      panel.offsetWidth,
      panel.offsetHeight,
      SNIPPETS_PANEL_MARGIN,
    );
  }

  function onHeaderPointerUp(event: PointerEvent): void {
    if (event.pointerId !== dragState.pointerId) {
      return;
    }

    isDragging.value = false;
    dragState.pointerId = -1;
    panelRef.value?.releasePointerCapture(event.pointerId);
    persistPanelPosition();
  }

  function onWindowResize(): void {
    clampPanelToViewport();
    persistPanelPosition();
  }

  watch(open, async (isOpen) => {
    if (!isOpen) {
      window.removeEventListener("resize", onWindowResize);
      return;
    }

    window.addEventListener("resize", onWindowResize);
    const saved = loadSnippetsPanelPosition();
    panelPosition.value =
      saved ?? getDefaultSnippetsPanelPosition(SNIPPETS_PANEL_WIDTH);

    await nextTick();
    clampPanelToViewport();
  });

  onUnmounted(() => {
    window.removeEventListener("resize", onWindowResize);
  });

  return {
    isDragging,
    panelStyle,
    onHeaderPointerDown,
    onHeaderPointerMove,
    onHeaderPointerUp,
  };
}
