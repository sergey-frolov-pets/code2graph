<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  PRESENTATION_HANDLE_RADIUS,
  PRESENTATION_HANDLE_RADIUS_COARSE,
  PRESENTATION_RESIZE_HANDLE,
  PRESENTATION_RESIZE_HANDLE_COARSE,
} from "@/services/presentation/constants";
import {
  artworkFitTransform,
  overlayArtwork,
  rotationTransform,
} from "@/services/presentation/glyph-art";
import { overlayCssColor } from "@/services/presentation/overlay-color";
import {
  isLineArrow,
  lineArrowPath,
  overlayOutline,
  overlayResizeHandles,
  overlayRotates,
  positiveBox,
  resizeOverlay,
} from "@/services/presentation/overlay-geometry";
import type { ResizeHandle } from "@/services/presentation/overlay-geometry";
import type {
  NormPoint,
  PresentationOverlay,
  PresentationTrack,
} from "@/services/presentation/types";
import type { PanZoomSnapshot } from "@/services/preview/pan-zoom";
import type { PresentationPhase } from "@/composables/usePresentationPlayback";
import { effectVisualAt, overlayEffectTransform } from "@/services/presentation/effects";

const props = defineProps<{
  snapshot: PanZoomSnapshot;
  track: PresentationTrack | null;
  arranging: boolean;
  editing: boolean;
  showOverlays: boolean;
  viewpointIndex: number;
  phase: PresentationPhase;
  travelOrigin: number;
  selectedOverlayId: string | null;
  addPointArmed: boolean;
  effectsLive: boolean;
  effectElapsedMs: number;
}>();

const emit = defineEmits<{
  insertPoint: [point: NormPoint];
  movePoint: [index: number, point: NormPoint];
  moveControl: [index: number, point: NormPoint];
  selectOverlay: [id: string | null];
  changeOverlay: [
    id: string,
    patch: Partial<Pick<PresentationOverlay, "x" | "y" | "width" | "height" | "tailX" | "tailY">>,
  ];
}>();

const stageRef = ref<SVGSVGElement | null>(null);
const coarsePointer = ref(false);
let media: MediaQueryList | null = null;

type Drag =
  | { kind: "point"; index: number }
  | { kind: "control"; index: number }
  | { kind: "overlay"; id: string; origin: NormPoint; pointer: NormPoint }
  | { kind: "tail"; id: string }
  | {
    kind: "resize";
    id: string;
    handle: ResizeHandle;
    x: number;
    y: number;
    width: number;
    height: number;
  };

let drag: Drag | null = null;

function onCoarseChange(): void {
  coarsePointer.value = media?.matches ?? false;
}

onMounted(() => {
  media = window.matchMedia("(pointer: coarse)");
  onCoarseChange();
  media.addEventListener("change", onCoarseChange);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
});

onUnmounted(() => {
  media?.removeEventListener("change", onCoarseChange);
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
});

const handleRadius = computed(() =>
  coarsePointer.value ? PRESENTATION_HANDLE_RADIUS_COARSE : PRESENTATION_HANDLE_RADIUS,
);

const transition = computed(() => {
  const track = props.track;
  if (!track || track.viewpoints.length < 2) {
    return null;
  }
  const index = props.editing ? props.viewpointIndex : props.travelOrigin;
  return track.transitions[index] ?? null;
});

const transitionEnds = computed(() => {
  const track = props.track;
  const current = transition.value;
  if (!track || !current) {
    return null;
  }
  const from = track.viewpoints.find((item) => item.id === current.fromId);
  const to = track.viewpoints.find((item) => item.id === current.toId);
  if (!from || !to) {
    return null;
  }
  return { from: from.anchor, to: to.anchor };
});

function toScreen(point: NormPoint): NormPoint {
  return {
    x: props.snapshot.panX + point.x * props.snapshot.imageWidth * props.snapshot.scale,
    y: props.snapshot.panY + point.y * props.snapshot.imageHeight * props.snapshot.scale,
  };
}

function fromEvent(event: PointerEvent): NormPoint {
  const rect = stageRef.value?.getBoundingClientRect();
  const localX = event.clientX - (rect?.left ?? 0);
  const localY = event.clientY - (rect?.top ?? 0);
  const imageX = (localX - props.snapshot.panX) / (props.snapshot.scale || 1);
  const imageY = (localY - props.snapshot.panY) / (props.snapshot.scale || 1);
  return {
    x: props.snapshot.imageWidth > 0 ? imageX / props.snapshot.imageWidth : 0,
    y: props.snapshot.imageHeight > 0 ? imageY / props.snapshot.imageHeight : 0,
  };
}

const pathD = computed(() => {
  const ends = transitionEnds.value;
  const current = transition.value;
  if (!ends || !current || !props.editing) {
    return "";
  }
  const start = toScreen(ends.from);
  const end = toScreen(ends.to);
  if (current.path === "polyline") {
    const commands = current.points.map((point) => {
      const screen = toScreen(point);
      return `L ${screen.x} ${screen.y}`;
    });
    return `M ${start.x} ${start.y} ${commands.join(" ")} L ${end.x} ${end.y}`;
  }
  if (current.path === "quadratic" && current.controls[0]) {
    const control = toScreen(current.controls[0]);
    return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
  }
  if (current.path === "cubic" && current.controls[0] && current.controls[1]) {
    const first = toScreen(current.controls[0]);
    const second = toScreen(current.controls[1]);
    return `M ${start.x} ${start.y} C ${first.x} ${first.y} ${second.x} ${second.y} ${end.x} ${end.y}`;
  }
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
});

const visibleOverlays = computed(() => {
  const track = props.track;
  if (!track || !props.showOverlays) {
    return [];
  }
  if (props.editing) {
    const viewpoint = track.viewpoints[props.viewpointIndex];
    const current = track.transitions[props.viewpointIndex];
    return track.overlays.filter(
      (overlay) =>
        (viewpoint && overlay.owner.kind === "viewpoint" && overlay.owner.id === viewpoint.id)
        || (current && overlay.owner.kind === "transition" && overlay.owner.id === current.id),
    );
  }
  if (!props.showOverlays) {
    return [];
  }
  if (props.phase === "travel") {
    const current = track.transitions[props.travelOrigin];
    return current
      ? track.overlays.filter(
          (overlay) => overlay.owner.kind === "transition" && overlay.owner.id === current.id,
        )
      : [];
  }
  const viewpoint = track.viewpoints[props.viewpointIndex];
  return viewpoint
    ? track.overlays.filter(
        (overlay) => overlay.owner.kind === "viewpoint" && overlay.owner.id === viewpoint.id,
      )
    : [];
});

function screenBox(overlay: PresentationOverlay): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const origin = toScreen({ x: overlay.x, y: overlay.y });
  const corner = toScreen({ x: overlay.x + overlay.width, y: overlay.y + overlay.height });
  return {
    x: origin.x,
    y: origin.y,
    width: corner.x - origin.x,
    height: corner.y - origin.y,
  };
}

function markerEnd(overlay: PresentationOverlay): string | undefined {
  return overlay.arrowHead === "end" || overlay.arrowHead === "both"
    ? "url(#presentation-arrow-end)"
    : undefined;
}

function markerStart(overlay: PresentationOverlay): string | undefined {
  return overlay.arrowHead === "start" || overlay.arrowHead === "both"
    ? "url(#presentation-arrow-start)"
    : undefined;
}

function onStagePointerDown(event: PointerEvent): void {
  if (!props.editing || !props.addPointArmed) {
    return;
  }
  event.stopPropagation();
  emit("insertPoint", fromEvent(event));
}

const OVERLAY_FONT_FAMILY = {
  sans: "sans-serif",
  serif: "serif",
  mono: "ui-monospace, monospace",
} as const;

const SELECTION_PAD = 8;

function overlayVars(overlay: PresentationOverlay): Record<string, string> {
  return {
    "--overlay-stroke": overlayCssColor(overlay.stroke, "var(--accent)"),
    "--overlay-fill": overlayCssColor(
      overlay.fill,
      "color-mix(in srgb, var(--surface) 88%, transparent)",
    ),
    "--overlay-text": overlayCssColor(overlay.textColor, "var(--text)"),
    "--overlay-font": OVERLAY_FONT_FAMILY[overlay.font],
  };
}

function selectionBox(overlay: PresentationOverlay): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const box = positiveBox(screenBox(overlay));
  let minX = box.x;
  let minY = box.y;
  let maxX = box.x + box.width;
  let maxY = box.y + box.height;
  if (isBubble(overlay)) {
    const tip = tailScreen(overlay);
    minX = Math.min(minX, tip.x);
    minY = Math.min(minY, tip.y);
    maxX = Math.max(maxX, tip.x);
    maxY = Math.max(maxY, tip.y);
  }
  return {
    x: minX - SELECTION_PAD,
    y: minY - SELECTION_PAD,
    width: maxX - minX + SELECTION_PAD * 2,
    height: maxY - minY + SELECTION_PAD * 2,
  };
}

function outline(overlay: PresentationOverlay): string | null {
  return overlayOutline(overlay, screenBox(overlay));
}

function artworkOf(overlay: PresentationOverlay) {
  return overlayArtwork(overlay);
}

function artworkFit(overlay: PresentationOverlay): string {
  const artwork = overlayArtwork(overlay);
  return artwork ? artworkFitTransform(screenBox(overlay), artwork) : "";
}

function rotationOf(overlay: PresentationOverlay): string | undefined {
  if (!overlayRotates(overlay)) {
    return undefined;
  }
  return rotationTransform(screenBox(overlay), overlay.rotation);
}

function arrowLine(overlay: PresentationOverlay): string {
  return lineArrowPath(screenBox(overlay), overlay.arrowKind);
}

const resizeHandleSize = computed(() =>
  coarsePointer.value ? PRESENTATION_RESIZE_HANDLE_COARSE : PRESENTATION_RESIZE_HANDLE,
);

function resizeHandles(overlay: PresentationOverlay): Array<{
  id: ResizeHandle;
  x: number;
  y: number;
  cursor: string;
}> {
  return overlayResizeHandles(overlay).map((handle) => {
    const screen = toScreen(handle);
    return { id: handle.id, x: screen.x, y: screen.y, cursor: handle.cursor };
  });
}

function beginResize(event: PointerEvent, overlay: PresentationOverlay, handle: ResizeHandle): void {
  beginDrag(event, {
    kind: "resize",
    id: overlay.id,
    handle,
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
  });
}

function onOverlayPointerDown(event: PointerEvent, overlay: PresentationOverlay): void {
  if (!props.arranging) {
    return;
  }
  const target = event.target;
  if (target instanceof Element && target.classList.contains("presentation-handle")) {
    return;
  }
  emit("selectOverlay", overlay.id);
  beginDrag(event, {
    kind: "overlay",
    id: overlay.id,
    origin: { x: overlay.x, y: overlay.y },
    pointer: fromEvent(event),
  });
}

function beginDrag(event: PointerEvent, next: Drag): void {
  event.stopPropagation();
  event.preventDefault();
  drag = next;
}

function onPointerMove(event: PointerEvent): void {
  const current = drag;
  if (!current) {
    return;
  }
  const point = fromEvent(event);
  if (current.kind === "point") {
    emit("movePoint", current.index, point);
    return;
  }
  if (current.kind === "control") {
    emit("moveControl", current.index, point);
    return;
  }
  if (current.kind === "overlay") {
    const overlay = props.track?.overlays.find((item) => item.id === current.id);
    emit("changeOverlay", current.id, {
      x: current.origin.x + (point.x - current.pointer.x),
      y: current.origin.y + (point.y - current.pointer.y),
      width: overlay?.width ?? 0,
      height: overlay?.height ?? 0,
    });
    return;
  }
  if (current.kind === "tail") {
    const overlay = props.track?.overlays.find((item) => item.id === current.id);
    if (!overlay || overlay.width === 0 || overlay.height === 0) {
      return;
    }
    emit("changeOverlay", current.id, {
      tailX: (point.x - overlay.x) / overlay.width,
      tailY: (point.y - overlay.y) / overlay.height,
    });
    return;
  }
  emit("changeOverlay", current.id, resizeOverlay(current, current.handle, point));
}

function onPointerUp(): void {
  drag = null;
}

function overlayEffect(overlay: PresentationOverlay): { opacity: number; transform?: string } {
  if (!props.effectsLive || !props.track) {
    return { opacity: 1 };
  }
  const viewpoint = props.phase === "travel"
    ? props.track.viewpoints[props.travelOrigin]
    : props.track.viewpoints[props.viewpointIndex];
  const visual = effectVisualAt(
    viewpoint?.effects ?? [],
    props.effectElapsedMs,
    "overlay",
    overlay.id,
  );
  return {
    opacity: visual.opacity,
    transform: overlayEffectTransform(screenBox(overlay), visual.scale),
  };
}

function isBubble(overlay: PresentationOverlay): boolean {
  return overlay.shape === "text" && overlay.backing === "bubble";
}

function tailScreen(overlay: PresentationOverlay): NormPoint {
  const box = screenBox(overlay);
  return {
    x: box.x + overlay.tailX * box.width,
    y: box.y + overlay.tailY * box.height,
  };
}

function overlayTextSize(overlay: PresentationOverlay): number {
  const box = screenBox(overlay);
  return Math.max(12, Math.min(28, Math.abs(box.height) * 0.45));
}
</script>

<template>
  <svg
    ref="stageRef"
    class="presentation-stage"
    :class="{
      'is-drawing': editing && addPointArmed,
      'is-arranging': arranging,
      'is-editing': editing,
    }"
    @pointerdown="onStagePointerDown"
  >
    <defs>
      <marker
        id="presentation-arrow-end"
        markerWidth="8"
        markerHeight="8"
        refX="7"
        refY="3"
        orient="auto"
      >
        <path
          d="M0,0 L7,3 L0,6 Z"
          fill="context-stroke"
        />
      </marker>
      <marker
        id="presentation-arrow-start"
        markerWidth="8"
        markerHeight="8"
        refX="0"
        refY="3"
        orient="auto"
      >
        <path
          d="M7,0 L0,3 L7,6 Z"
          fill="context-stroke"
        />
      </marker>
    </defs>

    <path
      v-if="pathD"
      :d="pathD"
      class="presentation-path"
    />

    <template v-if="editing && transition && transitionEnds">
      <line
        v-for="(control, index) in transition.controls"
        :key="`guide-${index}`"
        class="presentation-guide"
        :x1="toScreen(index === 0 ? transitionEnds.from : transitionEnds.to).x"
        :y1="toScreen(index === 0 ? transitionEnds.from : transitionEnds.to).y"
        :x2="toScreen(control).x"
        :y2="toScreen(control).y"
      />
      <circle
        v-for="(point, index) in transition.points"
        :key="`point-${index}`"
        class="presentation-handle"
        :cx="toScreen(point).x"
        :cy="toScreen(point).y"
        :r="handleRadius"
        @pointerdown="beginDrag($event, { kind: 'point', index })"
      />
      <circle
        v-for="(control, index) in transition.controls"
        :key="`control-${index}`"
        class="presentation-handle presentation-handle--control"
        :cx="toScreen(control).x"
        :cy="toScreen(control).y"
        :r="handleRadius"
        @pointerdown="beginDrag($event, { kind: 'control', index })"
      />
    </template>

    <g
      v-for="overlay in visibleOverlays"
      :key="overlay.id"
      class="presentation-overlay"
      :class="{
        'is-selected': overlay.id === selectedOverlayId,
        'is-dashed': overlay.line === 'dashed',
      }"
      :style="overlayVars(overlay)"
      :opacity="overlayEffect(overlay).opacity"
      :transform="overlayEffect(overlay).transform"
      @pointerdown="onOverlayPointerDown($event, overlay)"
    >
      <rect
        v-if="editing && overlay.id === selectedOverlayId"
        class="presentation-selection"
        :x="selectionBox(overlay).x"
        :y="selectionBox(overlay).y"
        :width="selectionBox(overlay).width"
        :height="selectionBox(overlay).height"
        rx="8"
      />
      <g
        v-if="artworkOf(overlay)"
        class="presentation-artwork"
        :transform="rotationOf(overlay)"
      >
        <g :transform="artworkFit(overlay)">
          <g :transform="artworkOf(overlay)?.transform">
            <path
              v-for="(part, index) in artworkOf(overlay)?.parts"
              :key="`${overlay.id}-art-${index}`"
              :d="part.d"
              :fill="part.fill"
              :stroke="part.stroke"
              :stroke-width="part.strokeWidth || undefined"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
        </g>
      </g>
      <g
        v-else-if="outline(overlay) && overlayRotates(overlay)"
        :transform="rotationOf(overlay)"
      >
        <path
          class="presentation-shape"
          :d="outline(overlay) ?? undefined"
        />
      </g>
      <path
        v-else-if="outline(overlay)"
        class="presentation-shape"
        :d="outline(overlay) ?? undefined"
      />
      <rect
        v-else-if="overlay.shape === 'text'"
        class="presentation-hit"
        :x="positiveBox(screenBox(overlay)).x"
        :y="positiveBox(screenBox(overlay)).y"
        :width="positiveBox(screenBox(overlay)).width"
        :height="positiveBox(screenBox(overlay)).height"
      />
      <template v-else-if="isLineArrow(overlay)">
        <path
          class="presentation-arrow-hit"
          :d="arrowLine(overlay)"
        />
        <path
          class="presentation-arrow"
          :d="arrowLine(overlay)"
          :marker-end="markerEnd(overlay)"
          :marker-start="markerStart(overlay)"
        />
      </template>
      <rect
        v-if="arranging && !isLineArrow(overlay)"
        class="presentation-drag"
        :x="positiveBox(screenBox(overlay)).x"
        :y="positiveBox(screenBox(overlay)).y"
        :width="positiveBox(screenBox(overlay)).width"
        :height="positiveBox(screenBox(overlay)).height"
      />
      <text
        v-if="overlay.shape === 'text' && overlay.text"
        class="presentation-label"
        :x="screenBox(overlay).x + screenBox(overlay).width / 2"
        :y="screenBox(overlay).y + screenBox(overlay).height / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        :font-size="overlayTextSize(overlay)"
      >
        {{ overlay.text }}
      </text>
      <rect
        v-for="handle in editing && overlay.id === selectedOverlayId ? resizeHandles(overlay) : []"
        :key="`${overlay.id}-${handle.id}`"
        class="presentation-handle presentation-resize"
        :x="handle.x - resizeHandleSize / 2"
        :y="handle.y - resizeHandleSize / 2"
        :width="resizeHandleSize"
        :height="resizeHandleSize"
        rx="1"
        :style="{ cursor: handle.cursor }"
        @pointerdown="beginResize($event, overlay, handle.id)"
      />
      <circle
        v-if="editing && overlay.id === selectedOverlayId && isBubble(overlay)"
        class="presentation-handle presentation-tail"
        :cx="tailScreen(overlay).x"
        :cy="tailScreen(overlay).y"
        :r="handleRadius"
        @pointerdown="beginDrag($event, { kind: 'tail', id: overlay.id })"
      />
    </g>
  </svg>
</template>

<style scoped>
.presentation-stage {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.presentation-stage.is-drawing {
  pointer-events: auto;
  cursor: crosshair;
}

.presentation-stage:not(.is-arranging) .presentation-shape,
.presentation-stage:not(.is-arranging) .presentation-arrow,
.presentation-stage:not(.is-arranging) .presentation-hit,
.presentation-stage:not(.is-arranging) .presentation-artwork,
.presentation-stage:not(.is-arranging) .presentation-drag {
  pointer-events: none;
}

.presentation-stage.is-arranging .presentation-overlay {
  touch-action: none;
}

.presentation-path,
.presentation-arrow,
.presentation-guide {
  fill: none;
  stroke: var(--overlay-stroke, var(--accent));
  stroke-width: 2;
  pointer-events: none;
}

.presentation-guide {
  stroke-dasharray: 4 4;
  opacity: 0.7;
}

.presentation-shape,
.presentation-hit {
  fill: var(--overlay-fill, color-mix(in srgb, var(--surface) 88%, transparent));
  stroke: var(--overlay-stroke, var(--accent));
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  pointer-events: auto;
  cursor: pointer;
}

.presentation-stage.is-arranging .presentation-shape,
.presentation-stage.is-arranging .presentation-hit,
.presentation-stage.is-arranging .presentation-artwork,
.presentation-stage.is-arranging .presentation-artwork path,
.presentation-stage.is-arranging .presentation-drag,
.presentation-stage.is-arranging .presentation-selection,
.presentation-stage.is-arranging .presentation-arrow-hit {
  cursor: move;
}

.presentation-stage.is-arranging .presentation-shape,
.presentation-stage.is-arranging .presentation-hit,
.presentation-stage.is-arranging .presentation-artwork,
.presentation-stage.is-arranging .presentation-artwork path,
.presentation-stage.is-arranging .presentation-drag,
.presentation-stage.is-arranging .presentation-selection {
  pointer-events: auto;
}

.presentation-hit {
  fill: transparent;
  stroke: transparent;
}

.presentation-drag {
  fill: transparent;
  stroke: none;
}

.presentation-stage.is-editing .presentation-overlay:hover .presentation-hit,
.presentation-stage.is-editing .presentation-overlay.is-selected .presentation-hit {
  stroke: var(--overlay-stroke, var(--accent));
  stroke-width: 2;
}

.presentation-arrow-hit {
  fill: none;
  stroke: transparent;
  stroke-width: 18;
  pointer-events: stroke;
  cursor: pointer;
}

.presentation-arrow {
  stroke-width: 2.5;
}

.presentation-overlay.is-dashed .presentation-shape,
.presentation-overlay.is-dashed .presentation-arrow {
  stroke-dasharray: 8 5;
}

.presentation-stage.is-editing .presentation-overlay:hover .presentation-shape,
.presentation-stage.is-editing .presentation-overlay:hover .presentation-arrow {
  stroke-width: 3.5;
}

.presentation-stage.is-editing .presentation-overlay.is-selected .presentation-shape,
.presentation-stage.is-editing .presentation-overlay.is-selected .presentation-arrow {
  stroke-width: 4;
}

.presentation-stage.is-editing .presentation-overlay.is-selected .presentation-label {
  font-weight: 700;
}

.presentation-selection {
  fill: color-mix(in srgb, var(--danger) 12%, transparent);
  stroke: var(--danger);
  stroke-width: 2;
  stroke-dasharray: 5 4;
  pointer-events: none;
}

.presentation-label {
  fill: var(--overlay-text, var(--text));
  font-family: var(--overlay-font, sans-serif);
  pointer-events: none;
}

.presentation-handle {
  fill: var(--surface);
  stroke: var(--accent);
  stroke-width: 2;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
}

.presentation-handle--control {
  fill: var(--accent);
}

.presentation-resize {
  fill: var(--surface);
  stroke: var(--accent);
  stroke-width: 1.5;
  rx: 1;
}

</style>
