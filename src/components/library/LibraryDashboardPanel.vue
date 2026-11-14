<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import {
  emitDashboard,
  parseDashboard,
  parseRefreshInterval,
  renderDashboard,
  type DashboardModel,
  type DashboardZone,
} from "@/services/mermaid/ext/engines/dashboard";
import { placeDashboardZone } from "@/services/dashboard/layout";
import { composeDashboardSvg, loadDashboardDiagram } from "@/services/dashboard/compose";
import { refreshDashboardZoneSources } from "@/services/dashboard/refresh";
import { writeDashboardSvgCache } from "@/services/dashboard/cache";
import {
  dashboardEmbedSnippet,
  dashboardLocalEmbedUrl,
  dashboardServerEmbedUrl,
} from "@/services/dashboard/embed-url";
import {
  createLibraryLink,
  fetchLibraryLinks,
} from "@/services/library/api/library-links";
import type { DiagramListItemDto } from "@/constants/diagram-library";

const props = defineProps<{
  diagramId: string | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
const library = useDiagramLibrary();
const auth = useLibraryAuth();
const step = ref<1 | 2 | 3>(1);
const title = ref(t("library.dashboard.create"));
const savedId = ref<string | null>(props.diagramId);
const parseError = ref("");
const notice = ref("");
const missingFiles = ref<string[]>([]);
const embedCode = ref("");
const source = ref("dashboard\nsize 1280x720\n");
const model = ref<DashboardModel>({
  width: 1280,
  height: 720,
  refreshMs: null,
  zones: [],
});
const previewSvg = ref("");
const dragging = ref<{ index: number; mode: "move" | "resize"; dx: number; dy: number } | null>(null);

const refreshChoice = computed({
  get: () => (model.value.refreshMs === null ? "" : String(model.value.refreshMs)),
  set: (value: string) => {
    model.value = {
      ...model.value,
      refreshMs: value ? Number(value) : null,
    };
    syncSource();
  },
});

const diagrams = computed(() =>
  library.diagrams.value.filter((diagram) => diagram.id !== savedId.value),
);

function syncSource(): void {
  source.value = emitDashboard(model.value);
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
  model.value = { ...model.value, zones };
  syncSource();
}

function updateZone(index: number, patch: Partial<DashboardZone>): void {
  const zones = model.value.zones.map((zone, zoneIndex) =>
    zoneIndex === index ? { ...zone, ...patch } : zone,
  );
  const zone = zones[index];
  zone.w = Math.min(1 - zone.x, Math.max(0.05, zone.w));
  zone.h = Math.min(1 - zone.y, Math.max(0.05, zone.h));
  zone.x = Math.min(Math.max(0, zone.x), 1 - zone.w);
  zone.y = Math.min(Math.max(0, zone.y), 1 - zone.h);
  model.value = { ...model.value, zones };
  syncSource();
}

async function paint(): Promise<void> {
  const composed = await composeDashboardSvg(source.value, {
    layout: "elk",
    diagramDarkMode: false,
    renderMode: "offline",
  }).catch(() => null);
  previewSvg.value = composed ?? renderDashboard(model.value);
}

function onPointerDown(event: PointerEvent, index: number, mode: "move" | "resize"): void {
  const bounds = (event.currentTarget as HTMLElement).closest(".dashboard-board")?.getBoundingClientRect();
  if (!bounds) return;
  dragging.value = { index, mode, dx: bounds.width, dy: bounds.height };
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent): void {
  const drag = dragging.value;
  if (!drag) return;
  const zone = model.value.zones[drag.index];
  if (!zone) return;
  const dx = event.movementX / drag.dx;
  const dy = event.movementY / drag.dy;
  if (drag.mode === "move") {
    updateZone(drag.index, { x: zone.x + dx, y: zone.y + dy });
  } else {
    updateZone(drag.index, { w: zone.w + dx, h: zone.h + dy });
  }
}

function onPointerUp(): void {
  dragging.value = null;
}

function onZoneClick(diagramId: string): void {
  if (missingFiles.value.includes(diagramId)) void refreshNow();
}

async function save(): Promise<void> {
  const payload = {
    title: title.value.trim() || "Dashboard",
    description: "",
    tags: ["dashboard"],
    language: "mermaid" as const,
    sectionId: library.selectedSectionId.value,
    source: source.value,
    fileName: "dashboard.mmd",
  };
  try {
    const saved = savedId.value
      ? await library.updateDiagram(savedId.value, payload)
      : await library.addDiagram(payload);
    savedId.value = saved.id;
    notice.value = t("library.dashboard.copied");
    await copyEmbed(saved.id);
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : t("library.dashboard.parseError");
  }
}

async function copyEmbed(diagramId: string): Promise<void> {
  const origin = window.location.origin;
  let src = dashboardLocalEmbedUrl(origin, diagramId);
  if (!library.isLocalMode.value) {
    const baseUrl = getLibraryApiBaseUrl();
    const user = auth.currentUser.value?.username;
    if (baseUrl && user) {
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
      src = dashboardServerEmbedUrl(origin, user, slug);
    }
  }
  embedCode.value = dashboardEmbedSnippet(src);
  await navigator.clipboard.writeText(embedCode.value).catch(() => undefined);
}

async function refreshNow(): Promise<void> {
  const zones = [];
  for (const zone of model.value.zones) {
    const diagram = await loadDashboardDiagram(zone.diagramId);
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

onMounted(async () => {
  if (!props.diagramId) {
    void paint();
    return;
  }
  const diagram = await loadDashboardDiagram(props.diagramId);
  if (!diagram) return;
  title.value = diagram.title;
  applySource(diagram.source);
});

watch(
  () => [model.value.width, model.value.height],
  () => {
    void paint();
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
    <div class="dashboard-panel__steps">
      <button
        class="btn"
        type="button"
        :aria-current="step === 1"
        @click="step = 1"
      >
        1. {{ t("library.dashboard.stepCanvas") }}
      </button>
      <button
        class="btn"
        type="button"
        :aria-current="step === 2"
        @click="step = 2"
      >
        2. {{ t("library.dashboard.stepDiagrams") }}
      </button>
      <button
        class="btn"
        type="button"
        :aria-current="step === 3"
        @click="step = 3"
      >
        3. {{ t("library.dashboard.stepLayout") }}
      </button>
    </div>
    <div class="dashboard-panel__body">
      <div class="dashboard-panel__form">
        <label v-if="step === 1">
          {{ t("library.dashboard.title") }}
          <input
            v-model="title"
            class="select"
            type="text"
          >
        </label>
        <label v-if="step === 1">
          {{ t("library.dashboard.width") }}
          <input
            v-model.number="model.width"
            class="select"
            type="number"
            min="100"
            @change="syncSource"
          >
        </label>
        <label v-if="step === 1">
          {{ t("library.dashboard.height") }}
          <input
            v-model.number="model.height"
            class="select"
            type="number"
            min="100"
            @change="syncSource"
          >
        </label>
        <label v-if="step === 1">
          {{ t("library.dashboard.refresh") }}
          <select
            v-model="refreshChoice"
            class="select"
          >
            <option value="">{{ t("library.dashboard.refreshOff") }}</option>
            <option :value="String(parseRefreshInterval('30s'))">30s</option>
            <option :value="String(parseRefreshInterval('5m'))">5m</option>
            <option :value="String(parseRefreshInterval('1h'))">1h</option>
          </select>
        </label>

        <ul
          v-if="step === 2"
          class="dashboard-panel__list"
        >
          <li
            v-for="diagram in diagrams"
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

        <div v-if="step === 3">
          <label
            v-for="(zone, index) in model.zones"
            :key="`${zone.diagramId}-${index}`"
            class="dashboard-zone-fields"
          >
            <span>{{ zone.diagramId }}</span>
            <input
              class="select"
              type="number"
              min="0"
              max="1"
              step="0.01"
              :value="zone.x"
              @change="updateZone(index, { x: Number(($event.target as HTMLInputElement).value) })"
            >
            <input
              class="select"
              type="number"
              min="0"
              max="1"
              step="0.01"
              :value="zone.y"
              @change="updateZone(index, { y: Number(($event.target as HTMLInputElement).value) })"
            >
            <input
              class="select"
              type="number"
              min="0.05"
              max="1"
              step="0.01"
              :value="zone.w"
              @change="updateZone(index, { w: Number(($event.target as HTMLInputElement).value) })"
            >
            <input
              class="select"
              type="number"
              min="0.05"
              max="1"
              step="0.01"
              :value="zone.h"
              @change="updateZone(index, { h: Number(($event.target as HTMLInputElement).value) })"
            >
          </label>
          <label>
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
        </div>

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
            rows="3"
            readonly
            :value="embedCode"
          />
        </label>
      </div>

      <div
        class="dashboard-board"
        :style="{ aspectRatio: `${model.width} / ${model.height}` }"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
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
          type="button"
          :style="{
            left: `${zone.x * 100}%`,
            top: `${zone.y * 100}%`,
            width: `${zone.w * 100}%`,
            height: `${zone.h * 100}%`,
          }"
          @pointerdown="onPointerDown($event, index, 'move')"
          @click="onZoneClick(zone.diagramId)"
        >
          <span
            class="dashboard-hit__resize"
            @pointerdown.stop="onPointerDown($event, index, 'resize')"
          />
        </button>
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
.dashboard-panel__steps,
.dashboard-panel__actions,
.dashboard-zone-fields {
  display: flex;
  gap: 8px;
  align-items: center;
}
.dashboard-panel__body {
  display: grid;
  grid-template-columns: minmax(240px, 360px) 1fr;
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
.dashboard-board {
  position: relative;
  width: 100%;
  background: var(--surface, #f8fafc);
  border: 1px solid var(--border, #cbd5e1);
}
.dashboard-board__svg :deep(svg) {
  width: 100%;
  height: 100%;
}
.dashboard-hit {
  position: absolute;
  border: 1px dashed transparent;
  background: transparent;
  padding: 0;
}
.dashboard-hit:hover {
  border-color: #2563eb;
}
.dashboard-hit__resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  background: #2563eb;
}
.dashboard-panel__error {
  color: #b91c1c;
}
</style>
