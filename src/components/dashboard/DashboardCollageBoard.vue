<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import {
  dashboardCaptionBand,
  dashboardCellRect,
  dashboardContentFrame,
  type DashboardModel,
} from "@/services/mermaid/ext/engines/dashboard";
import { moveDashboardDivider, type DashboardDivider } from "@/services/dashboard/layout";

const props = defineProps<{
  model: DashboardModel;
  mode: "collage" | "bind" | "preview";
  previewSvg: string;
  cellLabel: (col: number, row: number) => string;
  selectedCell: { col: number; row: number } | null;
  selectedDivider: DashboardDivider | null;
}>();

const emit = defineEmits<{
  "select-cell": [cell: { col: number; row: number } | null];
  "select-divider": [divider: DashboardDivider | null];
  tracks: [patch: { cols?: number[]; rows?: number[] }];
}>();

const { t } = useLocale();
const zoom = ref(1);
const stageRef = ref<HTMLElement | null>(null);
const boardRef = ref<HTMLElement | null>(null);
const stageSize = ref({ w: 640, h: 480 });
let stageObserver: ResizeObserver | null = null;

interface DragState {
  axis: "col" | "row";
  index: number;
  startX: number;
  startY: number;
  origin: number[];
  boardW: number;
  boardH: number;
}

const dragging = ref<DragState | null>(null);

const fit = computed(() => {
  const pad = 32;
  const scaleX = Math.max(1, stageSize.value.w - pad) / Math.max(1, props.model.width);
  const scaleY = Math.max(1, stageSize.value.h - pad) / Math.max(1, props.model.height);
  return Math.max(0.05, Math.min(scaleX, scaleY));
});

const boardStyle = computed(() => ({
  width: `${Math.max(1, Math.round(props.model.width * fit.value * zoom.value))}px`,
  height: `${Math.max(1, Math.round(props.model.height * fit.value * zoom.value))}px`,
}));

const frame = computed(() => dashboardContentFrame(props.model));

function percentBox(x: number, y: number, w: number, h: number): Record<string, string> {
  return {
    left: `${(x / props.model.width) * 100}%`,
    top: `${(y / props.model.height) * 100}%`,
    width: `${(w / props.model.width) * 100}%`,
    height: `${(h / props.model.height) * 100}%`,
  };
}

function bandStyle(top: number, height: number): Record<string, string> {
  return percentBox(0, top, props.model.width, height);
}

const titleStyle = computed(() => bandStyle(0, dashboardCaptionBand(props.model.title)));
const headerStyle = computed(() => bandStyle(
  dashboardCaptionBand(props.model.title),
  dashboardCaptionBand(props.model.header),
));
const footerStyle = computed(() => {
  const height = dashboardCaptionBand(props.model.footer);
  return bandStyle(props.model.height - height, height);
});

function cellStyle(col: number, row: number): Record<string, string> {
  const rect = dashboardCellRect(props.model, col, row);
  return percentBox(rect.x, rect.y, rect.w, rect.h);
}

function dividerStyle(axis: "col" | "row", index: number): Record<string, string> {
  const box = frame.value;
  if (axis === "col") {
    const x = box.left + props.model.cols.slice(0, index + 1).reduce((sum, value) => sum + value, 0) * box.width;
    return {
      left: `calc(${(x / props.model.width) * 100}% - 6px)`,
      top: `${(box.top / props.model.height) * 100}%`,
      width: "12px",
      height: `${(box.height / props.model.height) * 100}%`,
    };
  }
  const y = box.top + props.model.rows.slice(0, index + 1).reduce((sum, value) => sum + value, 0) * box.height;
  return {
    left: `${(box.left / props.model.width) * 100}%`,
    top: `calc(${(y / props.model.height) * 100}% - 6px)`,
    width: `${(box.width / props.model.width) * 100}%`,
    height: "12px",
  };
}

function alignClass(axis: "x" | "y", value: string): string {
  return `is-${axis}-${value}`;
}

function isSelectedCell(col: number, row: number): boolean {
  return props.selectedCell?.col === col && props.selectedCell?.row === row;
}

function onCell(col: number, row: number): void {
  if (props.mode === "preview") return;
  emit("select-divider", null);
  if (props.mode === "collage" && isSelectedCell(col, row)) {
    emit("select-cell", null);
    return;
  }
  emit("select-cell", { col, row });
}

function stopDragListeners(): void {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
}

function onDividerDown(event: PointerEvent, axis: "col" | "row", index: number): void {
  if (props.mode !== "collage") return;
  const bounds = boardRef.value?.getBoundingClientRect();
  if (!bounds || bounds.width < 1 || bounds.height < 1) return;
  event.preventDefault();
  event.stopPropagation();
  dragging.value = {
    axis,
    index,
    startX: event.clientX,
    startY: event.clientY,
    origin: [...(axis === "col" ? props.model.cols : props.model.rows)],
    boardW: bounds.width,
    boardH: bounds.height,
  };
  emit("select-cell", null);
  emit("select-divider", { axis, index });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event: PointerEvent): void {
  const drag = dragging.value;
  if (!drag) return;
  const box = dashboardContentFrame(props.model);
  const span = drag.axis === "col" ? box.width / props.model.width : box.height / props.model.height;
  const deltaPx = drag.axis === "col" ? event.clientX - drag.startX : event.clientY - drag.startY;
  const board = drag.axis === "col" ? drag.boardW : drag.boardH;
  const before = drag.origin.slice(0, drag.index).reduce((sum, value) => sum + value, 0);
  const nextStart = before + drag.origin[drag.index] + deltaPx / board / Math.max(span, 0.0001);
  const next = moveDashboardDivider(drag.origin, drag.index, nextStart);
  emit("tracks", drag.axis === "col" ? { cols: next } : { rows: next });
}

function onPointerUp(): void {
  dragging.value = null;
  stopDragListeners();
}

function onWheel(event: WheelEvent): void {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const factor = event.deltaY > 0 ? 0.9 : 1.1;
  zoom.value = Math.min(4, Math.max(0.25, zoom.value * factor));
}

function measureStage(): void {
  const rect = stageRef.value?.getBoundingClientRect();
  if (!rect) return;
  stageSize.value = { w: rect.width, h: rect.height };
}

onMounted(() => {
  measureStage();
  if (stageRef.value && typeof ResizeObserver !== "undefined") {
    stageObserver = new ResizeObserver(() => measureStage());
    stageObserver.observe(stageRef.value);
  }
});

onUnmounted(() => {
  stopDragListeners();
  stageObserver?.disconnect();
});
</script>

<template>
  <div class="dashboard-stage-wrap">
    <div class="dashboard-panel__actions">
      <label>
        {{ t("library.dashboard.zoom") }}
        <input
          v-model.number="zoom"
          type="range"
          min="0.25"
          max="4"
          step="0.05"
        >
      </label>
      <button
        class="btn"
        type="button"
        @click="zoom = 1"
      >
        {{ t("library.dashboard.fit") }}
      </button>
    </div>
    <div
      ref="stageRef"
      class="dashboard-stage"
      @wheel="onWheel"
    >
      <div
        ref="boardRef"
        class="dashboard-board"
        :style="boardStyle"
      >
        <template v-if="mode === 'preview'">
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="dashboard-board__svg"
            v-html="previewSvg"
          />
          <!-- eslint-enable vue/no-v-html -->
        </template>
        <template v-else>
          <div
            v-if="model.title.text.trim()"
            class="dashboard-band is-x-center is-y-middle"
            :style="{ ...titleStyle, color: model.title.color || undefined, background: model.title.background || undefined, fontFamily: model.title.font, fontSize: `${model.title.fontSize}px` }"
          >
            {{ model.title.text }}
          </div>
          <div
            v-if="model.header.text.trim()"
            class="dashboard-band"
            :class="[alignClass('x', model.header.alignX), alignClass('y', model.header.alignY === 'baseline' ? 'top' : model.header.alignY)]"
            :style="{ ...headerStyle, color: model.header.color || undefined, background: model.header.background || undefined, fontFamily: model.header.font, fontSize: `${model.header.fontSize}px` }"
          >
            {{ model.header.text }}
          </div>
          <template
            v-for="row in model.rows.length"
            :key="`r-${row}`"
          >
            <button
              v-for="col in model.cols.length"
              :key="`${col - 1}-${row - 1}`"
              class="dashboard-cell"
              :class="{ 'is-selected': isSelectedCell(col - 1, row - 1), 'is-bind': mode === 'bind' }"
              type="button"
              :style="cellStyle(col - 1, row - 1)"
              @click="onCell(col - 1, row - 1)"
            >
              <span>{{ cellLabel(col - 1, row - 1) || t("library.dashboard.cellEmpty") }}</span>
            </button>
          </template>
          <button
            v-for="index in model.cols.length - 1"
            :key="`v-${index}`"
            class="dashboard-line is-vertical"
            :class="{ 'is-selected': selectedDivider?.axis === 'col' && selectedDivider.index === index - 1, 'is-idle': mode !== 'collage' }"
            type="button"
            :style="dividerStyle('col', index - 1)"
            :aria-label="t('library.dashboard.addVertical')"
            @pointerdown="onDividerDown($event, 'col', index - 1)"
          />
          <button
            v-for="index in model.rows.length - 1"
            :key="`h-${index}`"
            class="dashboard-line is-horizontal"
            :class="{ 'is-selected': selectedDivider?.axis === 'row' && selectedDivider.index === index - 1, 'is-idle': mode !== 'collage' }"
            type="button"
            :style="dividerStyle('row', index - 1)"
            :aria-label="t('library.dashboard.addHorizontal')"
            @pointerdown="onDividerDown($event, 'row', index - 1)"
          />
          <div
            v-if="model.footer.text.trim()"
            class="dashboard-band"
            :class="[alignClass('x', model.footer.alignX), alignClass('y', model.footer.alignY === 'baseline' ? 'top' : model.footer.alignY)]"
            :style="{ ...footerStyle, color: model.footer.color || undefined, background: model.footer.background || undefined, fontFamily: model.footer.font, fontSize: `${model.footer.fontSize}px` }"
          >
            {{ model.footer.text }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-stage-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 8px;
}
.dashboard-panel__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.dashboard-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: grid;
  place-items: center;
  background:
    linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
  background-color: #f8fafc;
  border: 1px solid var(--border, #cbd5e1);
}
.dashboard-board {
  position: relative;
  flex: none;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}
.dashboard-board__svg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.dashboard-board__svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
.dashboard-band,
.dashboard-cell,
.dashboard-line {
  position: absolute;
  box-sizing: border-box;
}
.dashboard-band {
  display: flex;
  padding: 0 12px;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}
.dashboard-band.is-x-start { justify-content: flex-start; }
.dashboard-band.is-x-center { justify-content: center; }
.dashboard-band.is-x-end { justify-content: flex-end; }
.dashboard-band.is-y-top { align-items: flex-start; }
.dashboard-band.is-y-middle { align-items: center; }
.dashboard-band.is-y-bottom { align-items: flex-end; }
.dashboard-cell {
  z-index: 2;
  border: 1px solid rgba(15, 118, 110, 0.85);
  background: rgba(15, 118, 110, 0.08);
  color: #0f172a;
  text-align: left;
  padding: 6px;
  cursor: pointer;
}
.dashboard-cell.is-bind { cursor: copy; }
.dashboard-cell.is-selected { background: rgba(15, 118, 110, 0.28); }
.dashboard-cell span {
  display: block;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
}
.dashboard-line {
  z-index: 3;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: grab;
  touch-action: none;
}
.dashboard-line::after {
  content: "";
  position: absolute;
  background: #0f766e;
}
.dashboard-line.is-vertical::after {
  top: 0;
  bottom: 0;
  left: 5px;
  width: 2px;
}
.dashboard-line.is-horizontal::after {
  left: 0;
  right: 0;
  top: 5px;
  height: 2px;
}
.dashboard-line.is-selected::after { background: #b45309; width: 3px; }
.dashboard-line.is-horizontal.is-selected::after { height: 3px; width: auto; }
.dashboard-line.is-idle { cursor: default; pointer-events: none; }
@media (max-width: 800px) {
  .dashboard-stage-wrap { order: -1; }
  .dashboard-stage { height: 58dvh; flex: none; }
}
</style>
