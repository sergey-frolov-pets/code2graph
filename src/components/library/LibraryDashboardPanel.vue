<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import DashboardCollageBoard from "@/components/dashboard/DashboardCollageBoard.vue";
import { useAppShellContext } from "@/composables/useAppShell";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import {
  downloadTextFile,
  dashboardEmbedDocument,
  dashboardLocalEmbedUrl,
  dashboardServerEmbedUrl,
  readDashboardEmbedHtml,
  writeDashboardEmbedHtml,
} from "@/services/dashboard/embed-url";
import {
  bindDashboardCell,
  clearDashboardCell,
  insertDashboardLine,
  removeDashboardLine,
  type DashboardDivider,
} from "@/services/dashboard/layout";
import { writeDashboardSvgCache } from "@/services/dashboard/cache";
import { composeDashboardSvg, loadDashboardDiagram, loadDashboardDiagramFresh } from "@/services/dashboard/compose";
import { refreshDashboardZoneSources } from "@/services/dashboard/refresh";
import {
  createDashboardBand,
  createDashboardCaption,
  emitDashboard,
  formatRefreshInterval,
  parseDashboard,
  parseRefreshInterval,
  renderDashboard,
  type DashboardAlignX,
  type DashboardAlignY,
  type DashboardBand,
  type DashboardCaption,
  type DashboardModel,
} from "@/services/mermaid/ext/engines/dashboard";
import {
  createLibraryLink,
  fetchLibraryLinks,
  type LibraryLinkDto,
} from "@/services/library/api/library-links";
import type { FormatContext } from "@/formats/types";

const props = defineProps<{
  diagramId: string | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t, locale } = useLocale();
const shell = useAppShellContext();
const library = useDiagramLibrary();
const auth = useLibraryAuth();
const title = ref(t("library.dashboard.create"));
const savedId = ref<string | null>(props.diagramId);
const parseError = ref("");
const notice = ref("");
const missingFiles = ref<string[]>([]);
const embedCode = ref("");
const query = ref("");
const step = ref<"collage" | "bind" | "preview">("collage");
const previewSvg = ref("");
const previewBusy = ref(false);
const selectedCell = ref<{ col: number; row: number } | null>(null);
const selectedDivider = ref<DashboardDivider | null>(null);
const customRefresh = ref("30s");
const source = ref("dashboard\nsize 1280x720\ncols 1\nrows 1\n");
const model = ref<DashboardModel>({
  width: 1280,
  height: 720,
  refreshMs: null,
  title: createDashboardCaption(22, "#ffffff"),
  header: createDashboardBand(16, "#f1f5f9"),
  footer: createDashboardBand(13, "#f8fafc"),
  cols: [1],
  rows: [1],
  cells: [],
});

interface BoardPick {
  kind: "diagram" | "link";
  ref: string;
  title: string;
}

const picked = ref<BoardPick | null>(null);
const linkRows = ref<BoardPick[]>([]);
let previewSerial = 0;

const refreshPresets = ["30000", "300000", "3600000"];

const refreshChoice = computed({
  get: () => {
    if (model.value.refreshMs === null) return "";
    const value = String(model.value.refreshMs);
    return refreshPresets.includes(value) ? value : "custom";
  },
  set: (value: string) => {
    if (value === "custom") {
      customRefresh.value = formatRefreshInterval(model.value.refreshMs ?? 30_000);
      if (model.value.refreshMs === null || refreshPresets.includes(String(model.value.refreshMs))) {
        const parsed = parseRefreshInterval(customRefresh.value);
        if (parsed) commitModel({ ...model.value, refreshMs: parsed });
      }
      return;
    }
    commitModel({ ...model.value, refreshMs: value ? Number(value) : null });
  },
});

const diagrams = computed(() =>
  library.diagrams.value.filter((diagram) => diagram.id !== savedId.value),
);

const visibleDiagrams = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return diagrams.value.filter((diagram) =>
    !needle || `${diagram.title} ${diagram.id}`.toLowerCase().includes(needle),
  );
});

const visibleLinks = computed(() => {
  const needle = query.value.trim().toLowerCase();
  return linkRows.value.filter((link) =>
    !needle || `${link.title} ${link.ref}`.toLowerCase().includes(needle),
  );
});

const titleById = computed(() => {
  const titles = new Map<string, string>();
  for (const diagram of library.diagrams.value) titles.set(diagram.id, diagram.title);
  return titles;
});

const linkTitleByRef = computed(() => {
  const titles = new Map<string, string>();
  for (const link of linkRows.value) titles.set(link.ref, link.title);
  return titles;
});

function viewContext(): FormatContext {
  return {
    layout: shell.layout.value,
    diagramDarkMode: shell.diagramDarkMode.value,
    renderMode: shell.renderMode.value,
    diagramBackground: shell.previewBackground.value,
    diagramTextColor: shell.diagramTextColor.value,
    diagramFontFamily: shell.diagramFontFamily.value,
    diagramFontWeight: shell.diagramFontWeight.value,
    diagramFontStyle: shell.diagramFontStyle.value,
    locale: locale.value,
  };
}

function commitModel(next: DashboardModel): void {
  model.value = next;
  source.value = emitDashboard(next);
  parseError.value = "";
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
  if (parsed.value.refreshMs !== null && !refreshPresets.includes(String(parsed.value.refreshMs))) {
    customRefresh.value = formatRefreshInterval(parsed.value.refreshMs);
  }
}

function setCaption(key: "title" | "header" | "footer", patch: Partial<DashboardCaption>): void {
  if (key === "title") {
    commitModel({ ...model.value, title: { ...model.value.title, ...patch } });
    return;
  }
  const current = model.value[key];
  const next: DashboardBand = {
    ...current,
    ...patch,
    alignY: current.alignY === "baseline" ? "middle" : current.alignY,
  };
  commitModel({ ...model.value, [key]: next });
}

function setAlign(key: "header" | "footer", axis: "alignX" | "alignY", value: string): void {
  const current = model.value[key];
  const next: DashboardBand = { ...current, [axis]: value };
  if (next.alignY === "baseline") next.alignY = "middle";
  commitModel({ ...model.value, [key]: next });
}

function setSize(axis: "width" | "height", raw: string): void {
  const value = Math.max(100, Math.round(Number(raw)) || 100);
  commitModel({ ...model.value, [axis]: value });
}

function addLine(axis: "col" | "row"): void {
  const selected = selectedCell.value
    ? (axis === "col" ? selectedCell.value.col : selectedCell.value.row)
    : null;
  const next = insertDashboardLine(model.value, axis, selected);
  if (!next) {
    notice.value = t("library.dashboard.lineTooSmall");
    return;
  }
  notice.value = "";
  selectedDivider.value = null;
  commitModel(next);
}

function removeLine(): void {
  if (!selectedDivider.value) return;
  const result = removeDashboardLine(model.value, selectedDivider.value);
  if (!result) return;
  notice.value = result.dropped.length > 0 ? t("library.dashboard.bindingKept") : "";
  selectedDivider.value = null;
  commitModel(result.model);
}

function onTracks(patch: { cols?: number[]; rows?: number[] }): void {
  commitModel({ ...model.value, ...patch });
}

function cellLabel(col: number, row: number): string {
  const cell = model.value.cells.find((item) => item.col === col && item.row === row);
  if (!cell) return "";
  if (cell.kind === "diagram") return titleById.value.get(cell.ref) ?? cell.ref;
  return linkTitleByRef.value.get(cell.ref) ?? cell.ref;
}

function pickItem(item: BoardPick): void {
  if (picked.value?.kind === item.kind && picked.value.ref === item.ref) picked.value = null;
  else picked.value = item;
}

function onSelectCell(cell: { col: number; row: number } | null): void {
  if (step.value === "collage") {
    selectedCell.value = cell;
    return;
  }
  if (!cell || step.value !== "bind") return;
  if (picked.value) {
    commitModel(bindDashboardCell(model.value, cell.col, cell.row, picked.value.kind, picked.value.ref));
    return;
  }
  const bound = model.value.cells.some((item) => item.col === cell.col && item.row === cell.row);
  if (bound) commitModel(clearDashboardCell(model.value, cell.col, cell.row));
}

function applyCustomRefresh(): void {
  const parsed = parseRefreshInterval(customRefresh.value);
  if (!parsed) {
    parseError.value = t("library.dashboard.parseError");
    return;
  }
  commitModel({ ...model.value, refreshMs: parsed });
}

async function loadLinks(): Promise<void> {
  const baseUrl = getLibraryApiBaseUrl();
  const user = auth.currentUser.value?.username;
  if (!baseUrl || !user || library.isLocalMode.value) {
    linkRows.value = [];
    return;
  }
  const rows: BoardPick[] = [];
  const lists = await Promise.all(diagrams.value.map(async (diagram) => {
    const response = await fetchLibraryLinks(diagram.id, baseUrl).catch(() => ({ links: [] as LibraryLinkDto[] }));
    return { diagram, links: response.links };
  }));
  for (const entry of lists) {
    for (const link of entry.links) {
      const ref = `${link.username}/${link.slug}`;
      if (rows.some((item) => item.ref === ref)) continue;
      rows.push({ kind: "link", ref, title: `${entry.diagram.title} · ${link.slug}` });
    }
  }
  linkRows.value = rows;
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

async function showPreview(): Promise<void> {
  const serial = ++previewSerial;
  previewBusy.value = true;
  const zones = [];
  for (const cell of model.value.cells) {
    if (cell.kind !== "diagram") continue;
    const diagram = await loadDashboardDiagramFresh(cell.ref);
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
  if (serial !== previewSerial) return;
  missingFiles.value = refreshed.missingDiagramIds;
  const context = viewContext();
  const composed = await composeDashboardSvg(source.value, context, refreshed.sources).catch(() => null);
  if (serial !== previewSerial) return;
  previewSvg.value = composed ?? renderDashboard(model.value, {
    dark: context.diagramDarkMode,
    background: context.diagramBackground,
    textColor: context.diagramTextColor,
    fontFamily: context.diagramFontFamily,
    fontWeight: context.diagramFontWeight,
    fontStyle: context.diagramFontStyle,
    locale: context.locale,
  });
  if (composed && savedId.value) writeDashboardSvgCache(savedId.value, composed);
  previewBusy.value = false;
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "Delete" && event.key !== "Backspace") return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
  if (step.value !== "collage" || !selectedDivider.value) return;
  event.preventDefault();
  removeLine();
}

onMounted(async () => {
  window.addEventListener("keydown", onKey);
  if (props.diagramId) {
    embedCode.value = readDashboardEmbedHtml(props.diagramId);
    const diagram = await loadDashboardDiagram(props.diagramId);
    if (diagram) {
      title.value = diagram.title;
      applySource(diagram.source);
    }
  }
  void loadLinks();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKey);
  previewSerial += 1;
});

watch(step, (value) => {
  if (value === "bind") void loadLinks();
});
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
        <div
          class="dashboard-panel__actions"
          role="tablist"
        >
          <button
            class="btn"
            type="button"
            :aria-pressed="step === 'collage'"
            @click="step = 'collage'"
          >
            {{ t("library.dashboard.stepCollage") }}
          </button>
          <button
            class="btn"
            type="button"
            :aria-pressed="step === 'bind'"
            @click="step = 'bind'"
          >
            {{ t("library.dashboard.stepBind") }}
          </button>
          <button
            class="btn"
            type="button"
            :aria-pressed="step === 'preview'"
            @click="step = 'preview'"
          >
            {{ t("library.dashboard.stepPreview") }}
          </button>
        </div>

        <template v-if="step === 'collage'">
          <label>
            {{ t("library.dashboard.width") }}
            <input
              class="select"
              type="number"
              min="100"
              :value="model.width"
              @change="setSize('width', ($event.target as HTMLInputElement).value)"
            >
          </label>
          <label>
            {{ t("library.dashboard.height") }}
            <input
              class="select"
              type="number"
              min="100"
              :value="model.height"
              @change="setSize('height', ($event.target as HTMLInputElement).value)"
            >
          </label>
          <div class="dashboard-panel__actions">
            <button
              class="btn"
              type="button"
              @click="addLine('col')"
            >
              {{ t("library.dashboard.addVertical") }}
            </button>
            <button
              class="btn"
              type="button"
              @click="addLine('row')"
            >
              {{ t("library.dashboard.addHorizontal") }}
            </button>
            <button
              class="btn"
              type="button"
              :disabled="!selectedDivider"
              @click="removeLine"
            >
              {{ t("library.dashboard.removeLine") }}
            </button>
          </div>
          <fieldset class="band">
            <legend>{{ t("library.dashboard.heading") }}</legend>
            <input
              class="select"
              type="text"
              :value="model.title.text"
              @change="setCaption('title', { text: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.font')"
              :value="model.title.font"
              @change="setCaption('title', { font: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="number"
              min="8"
              max="96"
              :value="model.title.fontSize"
              @change="setCaption('title', { fontSize: Number(($event.target as HTMLInputElement).value) })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.color')"
              :value="model.title.color"
              @change="setCaption('title', { color: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.background')"
              :value="model.title.background"
              @change="setCaption('title', { background: ($event.target as HTMLInputElement).value })"
            >
            <label class="check">
              <input
                type="checkbox"
                :checked="model.title.shadow"
                @change="setCaption('title', { shadow: ($event.target as HTMLInputElement).checked })"
              >
              {{ t("library.dashboard.shadow") }}
            </label>
          </fieldset>
          <fieldset class="band">
            <legend>{{ t("library.dashboard.header") }}</legend>
            <input
              class="select"
              type="text"
              :value="model.header.text"
              @change="setCaption('header', { text: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.font')"
              :value="model.header.font"
              @change="setCaption('header', { font: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="number"
              min="8"
              max="96"
              :value="model.header.fontSize"
              @change="setCaption('header', { fontSize: Number(($event.target as HTMLInputElement).value) })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.color')"
              :value="model.header.color"
              @change="setCaption('header', { color: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.background')"
              :value="model.header.background"
              @change="setCaption('header', { background: ($event.target as HTMLInputElement).value })"
            >
            <label class="check">
              <input
                type="checkbox"
                :checked="model.header.shadow"
                @change="setCaption('header', { shadow: ($event.target as HTMLInputElement).checked })"
              >
              {{ t("library.dashboard.shadow") }}
            </label>
            <label>
              {{ t("library.dashboard.alignX") }}
              <select
                class="select"
                :value="model.header.alignX"
                @change="setAlign('header', 'alignX', ($event.target as HTMLSelectElement).value as DashboardAlignX)"
              >
                <option value="start">{{ t("library.dashboard.alignStart") }}</option>
                <option value="center">{{ t("library.dashboard.alignCenter") }}</option>
                <option value="end">{{ t("library.dashboard.alignEnd") }}</option>
              </select>
            </label>
            <label>
              {{ t("library.dashboard.alignY") }}
              <select
                class="select"
                :value="model.header.alignY === 'baseline' ? 'middle' : model.header.alignY"
                @change="setAlign('header', 'alignY', ($event.target as HTMLSelectElement).value as DashboardAlignY)"
              >
                <option value="top">{{ t("library.dashboard.alignTop") }}</option>
                <option value="middle">{{ t("library.dashboard.alignMiddle") }}</option>
                <option value="bottom">{{ t("library.dashboard.alignBottom") }}</option>
              </select>
            </label>
          </fieldset>
          <fieldset class="band">
            <legend>{{ t("library.dashboard.footer") }}</legend>
            <input
              class="select"
              type="text"
              :value="model.footer.text"
              @change="setCaption('footer', { text: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.font')"
              :value="model.footer.font"
              @change="setCaption('footer', { font: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="number"
              min="8"
              max="96"
              :value="model.footer.fontSize"
              @change="setCaption('footer', { fontSize: Number(($event.target as HTMLInputElement).value) })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.color')"
              :value="model.footer.color"
              @change="setCaption('footer', { color: ($event.target as HTMLInputElement).value })"
            >
            <input
              class="select"
              type="text"
              :placeholder="t('library.dashboard.background')"
              :value="model.footer.background"
              @change="setCaption('footer', { background: ($event.target as HTMLInputElement).value })"
            >
            <label class="check">
              <input
                type="checkbox"
                :checked="model.footer.shadow"
                @change="setCaption('footer', { shadow: ($event.target as HTMLInputElement).checked })"
              >
              {{ t("library.dashboard.shadow") }}
            </label>
            <label>
              {{ t("library.dashboard.alignX") }}
              <select
                class="select"
                :value="model.footer.alignX"
                @change="setAlign('footer', 'alignX', ($event.target as HTMLSelectElement).value as DashboardAlignX)"
              >
                <option value="start">{{ t("library.dashboard.alignStart") }}</option>
                <option value="center">{{ t("library.dashboard.alignCenter") }}</option>
                <option value="end">{{ t("library.dashboard.alignEnd") }}</option>
              </select>
            </label>
            <label>
              {{ t("library.dashboard.alignY") }}
              <select
                class="select"
                :value="model.footer.alignY === 'baseline' ? 'middle' : model.footer.alignY"
                @change="setAlign('footer', 'alignY', ($event.target as HTMLSelectElement).value as DashboardAlignY)"
              >
                <option value="top">{{ t("library.dashboard.alignTop") }}</option>
                <option value="middle">{{ t("library.dashboard.alignMiddle") }}</option>
                <option value="bottom">{{ t("library.dashboard.alignBottom") }}</option>
              </select>
            </label>
          </fieldset>
        </template>

        <template v-else-if="step === 'bind'">
          <p>{{ t("library.dashboard.bindHint") }}</p>
          <label>
            {{ t("library.dashboard.search") }}
            <input
              v-model="query"
              class="select"
              type="search"
            >
          </label>
          <strong>{{ t("library.dashboard.diagrams") }}</strong>
          <ul class="dashboard-panel__list">
            <li
              v-for="diagram in visibleDiagrams"
              :key="diagram.id"
            >
              <button
                class="btn"
                type="button"
                :aria-pressed="picked?.kind === 'diagram' && picked.ref === diagram.id"
                @click="pickItem({ kind: 'diagram', ref: diagram.id, title: diagram.title })"
              >
                {{ diagram.title }}
              </button>
            </li>
          </ul>
          <strong>{{ t("library.dashboard.links") }}</strong>
          <p v-if="visibleLinks.length === 0">{{ t("library.dashboard.emptyLinks") }}</p>
          <ul class="dashboard-panel__list">
            <li
              v-for="link in visibleLinks"
              :key="link.ref"
            >
              <button
                class="btn"
                type="button"
                :aria-pressed="picked?.kind === 'link' && picked.ref === link.ref"
                @click="pickItem(link)"
              >
                {{ link.title }}
              </button>
            </li>
          </ul>
        </template>

        <template v-else>
          <label>
            {{ t("library.dashboard.refresh") }}
            <select
              v-model="refreshChoice"
              class="select"
            >
              <option value="">{{ t("library.dashboard.refreshOff") }}</option>
              <option :value="String(parseRefreshInterval('30s'))">30s</option>
              <option :value="String(parseRefreshInterval('5m'))">5m</option>
              <option :value="String(parseRefreshInterval('1h'))">1h</option>
              <option value="custom">{{ t("library.dashboard.refreshCustom") }}</option>
            </select>
          </label>
          <label v-if="refreshChoice === 'custom'">
            {{ t("library.dashboard.refreshCustom") }}
            <input
              v-model="customRefresh"
              class="select"
              type="text"
              @change="applyCustomRefresh"
            >
          </label>
          <div class="dashboard-panel__actions">
            <button
              class="btn"
              type="button"
              :disabled="previewBusy"
              @click="showPreview"
            >
              {{ previewBusy ? t("library.dashboard.previewBusy") : t("library.dashboard.preview") }}
            </button>
            <button
              class="btn"
              type="button"
              :disabled="previewBusy"
              @click="showPreview"
            >
              {{ t("library.dashboard.refreshNow") }}
            </button>
          </div>
        </template>

        <p
          v-if="parseError"
          class="dashboard-panel__error"
        >
          {{ parseError }}
        </p>
        <p v-if="missingFiles.length">
          {{ t("library.dashboard.missingFiles") }}: {{ missingFiles.join(", ") }}
        </p>
        <p v-if="notice">{{ notice }}</p>
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
        </div>
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

      <DashboardCollageBoard
        :model="model"
        :mode="step"
        :preview-svg="previewSvg"
        :cell-label="cellLabel"
        :selected-cell="selectedCell"
        :selected-divider="selectedDivider"
        @select-cell="onSelectCell"
        @select-divider="selectedDivider = $event"
        @tracks="onTracks"
      />
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
.dashboard-panel__actions {
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
.dashboard-panel__error { color: #b91c1c; }
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
  .dashboard-panel__form { overflow: visible; }
}
</style>
