import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Ref,
} from "vue";
import {
  PreviewPanZoomController,
  type PanZoomSnapshot,
} from "@/services/preview/pan-zoom";

const DEFAULT_SNAPSHOT: PanZoomSnapshot = {
  panX: 0,
  panY: 0,
  scale: 1,
  imageWidth: 800,
  imageHeight: 600,
  isDragging: false,
  isPinching: false,
};

export function usePreviewPanZoom(
  viewportRef: Ref<HTMLElement | null>,
  contentRef: Ref<HTMLElement | null>,
  svgMarkup: Ref<string>,
) {
  const snapshot = ref<PanZoomSnapshot>({ ...DEFAULT_SNAPSHOT });
  let controller: PreviewPanZoomController | null = null;

  function ensureController(): PreviewPanZoomController {
    if (!controller) {
      controller = new PreviewPanZoomController({
        getViewport: () => viewportRef.value,
        getContent: () => contentRef.value,
        getSvgMarkup: () => svgMarkup.value,
        onChange: (next) => {
          snapshot.value = next;
        },
      });
    }

    return controller;
  }

  const contentStyle = computed(() => ({
    transform: `translate(${snapshot.value.panX}px, ${snapshot.value.panY}px) scale(${snapshot.value.scale})`,
    transformOrigin: "0 0",
  }));

  const zoomPercent = computed(() => Math.round(snapshot.value.scale * 100));

  watch(svgMarkup, () => {
    ensureController().syncFromMarkup();
  });

  onMounted(() => {
    ensureController().mount();
  });

  onUnmounted(() => {
    controller?.unmount();
    controller = null;
  });

  return {
    contentStyle,
    isDragging: computed(() => snapshot.value.isDragging),
    isPinching: computed(() => snapshot.value.isPinching),
    zoomPercent,
    zoomIn: () => ensureController().zoomIn(),
    zoomOut: () => ensureController().zoomOut(),
    fitToView: () => ensureController().fitToView(),
    onPointerDown: (event: PointerEvent) => ensureController().onPointerDown(event),
    onPointerMove: (event: PointerEvent) => ensureController().onPointerMove(event),
    onPointerUp: (event: PointerEvent) => ensureController().onPointerUp(event),
    onPointerCancel: (event: PointerEvent) => ensureController().onPointerUp(event),
  };
}
