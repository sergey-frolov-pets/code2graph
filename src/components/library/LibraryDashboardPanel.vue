<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import type { DiagramListItemDto } from "@/constants/diagram-library";
import {
  downloadTextFile,
  dashboardEmbedDocument,
  dashboardLocalEmbedUrl,
  dashboardServerEmbedUrl,
  readDashboardEmbedHtml,
  writeDashboardEmbedHtml,
} from "@/services/dashboard/embed-url";
import { arrangeDashboardZones, placeDashboardZone, type DashboardArrange } from "@/services/dashboard/layout";
import { writeDashboardSvgCache } from "@/services/dashboard/cache";
import { composeDashboardSvg, loadDashboardDiagram, loadDashboardDiagramFresh } from "@/services/dashboard/compose";
import { refreshDashboardZoneSources } from "@/services/dashboard/refresh";
import {
  createDashboardCaption,
  dashboardContentFrame,
  emitDashboard,
  parseDashboard,
  parseRefreshInterval,
  renderDashboard,
  type DashboardModel,
  type DashboardZone,
} from "@/services/mermaid/ext/engines/dashboard";
import {
  createLibraryLink,
  fetchLibraryLinks,
} from "@/services/library/api/library-links";

const props = defineProps<{
  diagramId: string | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
const library = useDiagramLibrary();
const auth = useLibraryAuth();
const title = ref(t("library.dashboard.create"));
const savedId = ref<string | null>(props.diagramId);
const parseError = ref("");
const notice = ref("");
const missingFiles = ref<string[]>([]);
const embedCode = ref("");
const query = ref("");
const showSource = ref(false);
const gesture = ref<"move" | "resize">("move");
const zoom = ref(1);
const source = ref("dashboard\nsize 1280x720\n");
const model = ref<DashboardModel>({
  width: 1280,
  height: 720,
  refreshMs: null,
  title: createDashboardCaption(22, "#ffffff"),
  header: createDashboardCaption(16, "#f1f5f9"),
  footer: createDashboardCaption(13, "#f8fafc"),
  zones: [],
});
const previewSvg = ref("");
const stageRef = ref<HTMLElement | null>(null);
const boardRef = ref<HTMLElement | null>(null);
const stageSize = ref({ w: 640, h: 480 });

interface DragState {
  index: number;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: DashboardZone;
  boardW: number;
  boardH: number;
}

const dragging = ref<DragState | null>(null);
let stageObserver: ResizeObserver | null = null;

const refreshChoice = computed({
  get: () => (model.value.refreshMs === null ? "" : String(model.value.refreshMs)),
  set: (value: string) => {
    commitModel({ ...model.value, refreshMs: value ? Number(value) : null });
  },
});

const diagrams = computed(() =>
  library.diagrams.value.filter((diagram) => diagram.id !== savedId.value),
);

const visibleDiagrams = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return diagrams.value;
  return diagrams.value.filter((diagram) =>
    `${diagram.title} ${diagram.id}`.toLowerCase().includes(needle),
  );
});

const titleById = computed(() => {
  const titles = new Map<string, string>();
  for (const diagram of library.diagrams.value) titles.set(diagram.id, diagram.title);
  return titles;
});

const fit = computed(() => {
  const pad = 32;
  const scaleX = Math.max(1, stageSize.value.w - pad) / Math.max(1, model.value.width);
  const scaleY = Math.max(1, stageSize.value.h - pad) / Math.max(1, model.value.height);
  return Math.max(0.05, Math.min(scaleX, scaleY));
});

const boardStyle = computed(() => ({
  width: `${Math.max(1, Math.round(model.value.width * fit.value * zoom.value))}px`,
  height: `${Math.max(1, Math.round(model.value.height * fit.value * zoom.value))}px`,
}));

function zoneLabel(diagramId: string): string {
  return titleById.value.get(diagramId) ?? diagramId;
}

function commitModel(next: DashboardModel): void {
  model.value = next;
  source.value = emitDashboard(next);
  parseError.value = "";
  void paint();
}

function applySource(text: string): void {
  source.value = text;
  const parsed = parseDashboard(text);
  if (!parsed.ok || !parsed.value) {
    parseError.value = parsed.errors[0]?.message ?? t("library.dashboard.parseError");
    return;
  }
  parseError.value = "";
  model.value = parsed.value;
  void paint();
}

function toggleDiagram(diagram: DiagramListItemDto): void {
  const existing = model.value.zones.findIndex((zone) => zone.diagramId === diagram.id);
  const zones = [...model.value.zones];
  if (existing >= 0) zones.splice(existing, 1);
  else zones.push(placeDashboardZone(zones, diagram.id));
  commitModel({ ...model.value, zones });
}

function arrange(preset: DashboardArrange): void {
  const ids = model.value.zones.map((zone) => zone.diagramId);
  if (ids.length === 0) return;
  commitModel({ ...model.value, zones: arrangeDashboardZones(ids, preset) });
}

function clampZone(zone: DashboardZone): DashboardZone {
  const w = Math.min(1, Math.max(0.08, zone.w));
  const h = Math.min(1, Math.max(0.08, zone.h));
  return {
    ...zone,
    w,
    h,
    x: Math.min(Math.max(0, zone.x), 1 - w),
    y: Math.min(Math.max(0, zone.y), 1 - h),
  };
}

function updateZone(index: number, patch: Partial<DashboardZone>, paintNow: boolean): void {
  const zones = model.value.zones.map((zone, zoneIndex) =>
    zoneIndex === index ? clampZone({ ...zone, ...patch }) : zone,
  );
  model.value = { ...model.value, zones };
  if (!paintNow) return;
  source.value = emitDashboard(model.value);
  parseError.value = "";
  void paint();
}

async function paint(): Promise<void> {
  const composed = await composeDashboardSvg(source.value, {
    layout: "elk",
    diagramDarkMode: false,
    renderMode: "offline",
  }).catch(() => null);
  if (dragging.value) return;
  previewSvg.value = composed ?? renderDashboard(model.value);
}

function stopDragListeners(): void {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointercancel", onPointerUp);
}

function onPointerDown(event: PointerEvent, index: number, mode: "move" | "resize"): void {
  const bounds = boardRef.value?.getBoundingClientRect();
  const zone = model.value.zones[index];
  if (!bounds || !zone || bounds.width < 1 || bounds.height < 1) return;
  event.preventDefault();
  event.stopPropagation();
  dragging.value = {
    index,
    mode,
    startX: event.clientX,
    startY: event.clientY,
    origin: { ...zone },
    boardW: bounds.width,
    boardH: bounds.height,
  };
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
}

function onPointerMove(event: PointerEvent): void {
  const drag = dragging.value;
  if (!drag) return;
  const frame = dashboardContentFrame(model.value);
  const spanX = frame.width / Math.max(1, model.value.width);
  const spanY = frame.height / Math.max(1, model.value.height);
  const dx = (event.clientX - drag.startX) / drag.boardW / spanX;
  const dy = (event.clientY - drag.startY) / drag.boardH / spanY;
  const next = drag.mode === "move"
    ? { x: drag.origin.x + dx, y: drag.origin.y + dy }
    : { w: drag.origin.w + dx, h: drag.origin.h + dy };
  updateZone(drag.index, next, false);
}

function zoneStyle(zone: DashboardZone): Record<string, string> {
  const frame = dashboardContentFrame(model.value);
  const spanX = frame.width / Math.max(1, model.value.width);
  const spanY = frame.height / Math.max(1, model.value.height);
  return {
    left: `${(frame.left / model.value.width + zone.x * spanX) * 100}%`,
    top: `${(frame.top / model.value.height + zone.y * spanY) * 100}%`,
    width: `${zone.w * spanX * 100}%`,
    height: `${zone.h * spanY * 100}%`,
  };
}

function onPointerUp(): void {
  if (!dragging.value) return;
  dragging.value = null;
  stopDragListeners();
  source.value = emitDashboard(model.value);
  void paint();
}

function onZoneClick(diagramId: string): void {
  if (missingFiles.value.includes(diagramId)) void refreshNow();
}

function onWheel(event: WheelEvent): void {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const factor = event.deltaY > 0 ? 0.9 : 1.1;
  zoom.value = Math.min(4, Math.max(0.25, zoom.value * factor));
}

async function embedSrc(diagramId: string): Promise<string> {
  const origin = window.location.origin;
  if (library.isLocalMode.value) return dashboardLocalEmbedUrl(origin, diagramId);
  const baseUrl = getLibraryApiBaseUrl();
  const user = auth.currentUser.value?.username;
  if (!baseUrl || !user) return dashboardLocalEmbedUrl(origin, diagramId);
  const existing = await fetchLibraryLinks(diagramId, baseUrl).catch(() => ({ links: [] }));
  let slug = existing.links[0]?.slug;
  if (!slug) {
    slug = `dash-${diagramId.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, "") || "board"}`;
    const created = await createLibraryLink(
      diagramId,
      { slug, delivery: "editor", dataAccess: "online" },
      baseUrl,
    );
    slug = created.link.slug;
  }
  return dashboardServerEmbedUrl(origin, user, slug);
}

async function rememberEmbed(diagramId: string): Promise<string> {
  const src = await embedSrc(diagramId);
  const html = dashboardEmbedDocument(src, title.value);
  writeDashboardEmbedHtml(diagramId, html);
  embedCode.value = html;
  return html;
}

async function save(): Promise<void> {
  const payload = {
    title: title.value.trim() || "Dashboard",
    tags: ["dashboard"],
    language: "mermaid" as const,
    sectionId: library.selectedSectionId.value,
    source: source.value,
    fileName: "dashboard.mmd",
  };
  try {
    const saved = savedId.value
      ? await library.updateDiagram(savedId.value, payload)
      : await library.addDiagram({ ...payload, description: "" });
    savedId.value = saved.id;
    await rememberEmbed(saved.id);
    notice.value = t("library.dashboard.htmlSaved");
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : t("library.dashboard.parseError");
  }
}

async function saveHtml(): Promise<void> {
  if (!savedId.value) await save();
  if (!savedId.value) return;
  const html = embedCode.value || await rememberEmbed(savedId.value);
  const filename = `${(title.value.trim() || "dashboard").replace(/[^\w.-]+/g, "-")}.html`;
  downloadTextFile(filename, html, "text/html;charset=utf-8");
  notice.value = t("library.dashboard.htmlSaved");
}

async function copyHtml(): Promise<void> {
  if (!embedCode.value) return;
  await navigator.clipboard.writeText(embedCode.value).catch(() => undefined);
  notice.value = t("library.dashboard.copied");
}

async function refreshNow(): Promise<void> {
  const zones = [];
  for (const zone of model.value.zones) {
    const diagram = await loadDashboardDiagramFresh(zone.diagramId);
    if (diagram) zones.push(diagram);
  }
  const refreshed = await refreshDashboardZoneSources(
    zones.map((diagram) => ({
      id: diagram.id,
      source: diagram.source,
      fileName: diagram.fileName,
      language: diagram.language,
    })),
  );
  missingFiles.value = refreshed.missingDiagramIds;
  const composed = await composeDashboardSvg(
    source.value,
    { layout: "elk", diagramDarkMode: false, renderMode: "offline" },
    refreshed.sources,
  );
  if (composed) {
    previewSvg.value = composed;
    if (savedId.value) writeDashboardSvgCache(savedId.value, composed);
  }
}

function measureStage(): void {
  const rect = stageRef.value?.getBoundingClientRect();
  if (!rect) return;
  stageSize.value = { w: rect.width, h: rect.height };
}

onMounted(async () => {
  measureStage();
  if (stageRef.value && typeof ResizeObserver !== "undefined") {
    stageObserver = new ResizeObserver(() => measureStage());
    stageObserver.observe(stageRef.value);
  }
  if (props.diagramId) {
    embedCode.value = readDashboardEmbedHtml(props.diagramId);
    const diagram = await loadDashboardDiagram(props.diagramId);
    if (diagram) {
      title.value = diagram.title;
      applySource(diagram.source);
      return;
    }
  }
  void paint();
});

onUnmounted(() => {
  stopDragListeners();
  stageObserver?.disconnect();
});

watch(
  () => [model.value.width, model.value.height],
  () => {
    if (!dragging.value) source.value = emitDashboard(model.value);
  },
);
</script>

<template>
  <div
    class="dashboard-panel"
    role="dialog"
    aria-modal="true"
  >
    <header class="dashboard-panel__bar">
      <strong>{{ t("library.dashboard.edit") }}</strong>
      <button
        class="btn"
        type="button"
        @click="emit('close')"
      >
        {{ t("app.cancel") }}
      </button>
    </header>
    <div class="dashboard-panel__body">
      <div class="dashboard-panel__form">
        <label>
          {{ t("library.dashboard.title") }}
          <input
            v-model="title"
            class="select"
            type="text"
          >
        </label>
        <label>
          {{ t("library.dashboard.width") }}
          <input
            v-model.number="model.width"
            class="select"
            type="number"
            min="100"
            @change="commitModel({ ...model })"
          >
        </label>
        <fieldset class="band">
          <legend>{{ t("library.dashboard.heading") }}</legend>
          <input
            v-model="model.title.text"
            class="select"
            type="text"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.title.font"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.font')"
            @change="commitModel({ ...model })"
          >
          <input
            v-model.number="model.title.fontSize"
            class="select"
            type="number"
            min="8"
            max="96"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.title.color"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.color')"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.title.background"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.background')"
            @change="commitModel({ ...model })"
          >
          <label class="check">
            <input
              v-model="model.title.shadow"
              type="checkbox"
              @change="commitModel({ ...model })"
            >
            {{ t("library.dashboard.shadow") }}
          </label>
        </fieldset>
        <fieldset class="band">
          <legend>{{ t("library.dashboard.header") }}</legend>
          <input
            v-model="model.header.text"
            class="select"
            type="text"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.header.font"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.font')"
            @change="commitModel({ ...model })"
          >
          <input
            v-model.number="model.header.fontSize"
            class="select"
            type="number"
            min="8"
            max="96"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.header.color"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.color')"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.header.background"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.background')"
            @change="commitModel({ ...model })"
          >
          <label class="check">
            <input
              v-model="model.header.shadow"
              type="checkbox"
              @change="commitModel({ ...model })"
            >
            {{ t("library.dashboard.shadow") }}
          </label>
        </fieldset>
        <fieldset class="band">
          <legend>{{ t("library.dashboard.footer") }}</legend>
          <input
            v-model="model.footer.text"
            class="select"
            type="text"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.footer.font"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.font')"
            @change="commitModel({ ...model })"
          >
          <input
            v-model.number="model.footer.fontSize"
            class="select"
            type="number"
            min="8"
            max="96"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.footer.color"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.color')"
            @change="commitModel({ ...model })"
          >
          <input
            v-model="model.footer.background"
            class="select"
            type="text"
            :placeholder="t('library.dashboard.background')"
            @change="commitModel({ ...model })"
          >
          <label class="check">
            <input
              v-model="model.footer.shadow"
              type="checkbox"
              @change="commitModel({ ...model })"
            >
            {{ t("library.dashboard.shadow") }}
          </label>
        </fieldset>
        <label>
          {{ t("library.dashboard.height") }}
          <input
            v-model.number="model.height"
            class="select"
            type="number"
            min="100"
            @change="commitModel({ ...model })"
          >
        </label>
        <label>
          {{ t("library.dashboard.refresh") }}
          <select
            v-model="refreshChoice"
            class="select"
          >
            <option value="">
              {{ t("library.dashboard.refreshOff") }}
            </option>
            <option :value="String(parseRefreshInterval('30s'))">
              30s
            </option>
            <option :value="String(parseRefreshInterval('5m'))">
              5m
            </option>
            <option :value="String(parseRefreshInterval('1h'))">
              1h
            </option>
          </select>
        </label>

        <label>
          {{ t("library.dashboard.search") }}
          <input
            v-model="query"
            class="select"
            type="search"
          >
        </label>
        <ul class="dashboard-panel__list">
          <li
            v-for="diagram in visibleDiagrams"
            :key="diagram.id"
          >
            <label>
              <input
                type="checkbox"
                :checked="model.zones.some((zone) => zone.diagramId === diagram.id)"
                @change="toggleDiagram(diagram)"
              >
              {{ diagram.title }}
            </label>
          </li>
        </ul>
        <div class="dashboard-panel__actions">
          <span>{{ t("library.dashboard.arrange") }}</span>
          <button
            class="btn"
            type="button"
            @click="arrange('columns')"
          >
            {{ t("library.dashboard.presetColumns") }}
          </button>
          <button
            class="btn"
            type="button"
            @click="arrange('rows')"
          >
            {{ t("library.dashboard.presetRows") }}
          </button>
          <button
            class="btn"
            type="button"
            @click="arrange('grid')"
          >
            {{ t("library.dashboard.presetGrid") }}
          </button>
        </div>

        <label
          v-for="(zone, index) in model.zones"
          :key="`${zone.diagramId}-${index}`"
          class="dashboard-zone-fields"
        >
          <span>{{ zoneLabel(zone.diagramId) }}</span>
          <input
            class="select"
            type="number"
            min="0"
            max="1"
            step="0.01"
            :value="zone.x"
            @change="updateZone(index, { x: Number(($event.target as HTMLInputElement).value) }, true)"
          >
          <input
            class="select"
            type="number"
            min="0"
            max="1"
            step="0.01"
            :value="zone.y"
            @change="updateZone(index, { y: Number(($event.target as HTMLInputElement).value) }, true)"
          >
          <input
            class="select"
            type="number"
            min="0.08"
            max="1"
            step="0.01"
            :value="zone.w"
            @change="updateZone(index, { w: Number(($event.target as HTMLInputElement).value) }, true)"
          >
          <input
            class="select"
            type="number"
            min="0.08"
            max="1"
            step="0.01"
            :value="zone.h"
            @change="updateZone(index, { h: Number(($event.target as HTMLInputElement).value) }, true)"
          >
        </label>

        <button
          class="btn"
          type="button"
          @click="showSource = !showSource"
        >
          {{ t("library.dashboard.sourceToggle") }}
        </button>
        <label v-if="showSource">
          {{ t("library.dashboard.source") }}
          <textarea
            class="select"
            rows="8"
            :value="source"
            @input="applySource(($event.target as HTMLTextAreaElement).value)"
          />
        </label>
        <p
          v-if="parseError"
          class="dashboard-panel__error"
        >
          {{ parseError }}
        </p>

        <div class="dashboard-panel__actions">
          <button
            class="btn"
            type="button"
            @click="save"
          >
            {{ t("library.dashboard.save") }}
          </button>
          <button
            class="btn"
            type="button"
            @click="saveHtml"
          >
            {{ t("library.dashboard.saveHtml") }}
          </button>
          <button
            class="btn"
            type="button"
            @click="refreshNow"
          >
            {{ t("library.dashboard.refreshNow") }}
          </button>
        </div>
        <p v-if="missingFiles.length">
          {{ t("library.dashboard.missingFiles") }}: {{ missingFiles.join(", ") }}
        </p>
        <p v-if="notice">
          {{ notice }}
        </p>
        <label v-if="embedCode">
          {{ t("library.dashboard.embed") }}
          <textarea
            class="select"
            rows="8"
            readonly
            :value="embedCode"
          />
          <button
            class="btn"
            type="button"
            @click="copyHtml"
          >
            {{ t("library.dashboard.copyHtml") }}
          </button>
        </label>
      </div>

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
          <button
            class="btn"
            type="button"
            :aria-pressed="gesture === 'move'"
            @click="gesture = 'move'"
          >
            {{ t("library.dashboard.move") }}
          </button>
          <button
            class="btn"
            type="button"
            :aria-pressed="gesture === 'resize'"
            @click="gesture = 'resize'"
          >
            {{ t("library.dashboard.resize") }}
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
            <!-- eslint-disable vue/no-v-html -->
            <div
              class="dashboard-board__svg"
              v-html="previewSvg"
            />
            <!-- eslint-enable vue/no-v-html -->
            <button
              v-for="(zone, index) in model.zones"
              :key="`${zone.diagramId}-hit-${index}`"
              class="dashboard-hit"
              :class="{ 'is-dragging': dragging?.index === index }"
              type="button"
              :style="zoneStyle(zone)"
              @pointerdown="onPointerDown($event, index, gesture)"
              @click="onZoneClick(zone.diagramId)"
            >
              <span class="dashboard-hit__label">{{ zoneLabel(zone.diagramId) }}</span>
              <span
                class="dashboard-hit__resize"
                @pointerdown.stop="onPointerDown($event, index, 'resize')"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-panel {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg, #fff);
}
.dashboard-panel__bar,
.dashboard-panel__actions,
.dashboard-zone-fields {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.dashboard-panel__body {
  display: grid;
  grid-template-columns: minmax(240px, 340px) minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
  flex: 1;
}
.dashboard-panel__form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}
.dashboard-panel__form label,
.dashboard-panel__list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.band {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 8px;
  border: 1px solid var(--border, #d0d7de);
}
.band .check {
  flex-direction: row;
  align-items: center;
}
.dashboard-panel__list {
  max-height: 220px;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dashboard-stage-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  gap: 8px;
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
.dashboard-hit {
  position: absolute;
  border: 1px solid rgba(15, 118, 110, 0.85);
  background: rgba(15, 118, 110, 0.12);
  padding: 4px;
  text-align: left;
  cursor: grab;
  touch-action: none;
  color: #0f172a;
}
.dashboard-hit.is-dragging {
  cursor: grabbing;
}
.dashboard-hit__label {
  display: block;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
  pointer-events: none;
}
.dashboard-hit__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 28px;
  height: 28px;
  background: #0f766e;
  cursor: nwse-resize;
  touch-action: none;
}
@media (pointer: coarse) {
  .dashboard-hit__resize {
    width: 48px;
    height: 48px;
  }
}
@media (max-width: 800px) {
  .dashboard-panel {
    overflow: auto;
    padding:
      max(8px, env(safe-area-inset-top))
      8px
      max(8px, env(safe-area-inset-bottom));
  }
  .dashboard-panel__bar {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--bg, #fff);
  }
  .dashboard-panel__body {
    display: flex;
    flex-direction: column;
    overflow: visible;
  }
  .dashboard-stage-wrap {
    order: -1;
  }
  .dashboard-stage {
    height: 58dvh;
    flex: none;
  }
  .dashboard-panel__form {
    overflow: visible;
  }
}
.dashboard-panel__error {
  color: #b91c1c;
}
</style>
