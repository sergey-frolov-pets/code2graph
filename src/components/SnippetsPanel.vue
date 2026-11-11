<script setup lang="ts">
import { computed, ref, toRef, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import SnippetEditorModal from "@/components/SnippetEditorModal.vue";
import SnippetCard from "@/components/snippets/SnippetCard.vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useDraggableFloatingPanel } from "@/composables/useDraggableFloatingPanel";
import { useLocale } from "@/composables/useLocale";
import { useMediaQuery } from "@/composables/useMediaQuery";
import {
  resolveSnippetLanguageFromFormat,
  useSnippets,
} from "@/composables/useSnippets";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { getLanguageModule } from "@/languages/registry";
import type { LocaleKey } from "@/locales/types";
import { SNIPPETS_IMPORT_ACCEPT } from "@/storage/snippets";
import type {
  CustomSnippet,
  SnippetCategoryId,
  SnippetLanguageId,
} from "@/types/snippets";

const props = withDefaults(
  defineProps<{
    open: boolean;
    diagramFormat?: DiagramFormat;
    source?: string;
    canInsert?: boolean;
  }>(),
  {
    diagramFormat: undefined,
    source: "",
    canInsert: true,
  },
);

const emit = defineEmits<{
  close: [];
  insert: [content: string];
}>();

const { t } = useLocale();
const { confirm, alert } = useAppDialog();
const isMobileSheet = useMediaQuery("(max-width: 900px)");

const snippets = useSnippets({
  initialFormat: props.diagramFormat,
  initialSource: props.source,
});

const panelRef = ref<HTMLElement | null>(null);
const importInputRef = ref<HTMLInputElement | null>(null);
const editorOpen = ref(false);
const editingSnippet = ref<CustomSnippet | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && props.diagramFormat) {
      snippets.syncWithEditorContext(props.diagramFormat, props.source);
    }
  },
);

watch(
  () => props.diagramFormat,
  (format) => {
    if (format) {
      snippets.syncWithEditorContext(format, props.source);
    }
  },
);

const {
  isDragging,
  panelStyle,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
} = useDraggableFloatingPanel({
  open: toRef(props, "open"),
  panelRef,
  isMobileSheet,
});

const defaultSnippetLanguage = computed<SnippetLanguageId>(() => {
  if (snippets.activeLanguage.value !== null) {
    return snippets.activeLanguage.value;
  }
  return resolveSnippetLanguageFromFormat(props.diagramFormat);
});

const languageTags = computed(() =>
  snippets.SNIPPET_LANGUAGE_IDS.map((id) => ({
    id,
    label: t(getLanguageModule(id).labelKey),
  })),
);

const categoryTags = computed(() => [
  ...snippets.availableCategoryIds.value.map((id) => {
    const key: LocaleKey = `snippets.category.${id}`;
    return {
      id,
      label: t(key),
    };
  }),
  { id: "custom" as const, label: t("snippets.category.custom") },
]);

const filteredItems = computed(() => snippets.filterItems(t));

function openAddEditor(): void {
  editingSnippet.value = null;
  editorOpen.value = true;
}

function openEditEditor(snippet: CustomSnippet): void {
  editingSnippet.value = snippet;
  editorOpen.value = true;
}

function onSelectLanguageTag(language: SnippetLanguageId): void {
  snippets.toggleLanguageTag(language);
}

function onSelectCategoryTag(category: SnippetCategoryId | "custom"): void {
  snippets.toggleCategoryTag(category);
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
  language: SnippetLanguageId;
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
      v-if="open && isMobileSheet"
      class="snippets-sheet-backdrop"
      @click="emit('close')"
    />
    <div
      v-if="open"
      ref="panelRef"
      class="snippets-panel"
      :class="{
        'snippets-panel--sheet': isMobileSheet,
        'is-dragging': isDragging && !isMobileSheet,
      }"
      :style="isMobileSheet ? undefined : panelStyle"
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
          <IconButton
            :label="t('snippets.export')"
            data-testid="snippets-export"
            @click="exportSnippets"
          >
            <ActionIcon name="export" />
          </IconButton>
          <IconButton
            :label="t('snippets.import')"
            data-testid="snippets-import"
            @click="openImportPicker"
          >
            <ActionIcon name="import" />
          </IconButton>
          <IconButton
            :label="t('snippets.add')"
            data-testid="snippets-add"
            @click="openAddEditor"
          >
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

      <div v-if="!isMobileSheet" class="snippets-panel__drag-hint">
        {{ t("snippets.dragHint") }}
      </div>

      <div class="snippets-panel__search">
        <input
          v-model="snippets.searchQuery.value"
          class="input"
          type="search"
          data-testid="snippets-search"
          :placeholder="t('snippets.searchPlaceholder')"
          autocomplete="off"
        />
      </div>

      <div class="snippets-panel__filter-group">
        <span class="snippets-panel__filter-label">
          {{ t("snippets.filterLanguage") }}
        </span>
        <div
          class="snippets-panel__tags"
          role="group"
          :aria-label="t('snippets.filterLanguage')"
        >
          <button
            v-for="tag in languageTags"
            :key="tag.id"
            class="snippets-panel__tag"
            :class="{ 'is-active': snippets.activeLanguage.value === tag.id }"
            type="button"
            :data-testid="`snippets-lang-${tag.id}`"
            :aria-pressed="snippets.activeLanguage.value === tag.id"
            @click="onSelectLanguageTag(tag.id)"
          >
            {{ tag.label }}
          </button>
        </div>
      </div>

      <div class="snippets-panel__filter-group">
        <span class="snippets-panel__filter-label">
          {{ t("snippets.filterCategory") }}
        </span>
        <div
          class="snippets-panel__tags"
          role="group"
          :aria-label="t('snippets.filterCategory')"
        >
          <button
            v-for="tab in categoryTags"
            :key="tab.id"
            class="snippets-panel__tag"
            :class="{ 'is-active': snippets.activeCategory.value === tab.id }"
            type="button"
            :data-testid="`snippets-cat-${tab.id}`"
            :aria-pressed="snippets.activeCategory.value === tab.id"
            @click="onSelectCategoryTag(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <div class="snippets-panel__list">
        <p v-if="filteredItems.length === 0" class="snippets-panel__empty">
          {{ t("snippets.noResults") }}
        </p>

        <SnippetCard
          v-for="item in filteredItems"
          :key="item.kind === 'builtin' ? item.id : item.snippet.id"
          :item="item"
          :can-insert="canInsert"
          @insert="emit('insert', $event)"
          @edit="openEditEditor"
          @delete="requestDelete"
          @select-language="onSelectLanguageTag"
          @select-category="onSelectCategoryTag"
        />
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
    :default-language="defaultSnippetLanguage"
    @close="onEditorClose"
    @save="onEditorSave"
  />
</template>

<style scoped>
.snippets-sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 899;
  background: var(--overlay);
}

.snippets-panel {
  position: fixed;
  z-index: 900;
  max-height: min(76vh, 680px);
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
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}

.snippets-panel__filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
}

.snippets-panel__filter-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}

.snippets-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.snippets-panel__tag {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 0.73rem;
  background: var(--surface);
  color: var(--text-muted);
  min-height: auto;
  cursor: pointer;
}

.snippets-panel__tag.is-active {
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

.snippets-panel--sheet {
  left: 0 !important;
  right: 0 !important;
  top: auto !important;
  bottom: 0;
  width: 100% !important;
  max-height: min(85vh, 720px);
  border-radius: var(--radius) var(--radius) 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.snippets-panel--sheet .snippets-panel__header {
  cursor: default;
}

@media (max-width: 900px) {
  .snippets-panel:not(.snippets-panel--sheet) {
    max-height: 55vh;
  }
}
</style>
