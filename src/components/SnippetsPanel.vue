<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import SnippetEditorModal from "@/components/SnippetEditorModal.vue";
import {
  SNIPPETS_PANEL_MARGIN,
  SNIPPETS_PANEL_WIDTH,
} from "@/constants/snippets-settings";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { useSnippets } from "@/composables/useSnippets";
import type { CustomSnippet, SnippetListItem } from "@/types/snippets";
import {
  clampSnippetsPanelPosition,
  getDefaultSnippetsPanelPosition,
  loadSnippetsPanelPosition,
  saveSnippetsPanelPosition,
  SNIPPETS_IMPORT_ACCEPT,
} from "@/utils/snippet-store";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  insert: [content: string];
}>();

const { t } = useLocale();
const { confirm, alert } = useAppDialog();

const snippets = useSnippets();

const panelRef = ref<HTMLElement | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);
const editorOpen = ref(false);
const editingSnippet = ref<CustomSnippet | null>(null);
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

const categoryTabs = computed(() => [
  { id: "all" as const, label: t("snippets.category.all") },
  ...snippets.SNIPPET_CATEGORY_IDS.map((id) => ({
    id,
    label: t(`snippets.category.${id}`),
  })),
  { id: "custom" as const, label: t("snippets.category.custom") },
]);

const filteredItems = computed(() => snippets.filterItems(t));

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

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return;
    }

    const saved = loadSnippetsPanelPosition();
    panelPosition.value =
      saved ?? getDefaultSnippetsPanelPosition(SNIPPETS_PANEL_WIDTH);

    await nextTick();
    clampPanelToViewport();
  },
);

onUnmounted(() => {
  window.removeEventListener("resize", onWindowResize);
});

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener("resize", onWindowResize);
    } else {
      window.removeEventListener("resize", onWindowResize);
    }
  },
);

function getItemTitle(item: SnippetListItem): string {
  if (item.kind === "builtin") {
    return t(item.titleKey);
  }
  return item.snippet.title;
}

function getItemDescription(item: SnippetListItem): string {
  if (item.kind === "builtin" && item.descriptionKey) {
    return t(item.descriptionKey);
  }
  return item.kind === "custom" ? item.snippet.description ?? "" : "";
}

function getItemContent(item: SnippetListItem): string {
  return item.kind === "builtin" ? item.content : item.snippet.content;
}

function insertItem(item: SnippetListItem): void {
  emit("insert", getItemContent(item));
}

function openAddEditor(): void {
  editingSnippet.value = null;
  editorOpen.value = true;
}

function openEditEditor(snippet: CustomSnippet): void {
  editingSnippet.value = snippet;
  editorOpen.value = true;
}

async function requestDelete(snippet: CustomSnippet): Promise<void> {
  const confirmed = await confirm({
    title: t("snippets.deleteTitle"),
    message: t("snippets.deleteMessage", { title: snippet.title }),
    confirmLabel: t("app.delete"),
    variant: "danger",
  });

  if (confirmed) {
    snippets.deleteCustomSnippet(snippet.id);
  }
}

function onEditorSave(payload: {
  title: string;
  content: string;
  description?: string;
  categoryId: CustomSnippet["categoryId"];
}): void {
  if (editingSnippet.value) {
    snippets.updateCustomSnippet(editingSnippet.value.id, payload);
  } else {
    snippets.addCustomSnippet(payload);
  }
  editorOpen.value = false;
  editingSnippet.value = null;
}

function onEditorClose(): void {
  editorOpen.value = false;
  editingSnippet.value = null;
}

function onPanelKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape" && props.open && !editorOpen.value) {
    emit("close");
  }
}

function exportSnippets(): void {
  if (snippets.customSnippets.value.length === 0) {
    void alert({
      title: t("snippets.exportEmptyTitle"),
      message: t("snippets.exportEmptyMessage"),
    });
    return;
  }

  snippets.exportCustomSnippets();
}

function openImportPicker(): void {
  importInputRef.value?.click();
}

async function onImportFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";

  if (!file) {
    return;
  }

  try {
    const raw = await file.text();
    const hasExisting = snippets.customSnippets.value.length > 0;
    let mode: "merge" | "replace" = "merge";

    if (hasExisting) {
      const replace = await confirm({
        title: t("snippets.importModeTitle"),
        message: t("snippets.importModeMessage"),
        confirmLabel: t("snippets.importReplace"),
        cancelLabel: t("snippets.importMerge"),
      });
      mode = replace ? "replace" : "merge";
    }

    const result = snippets.importCustomSnippets(raw, mode);
    await alert({
      title: t("snippets.importSuccessTitle"),
      message: t("snippets.importSuccessMessage", {
        imported: result.imported,
        skipped: result.skipped,
      }),
    });
  } catch {
    await alert({
      title: t("snippets.importErrorTitle"),
      message: t("snippets.importErrorMessage"),
      variant: "error",
    });
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panelRef"
      class="snippets-panel"
      :class="{ 'is-dragging': isDragging }"
      :style="panelStyle"
      role="dialog"
      aria-labelledby="snippets-panel-title"
      @keydown="onPanelKeydown"
    >
      <header
        class="snippets-panel__header"
        @pointerdown="onHeaderPointerDown"
        @pointermove="onHeaderPointerMove"
        @pointerup="onHeaderPointerUp"
        @pointercancel="onHeaderPointerUp"
      >
        <h3 id="snippets-panel-title" class="snippets-panel__title">
          {{ t("snippets.panelTitle") }}
        </h3>
        <div class="snippets-panel__header-actions">
          <IconButton :label="t('snippets.export')" @click="exportSnippets">
            <ActionIcon name="export" />
          </IconButton>
          <IconButton :label="t('snippets.import')" @click="openImportPicker">
            <ActionIcon name="import" />
          </IconButton>
          <IconButton :label="t('snippets.add')" @click="openAddEditor">
            <ActionIcon name="plus" />
          </IconButton>
          <button
            class="snippets-panel__close"
            type="button"
            :aria-label="t('app.close')"
            @click="emit('close')"
          >
            ×
          </button>
        </div>
      </header>

      <div class="snippets-panel__drag-hint">{{ t("snippets.dragHint") }}</div>

      <div class="snippets-panel__search">
        <input
          v-model="snippets.searchQuery.value"
          class="input"
          type="search"
          :placeholder="t('snippets.searchPlaceholder')"
          autocomplete="off"
        />
      </div>

      <div class="snippets-panel__categories" role="tablist">
        <button
          v-for="tab in categoryTabs"
          :key="tab.id"
          class="snippets-panel__category"
          :class="{ 'is-active': snippets.activeCategory.value === tab.id }"
          type="button"
          role="tab"
          :aria-selected="snippets.activeCategory.value === tab.id"
          @click="snippets.activeCategory.value = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="snippets-panel__list">
        <p v-if="filteredItems.length === 0" class="snippets-panel__empty">
          {{ t("snippets.noResults") }}
        </p>

        <article
          v-for="item in filteredItems"
          :key="item.kind === 'builtin' ? item.id : item.snippet.id"
          class="snippet-card"
        >
          <div class="snippet-card__main">
            <h4 class="snippet-card__title">
              {{ getItemTitle(item) }}
              <span
                v-if="item.kind === 'custom'"
                class="snippet-card__badge"
              >
                {{ t("snippets.customBadge") }}
              </span>
            </h4>
            <p v-if="getItemDescription(item)" class="snippet-card__desc">
              {{ getItemDescription(item) }}
            </p>
            <pre class="snippet-card__preview">{{ getItemContent(item) }}</pre>
          </div>

          <div class="snippet-card__actions">
            <button
              class="btn btn-primary btn-sm"
              type="button"
              @click="insertItem(item)"
            >
              {{ t("snippets.insert") }}
            </button>
            <template v-if="item.kind === 'custom'">
              <button
                class="btn btn-sm"
                type="button"
                @click="openEditEditor(item.snippet)"
              >
                {{ t("snippets.edit") }}
              </button>
              <button
                class="btn btn-sm"
                type="button"
                @click="requestDelete(item.snippet)"
              >
                {{ t("app.delete") }}
              </button>
            </template>
          </div>
        </article>
      </div>

      <input
        ref="importInputRef"
        class="sr-only"
        type="file"
        :accept="SNIPPETS_IMPORT_ACCEPT"
        @change="onImportFileSelected"
      />
    </div>
  </Teleport>

  <SnippetEditorModal
    :open="editorOpen"
    :snippet="editingSnippet"
    @close="onEditorClose"
    @save="onEditorSave"
  />
</template>

<style scoped>
.snippets-panel {
  position: fixed;
  z-index: 900;
  max-height: min(72vh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.snippets-panel.is-dragging {
  user-select: none;
  cursor: grabbing;
}

.snippets-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
  cursor: grab;
  touch-action: none;
}

.snippets-panel.is-dragging .snippets-panel__header {
  cursor: grabbing;
}

.snippets-panel__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.snippets-panel__header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.snippets-panel__close {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.4rem;
  line-height: 1;
  padding: 0 4px;
  min-height: auto;
  cursor: pointer;
}

.snippets-panel__drag-hint {
  padding: 4px 12px 0;
  font-size: 0.72rem;
  color: var(--text-muted);
}

.snippets-panel__search {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.snippets-panel__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.snippets-panel__category {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.75rem;
  background: var(--surface);
  color: var(--text-muted);
  min-height: auto;
}

.snippets-panel__category.is-active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.snippets-panel__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.snippets-panel__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.snippet-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  background: var(--surface-muted);
}

.snippet-card__title {
  margin: 0 0 4px;
  font-size: 0.88rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.snippet-card__badge {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 999px;
  padding: 1px 6px;
}

.snippet-card__desc {
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.snippet-card__preview {
  margin: 0;
  padding: 8px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 96px;
  overflow: auto;
}

.snippet-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.btn-sm {
  min-height: 28px;
  padding: 0 10px;
  font-size: 0.78rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

@media (max-width: 720px) {
  .snippets-panel {
    max-height: 55vh;
  }
}
</style>
