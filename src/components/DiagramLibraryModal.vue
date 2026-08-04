<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLocale } from "@/composables/useLocale";
import { useAppDialog } from "@/composables/useAppDialog";
import { PUML_FILE_ACCEPT } from "@/utils/puml-files";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "open-diagram": [payload: { content: string; fileName: string }];
}>();

const { t } = useLocale();
const { confirm, prompt } = useAppDialog();
const { libraryApiUrl } = useLibraryApiUrl();

const library = useDiagramLibrary();
const {
  sectionTree,
  diagrams,
  selectedDiagram,
  selectedSectionId,
  searchQuery,
  tagFilter,
  allTags,
  isLoading,
  isSyncing,
  isOnline,
  isLocalMode,
  apiAvailable,
  usingCache,
  errorMessage,
} = library;

const activeTab = ref<"browse" | "upload">("browse");
const uploadTitle = ref("");
const uploadDescription = ref("");
const uploadTags = ref("");
const uploadSectionId = ref("");
const uploadFile = ref<File | null>(null);
const uploadError = ref("");
const isUploading = ref(false);

const maxSizeKb = computed(() => Math.round(MAX_PUML_FILE_BYTES / 1024));

const statusHint = computed(() => {
  if (isLocalMode.value) {
    return t("library.localMode");
  }
  if (apiAvailable.value) {
    return t("library.serverMode", { url: libraryApiUrl.value });
  }
  if (usingCache.value) {
    return t("library.offlineCache");
  }
  if (isOnline.value) {
    return t("library.apiUnavailable");
  }
  return t("library.offlineCache");
});

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function flattenSections(
  items: typeof sectionTree.value,
  depth = 0,
): Array<{ id: string; title: string; depth: number }> {
  const result: Array<{ id: string; title: string; depth: number }> = [];
  for (const item of items) {
    result.push({ id: item.id, title: item.title, depth });
    if (item.children?.length) {
      result.push(...flattenSections(item.children, depth + 1));
    }
  }
  return result;
}

const flatSectionOptions = computed(() => flattenSections(sectionTree.value));

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  uploadError.value = "";

  if (!file) {
    uploadFile.value = null;
    return;
  }

  if (file.size > MAX_PUML_FILE_BYTES) {
    uploadError.value = t("library.fileTooLarge", { size: maxSizeKb.value });
    uploadFile.value = null;
    input.value = "";
    return;
  }

  uploadFile.value = file;
  if (!uploadTitle.value.trim()) {
    uploadTitle.value = file.name.replace(/\.(puml|plantuml|txt)$/i, "");
  }
}

async function submitUpload(): Promise<void> {
  uploadError.value = "";

  if (!uploadFile.value) {
    uploadError.value = t("library.noFile");
    return;
  }

  if (uploadFile.value.size > MAX_PUML_FILE_BYTES) {
    uploadError.value = t("library.fileTooLarge", { size: maxSizeKb.value });
    return;
  }

  isUploading.value = true;
  try {
    const tags = uploadTags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    await library.addDiagramFromFile(uploadFile.value, {
      title: uploadTitle.value.trim() || undefined,
      description: uploadDescription.value.trim(),
      tags,
      sectionId: uploadSectionId.value || null,
    });

    uploadTitle.value = "";
    uploadDescription.value = "";
    uploadTags.value = "";
    uploadSectionId.value = selectedSectionId.value ?? "";
    uploadFile.value = null;
    activeTab.value = "browse";
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.syncError");
  } finally {
    isUploading.value = false;
  }
}

async function createSection(parentId: string | null): Promise<void> {
  const title = await prompt({
    title: parentId ? t("library.addSubsection") : t("library.addSection"),
    message: t("library.sectionTitle"),
    placeholder: t("library.sectionTitle"),
    confirmLabel: t("app.create"),
  });

  if (!title?.trim()) {
    return;
  }

  try {
    await library.addSection({ title: title.trim(), parentId });
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.syncError");
  }
}

async function onDeleteSection(sectionId: string, title: string): Promise<void> {
  const confirmed = await confirm({
    title: t("app.delete"),
    message: t("library.deleteSectionConfirm", { title }),
    variant: "danger",
    confirmLabel: t("app.delete"),
  });

  if (!confirmed) {
    return;
  }

  try {
    await library.removeSection(sectionId);
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.syncError");
  }
}

async function onDeleteDiagram(diagramId: string, title: string): Promise<void> {
  const confirmed = await confirm({
    title: t("app.delete"),
    message: t("library.deleteDiagramConfirm", { title }),
    variant: "danger",
    confirmLabel: t("app.delete"),
  });

  if (!confirmed) {
    return;
  }

  try {
    await library.removeDiagram(diagramId);
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.syncError");
  }
}

function openInEditor(): void {
  if (!selectedDiagram.value) {
    return;
  }

  emit("open-diagram", {
    content: selectedDiagram.value.source,
    fileName: selectedDiagram.value.fileName,
  });
  emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      uploadSectionId.value = selectedSectionId.value ?? "";
      void library.refresh();
    }
  },
);

watch(searchQuery, () => library.scheduleSearch());

watch(tagFilter, () => {
  void library.searchDiagrams();
});

watch(libraryApiUrl, () => {
  if (props.open) {
    void library.refresh();
  }
});
</script>

<template>
  <AppModal :open="open" :title="t('library.title')" @close="emit('close')">
    <div class="library-toolbar">
      <div class="library-status">
        <span
          class="status-pill"
          :class="isOnline ? 'is-ready' : 'is-error'"
        >
          {{ isOnline ? t("app.online") : t("app.offline") }}
        </span>
        <span class="library-status__hint">{{ statusHint }}</span>
        <span v-if="isSyncing" class="library-status__hint">
          {{ t("app.loading") }}
        </span>
      </div>

      <div class="library-toolbar__actions">
        <button
          class="btn btn-icon"
          type="button"
          :title="t('library.refresh')"
          :disabled="isSyncing"
          @click="library.refresh()"
        >
          ↻
        </button>
        <div class="library-tabs">
          <button
            class="btn"
            :class="{ 'is-active': activeTab === 'browse' }"
            type="button"
            @click="activeTab = 'browse'"
          >
            {{ t("library.browse") }}
          </button>
          <button
            class="btn"
            :class="{ 'is-active': activeTab === 'upload' }"
            type="button"
            @click="activeTab = 'upload'"
          >
            {{ t("library.uploadDiagram") }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="uploadError" class="library-error">{{ uploadError }}</p>
    <p v-if="errorMessage" class="library-error">{{ errorMessage }}</p>

    <div v-if="activeTab === 'browse'" class="library-layout">
      <aside class="library-sidebar">
        <div class="library-sidebar__header">
          <h3 class="library-sidebar__title">{{ t("library.sections") }}</h3>
          <button
            class="btn btn-icon"
            type="button"
            :title="t('library.addSection')"
            @click="createSection(null)"
          >
            +
          </button>
        </div>

        <button
          class="library-section-item"
          :class="{ 'is-active': selectedSectionId === null }"
          type="button"
          @click="library.selectSection(null)"
        >
          {{ t("library.allSections") }}
        </button>

        <div
          v-for="section in flatSectionOptions"
          :key="section.id"
          class="library-section-row"
        >
          <button
            class="library-section-item"
            :class="{ 'is-active': selectedSectionId === section.id }"
            type="button"
            :style="{ paddingLeft: `${10 + section.depth * 12}px` }"
            @click="library.selectSection(section.id)"
          >
            {{ section.title }}
          </button>
          <div class="library-section-row__actions">
            <button
              class="btn btn-icon"
              type="button"
              :title="t('library.addSubsection')"
              @click="createSection(section.id)"
            >
              +
            </button>
            <button
              class="btn btn-icon"
              type="button"
              :title="t('app.delete')"
              @click="onDeleteSection(section.id, section.title)"
            >
              ×
            </button>
          </div>
        </div>
      </aside>

      <section class="library-main">
        <div class="library-filters">
          <input
            v-model="searchQuery"
            class="select library-search"
            type="search"
            :placeholder="t('library.searchPlaceholder')"
          />
          <select v-model="tagFilter" class="select">
            <option value="">{{ t("library.filterByTag") }}</option>
            <option v-for="tag in allTags" :key="tag" :value="tag">
              {{ tag }}
            </option>
          </select>
        </div>

        <div class="library-panels">
          <div class="library-list">
            <p v-if="isLoading" class="library-empty">
              {{ t("app.loading") }}
            </p>
            <p v-else-if="diagrams.length === 0" class="library-empty">
              {{ t("library.noResults") }}
            </p>
            <button
              v-for="diagram in diagrams"
              :key="diagram.id"
              class="library-diagram-item"
              :class="{ 'is-active': selectedDiagram?.id === diagram.id }"
              type="button"
              @click="library.selectDiagram(diagram.id)"
            >
              <span class="library-diagram-item__title">{{ diagram.title }}</span>
              <span class="library-diagram-item__meta">
                {{ t("library.bytes", { size: diagram.byteSize }) }}
              </span>
              <span
                v-if="diagram.tags.length"
                class="library-diagram-item__tags"
              >
                <span
                  v-for="tag in diagram.tags"
                  :key="tag"
                  class="library-tag"
                >
                  {{ tag }}
                </span>
              </span>
            </button>
          </div>

          <div v-if="diagrams.length > 0" class="library-detail">
            <template v-if="selectedDiagram">
              <h3 class="library-detail__title">{{ selectedDiagram.title }}</h3>
              <p class="library-detail__meta">
                {{ selectedDiagram.fileName }} ·
                {{
                  t("library.updatedAt", {
                    date: formatDate(selectedDiagram.updatedAt),
                  })
                }}
              </p>
              <p
                v-if="selectedDiagram.description"
                class="library-detail__description"
              >
                {{ selectedDiagram.description }}
              </p>
              <div
                v-if="selectedDiagram.tags.length"
                class="library-detail__tags"
              >
                <span
                  v-for="tag in selectedDiagram.tags"
                  :key="tag"
                  class="library-tag"
                >
                  {{ tag }}
                </span>
              </div>
              <pre class="library-detail__source">{{ selectedDiagram.source }}</pre>
              <div class="library-detail__actions">
                <button
                  class="btn btn-primary"
                  type="button"
                  @click="openInEditor"
                >
                  {{ t("library.openInEditor") }}
                </button>
                <button
                  class="btn"
                  type="button"
                  @click="
                    onDeleteDiagram(selectedDiagram.id, selectedDiagram.title)
                  "
                >
                  {{ t("app.delete") }}
                </button>
              </div>
            </template>
            <p v-else class="library-empty">
              {{ t("library.selectDiagram") }}
            </p>
          </div>
        </div>
      </section>
    </div>

    <form v-else class="library-upload" @submit.prevent="submitUpload">
      <p class="library-upload__hint">
        {{ t("library.sizeLimit", { size: maxSizeKb }) }}
      </p>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.selectFile") }}</span>
        <input type="file" :accept="PUML_FILE_ACCEPT" @change="onFileChange" />
        <span class="library-upload__file-name">
          {{ uploadFile?.name ?? t("library.noFile") }}
        </span>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.diagramTitle") }}</span>
        <input v-model="uploadTitle" class="select" type="text" />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.description") }}</span>
        <textarea
          v-model="uploadDescription"
          class="textarea library-upload__textarea"
          rows="3"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.tags") }}</span>
        <input v-model="uploadTags" class="select" type="text" />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.sections") }}</span>
        <select v-model="uploadSectionId" class="select">
          <option value="">{{ t("library.allSections") }}</option>
          <option
            v-for="section in flatSectionOptions"
            :key="section.id"
            :value="section.id"
          >
            {{ "—".repeat(section.depth) }}{{ section.depth > 0 ? " " : ""
            }}{{ section.title }}
          </option>
        </select>
      </label>

      <button
        class="btn btn-primary"
        type="submit"
        :disabled="isUploading || !uploadFile"
      >
        {{ isUploading ? t("app.loading") : t("app.upload") }}
      </button>
    </form>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.library-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.library-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.library-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.library-status__hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}

.library-tabs {
  display: flex;
  gap: 6px;
}

.library-tabs .btn.is-active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.library-error {
  margin: 0 0 12px;
  color: var(--danger);
  font-size: 0.9rem;
}

.library-layout {
  display: grid;
  grid-template-columns: minmax(140px, 180px) minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.library-sidebar {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  padding: 8px;
  min-height: 0;
  overflow: auto;
}

.library-sidebar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.library-sidebar__title {
  margin: 0;
  font-size: 0.88rem;
}

.library-section-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.library-section-row__actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}

.library-section-row:hover .library-section-row__actions,
.library-section-row:focus-within .library-section-row__actions {
  opacity: 1;
}

.library-section-item {
  flex: 1;
  min-width: 0;
  text-align: left;
  border: 0;
  background: transparent;
  color: var(--text);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 0.85rem;
}

.library-section-item:hover,
.library-section-item.is-active {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.library-main {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
}

.library-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 180px);
  gap: 8px;
}

.library-search {
  min-height: 40px;
  padding: 0 10px;
}

.library-panels {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.library-list,
.library-detail {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  overflow: auto;
}

.library-list {
  padding: 6px;
  max-height: min(200px, 28dvh);
  flex-shrink: 0;
}

.library-detail {
  padding: 12px;
  flex: 1;
  min-height: 0;
}

.library-diagram-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 4px;
}

.library-diagram-item:hover,
.library-diagram-item.is-active {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
}

.library-diagram-item__title {
  font-weight: 600;
  font-size: 0.9rem;
  word-break: break-word;
}

.library-diagram-item__meta,
.library-detail__meta {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.library-diagram-item__tags,
.library-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.library-tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.75rem;
}

.library-detail__title {
  margin: 0 0 8px;
  font-size: 1rem;
}

.library-detail__description {
  margin: 0 0 10px;
  white-space: pre-wrap;
}

.library-detail__source {
  margin: 0 0 12px;
  padding: 10px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  line-height: 1.4;
  max-height: min(200px, 24dvh);
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.library-detail__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.library-empty {
  margin: 0;
  padding: 16px;
  color: var(--text-muted);
  text-align: center;
}

.library-upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.library-upload__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-upload__textarea {
  min-height: 80px;
}

.library-upload__file-name {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-field__label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

:deep(.modal) {
  width: min(720px, calc(100vw - 32px));
  max-height: min(90dvh, 860px);
  height: min(90dvh, 860px);
}

:deep(.modal-body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (max-width: 720px) {
  .library-layout {
    grid-template-columns: 1fr;
  }

  .library-sidebar {
    max-height: min(140px, 20dvh);
  }

  .library-filters {
    grid-template-columns: 1fr;
  }

  .library-section-row__actions {
    opacity: 1;
  }
}

@media (max-width: 480px) {
  :deep(.modal-backdrop) {
    padding: 0;
    align-items: stretch;
  }

  :deep(.modal) {
    width: 100%;
    max-height: 100dvh;
    height: 100dvh;
    border-radius: 0;
  }

  .library-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .library-toolbar__actions {
    justify-content: space-between;
  }
}
</style>
