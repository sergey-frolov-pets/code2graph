import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
  type Ref,
} from "vue";
import {
  PREVIEW_FIT_MARGIN_RATIO,
  PREVIEW_MIN_ZOOM,
  PREVIEW_ZOOM_SENSITIVITY,
} from "@/constants/preview-pan-zoom";
import { parseSvgSize } from "@/utils/export";

type Size = { width: number; height: number };

function readViewportSize(viewport: HTMLElement): Size {
  return {
    width: viewport.clientWidth,
    height: viewport.clientHeight,
  };
}

function clampPan(
  panX: number,
  panY: number,
  scaledWidth: number,
  scaledHeight: number,
  containerWidth: number,
  containerHeight: number,
): { panX: number; panY: number } {
  const minX = -scaledWidth;
  const maxX = containerWidth;
  const minY = -scaledHeight;
  const maxY = containerHeight;

  return {
    panX: Math.min(maxX, Math.max(minX, panX)),
    panY: Math.min(maxY, Math.max(minY, panY)),
  };
}

export function usePreviewPanZoom(
  viewportRef: Ref<HTMLElement | null>,
  contentRef: Ref<HTMLElement | null>,
  svgMarkup: Ref<string>,
) {
  const panX = ref(0);
  const panY = ref(0);
  const scale = ref(1);
  const imageWidth = ref(800);
  const imageHeight = ref(600);
  const isDragging = ref(false);

  let dragStartX = 0;
  let dragStartY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let activePointerId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;

  function getScaledSize(): Size {
    return {
      width: imageWidth.value * scale.value,
      height: imageHeight.value * scale.value,
    };
  }

  function applyClamp(): void {
    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    const { width: sw, height: sh } = getScaledSize();
    const clamped = clampPan(panX.value, panY.value, sw, sh, cw, ch);
    panX.value = clamped.panX;
    panY.value = clamped.panY;
  }

  function fitToView(): void {
    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const { width: cw, height: ch } = readViewportSize(viewport);
    if (cw <= 0 || ch <= 0 || imageWidth.value <= 0 || imageHeight.value <= 0) {
      return;
    }

    const fitScale = Math.min(
      (cw * PREVIEW_FIT_MARGIN_RATIO) / imageWidth.value,
      (ch * PREVIEW_FIT_MARGIN_RATIO) / imageHeight.value,
    );
    scale.value = Math.max(PREVIEW_MIN_ZOOM, fitScale);

    const { width: sw, height: sh } = getScaledSize();
    const clamped = clampPan((cw - sw) / 2, (ch - sh) / 2, sw, sh, cw, ch);
    panX.value = clamped.panX;
    panY.value = clamped.panY;
  }

  function measureImageSize(): void {
    const content = contentRef.value;
    const svg = content?.querySelector("svg");

    if (svg) {
      try {
        const box = svg.getBBox();
        if (box.width > 0 && box.height > 0) {
          imageWidth.value = box.width;
          imageHeight.value = box.height;
          return;
        }
      } catch {
        // getBBox may fail before the SVG is painted.
      }
    }

    if (svgMarkup.value) {
      const parsed = parseSvgSize(svgMarkup.value);
      imageWidth.value = parsed.width;
      imageHeight.value = parsed.height;
    }
  }

  async function syncFromMarkup(): Promise<void> {
    if (!svgMarkup.value) {
      return;
    }

    const parsed = parseSvgSize(svgMarkup.value);
    imageWidth.value = parsed.width;
    imageHeight.value = parsed.height;

    await nextTick();
    measureImageSize();
    fitToView();
  }

  function zoomAt(cursorX: number, cursorY: number, zoomFactor: number): void {
    const oldScale = scale.value;
    const newScale = Math.max(PREVIEW_MIN_ZOOM, oldScale * zoomFactor);
    if (newScale === oldScale) {
      return;
    }

    const ratio = newScale / oldScale;
    panX.value = cursorX - (cursorX - panX.value) * ratio;
    panY.value = cursorY - (cursorY - panY.value) * ratio;
    scale.value = newScale;
    applyClamp();
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();

    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const zoomFactor = Math.exp(-event.deltaY * PREVIEW_ZOOM_SENSITIVITY);
    zoomAt(cursorX, cursorY, zoomFactor);
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    activePointerId = event.pointerId;
    isDragging.value = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    panStartX = panX.value;
    panStartY = panY.value;

    const viewport = viewportRef.value;
    if (viewport) {
      viewport.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!isDragging.value || activePointerId !== event.pointerId) {
      return;
    }

    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    const { width: cw, height: ch } = readViewportSize(viewport);
    const { width: sw, height: sh } = getScaledSize();
    const clamped = clampPan(
      panStartX + dx,
      panStartY + dy,
      sw,
      sh,
      cw,
      ch,
    );
    panX.value = clamped.panX;
    panY.value = clamped.panY;
  }

  function endPointerDrag(event: PointerEvent): void {
    if (activePointerId !== event.pointerId) {
      return;
    }

    isDragging.value = false;
    activePointerId = null;

    const viewport = viewportRef.value;
    if (viewport?.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  }

  const contentStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${scale.value})`,
    transformOrigin: "0 0",
  }));

  watch(svgMarkup, () => {
    syncFromMarkup();
  });

  onMounted(() => {
    const viewport = viewportRef.value;
    if (!viewport) {
      return;
    }

    resizeObserver = new ResizeObserver(() => {
      applyClamp();
    });
    resizeObserver.observe(viewport);

    syncFromMarkup();
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  return {
    contentStyle,
    isDragging,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp: endPointerDrag,
    onPointerCancel: endPointerDrag,
  };
}
