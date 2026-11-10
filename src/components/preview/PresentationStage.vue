<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  PRESENTATION_HANDLE_RADIUS,
  PRESENTATION_HANDLE_RADIUS_COARSE,
} from "@/services/presentation/constants";
import type {
  NormPoint,
  PresentationOverlay,
  PresentationTrack,
} from "@/services/presentation/types";
import type { PanZoomSnapshot } from "@/services/preview/pan-zoom";
import type { PresentationPhase } from "@/composables/usePresentationPlayback";

const props = defineProps<{
  snapshot: PanZoomSnapshot;
  track: PresentationTrack | null;
  editing: boolean;
  showOverlays: boolean;
  viewpointIndex: number;
  phase: PresentationPhase;
  travelOrigin: number;
  selectedOverlayId: string | null;
  addPointArmed: boolean;
}>();

const emit = defineEmits<{
  insertPoint: [point: NormPoint];
  movePoint: [index: number, point: NormPoint];
  moveControl: [index: number, point: NormPoint];
  selectOverlay: [id: string | null];
  changeOverlay: [id: string, patch: Pick<PresentationOverlay, "x" | "y" | "width" | "height">];
}>();

const stageRef = ref<SVGSVGElement | null>(null);
const coarsePointer = ref(false);
let media: MediaQueryList | null = null;

type Drag =
  | { kind: "point"; index: number }
  | { kind: "control"; index: number }
  | { kind: "overlay"; id: string; origin: NormPoint; pointer: NormPoint }
  | { kind: "resize"; id: string; origin: NormPoint; width: number; height: number };

let drag: Drag | null = null;

function onCoarseChange(): void {
  coarsePointer.value = media?.matches ?? false;
}

onMounted(() => {
  media = window.matchMedia("(pointer: coarse)");
  onCoarseChange();
  media.addEventListener("change", onCoarseChange);
});

onUnmounted(() => {
  media?.removeEventListener("change", onCoarseChange);
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

function arrowPath(overlay: PresentationOverlay): string {
  const start = toScreen({ x: overlay.x, y: overlay.y });
  const end = toScreen({ x: overlay.x + overlay.width, y: overlay.y + overlay.height });
  if (overlay.arrowKind === "elbow") {
    return `M ${start.x} ${start.y} L ${end.x} ${start.y} L ${end.x} ${end.y}`;
  }
  if (overlay.arrowKind === "curve") {
    const controlX = (start.x + end.x) / 2 - (end.y - start.y) * 0.35;
    const controlY = (start.y + end.y) / 2 + (end.x - start.x) * 0.35;
    return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`;
  }
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
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

function bubbleTail(overlay: PresentationOverlay): string {
  const box = screenBox(overlay);
  const left = box.width < 0 ? box.x + box.width : box.x;
  const bottom = box.height < 0 ? box.y : box.y + box.height;
  const width = Math.abs(box.width);
  return `${left + width * 0.2},${bottom} ${left + width * 0.38},${bottom} ${left + width * 0.16},${bottom + Math.min(18, width * 0.2)}`;
}

function onStagePointerDown(event: PointerEvent): void {
  if (!props.editing || !props.addPointArmed) {
    return;
  }
  event.stopPropagation();
  emit("insertPoint", fromEvent(event));
}

function beginDrag(event: PointerEvent, next: Drag): void {
  event.stopPropagation();
  event.preventDefault();
  drag = next;
  (event.currentTarget as Element).setPointerCapture(event.pointerId);
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
  const overlay = props.track?.overlays.find((item) => item.id === current.id);
  if (!overlay) {
    return;
  }
  emit("changeOverlay", current.id, {
    x: overlay.x,
    y: overlay.y,
    width: current.width + (point.x - current.origin.x),
    height: current.height + (point.y - current.origin.y),
  });
}

function onPointerUp(): void {
  drag = null;
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
    :class="{ 'is-drawing': editing && addPointArmed, 'is-editing': editing }"
    @pointerdown="onStagePointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
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
          class="presentation-arrow-head"
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
          class="presentation-arrow-head"
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
      :class="{ 'is-selected': overlay.id === selectedOverlayId }"
    >
      <template v-if="overlay.shape === 'rect' || (overlay.shape === 'text' && overlay.backing === 'rectangle')">
        <rect
          class="presentation-shape"
          :x="Math.min(screenBox(overlay).x, screenBox(overlay).x + screenBox(overlay).width)"
          :y="Math.min(screenBox(overlay).y, screenBox(overlay).y + screenBox(overlay).height)"
          :width="Math.abs(screenBox(overlay).width)"
          :height="Math.abs(screenBox(overlay).height)"
          rx="6"
          @pointerdown="
            editing &&
              (emit('selectOverlay', overlay.id),
               beginDrag($event, {
                 kind: 'overlay',
                 id: overlay.id,
                 origin: { x: overlay.x, y: overlay.y },
                 pointer: fromEvent($event),
               }))
          "
        />
      </template>
      <ellipse
        v-else-if="overlay.shape === 'ellipse'"
        class="presentation-shape"
        :cx="screenBox(overlay).x + screenBox(overlay).width / 2"
        :cy="screenBox(overlay).y + screenBox(overlay).height / 2"
        :rx="Math.abs(screenBox(overlay).width) / 2"
        :ry="Math.abs(screenBox(overlay).height) / 2"
        @pointerdown="
          editing &&
            (emit('selectOverlay', overlay.id),
             beginDrag($event, {
               kind: 'overlay',
               id: overlay.id,
               origin: { x: overlay.x, y: overlay.y },
               pointer: fromEvent($event),
             }))
        "
      />
      <rect
        v-else-if="overlay.shape === 'text' && overlay.backing === 'none'"
        class="presentation-hit"
        :x="Math.min(screenBox(overlay).x, screenBox(overlay).x + screenBox(overlay).width)"
        :y="Math.min(screenBox(overlay).y, screenBox(overlay).y + screenBox(overlay).height)"
        :width="Math.abs(screenBox(overlay).width)"
        :height="Math.abs(screenBox(overlay).height)"
        @pointerdown="
          editing &&
            (emit('selectOverlay', overlay.id),
             beginDrag($event, {
               kind: 'overlay',
               id: overlay.id,
               origin: { x: overlay.x, y: overlay.y },
               pointer: fromEvent($event),
             }))
        "
      />
      <template v-else-if="overlay.shape === 'text' && overlay.backing === 'bubble'">
        <rect
          class="presentation-shape"
          :x="Math.min(screenBox(overlay).x, screenBox(overlay).x + screenBox(overlay).width)"
          :y="Math.min(screenBox(overlay).y, screenBox(overlay).y + screenBox(overlay).height)"
          :width="Math.abs(screenBox(overlay).width)"
          :height="Math.abs(screenBox(overlay).height)"
          rx="16"
          @pointerdown="
            editing &&
              (emit('selectOverlay', overlay.id),
               beginDrag($event, {
                 kind: 'overlay',
                 id: overlay.id,
                 origin: { x: overlay.x, y: overlay.y },
                 pointer: fromEvent($event),
               }))
          "
        />
        <polygon
          class="presentation-shape"
          :points="bubbleTail(overlay)"
        />
      </template>
      <path
        v-else-if="overlay.shape === 'arrow'"
        class="presentation-arrow"
        :d="arrowPath(overlay)"
        :marker-end="markerEnd(overlay)"
        :marker-start="markerStart(overlay)"
        @pointerdown="
          editing &&
            (emit('selectOverlay', overlay.id),
             beginDrag($event, {
               kind: 'overlay',
               id: overlay.id,
               origin: { x: overlay.x, y: overlay.y },
               pointer: fromEvent($event),
             }))
        "
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
      <circle
        v-if="editing && overlay.id === selectedOverlayId"
        class="presentation-handle"
        :cx="screenBox(overlay).x + screenBox(overlay).width"
        :cy="screenBox(overlay).y + screenBox(overlay).height"
        :r="handleRadius"
        @pointerdown="
          beginDrag($event, {
            kind: 'resize',
            id: overlay.id,
            origin: fromEvent($event),
            width: overlay.width,
            height: overlay.height,
          })
        "
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

.presentation-stage:not(.is-editing) .presentation-shape,
.presentation-stage:not(.is-editing) .presentation-arrow,
.presentation-stage:not(.is-editing) .presentation-hit {
  pointer-events: none;
}

.presentation-path,
.presentation-arrow,
.presentation-guide {
  fill: none;
  stroke: var(--accent);
  stroke-width: 2;
  pointer-events: none;
}

.presentation-guide {
  stroke-dasharray: 4 4;
  opacity: 0.7;
}

.presentation-shape,
.presentation-hit {
  fill: color-mix(in srgb, var(--surface) 88%, transparent);
  stroke: var(--accent);
  stroke-width: 2;
  pointer-events: auto;
}

.presentation-hit {
  fill: transparent;
  stroke: transparent;
}

.presentation-stage.is-editing .presentation-hit:hover,
.presentation-overlay.is-selected .presentation-hit {
  stroke: var(--accent);
}

.presentation-arrow {
  pointer-events: stroke;
  stroke-width: 2.5;
}

.presentation-arrow-head {
  fill: var(--accent);
}

.presentation-label {
  fill: var(--text);
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

.presentation-overlay.is-selected .presentation-shape,
.presentation-overlay.is-selected .presentation-arrow {
  stroke-width: 3;
}
</style>
