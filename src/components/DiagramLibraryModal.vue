<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import {
  DIAGRAM_LANGUAGES,
  MAX_PUML_FILE_BYTES,
  type DiagramLanguage,
} from "@/constants/diagram-library";
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

const activeTab = ref<"browse" | "upload">("browse");
const uploadTitle = ref("");
const uploadDescription = ref("");
const uploadTags = ref("");
const uploadLanguage = ref<DiagramLanguage>("plantuml");
const uploadSectionId = ref("");
const uploadFile = ref<File | null>(null);
const uploadError = ref("");
const isUploading = ref(false);

const maxSizeKb = computed(() => Math.round(MAX_PUML_FILE_BYTES / 1024));

const languageOptions = computed(() =>
  DIAGRAM_LANGUAGES.map((language) => ({
    value: language,
    label: language,
  })),
);

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function flattenSections(
  items: typeof library.sectionTree.value,
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

const flatSectionOptions = computed(() =>
  flattenSections(library.sectionTree.value),
);

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
      language: uploadLanguage.value,
      sectionId: uploadSectionId.value || null,
    });

    uploadTitle.value = "";
    uploadDescription.value = "";
    uploadTags.value = "";
    uploadLanguage.value = "plantuml";
    uploadSectionId.value = library.selectedSectionId.value ?? "";
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
  if (!library.selectedDiagram.value) {
    return;
  }

  emit("open-diagram", {
    content: library.selectedDiagram.value.source,
    fileName: library.selectedDiagram.value.fileName,
  });
  emit("close");
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      uploadSectionId.value = library.selectedSectionId.value ?? "";
      void library.refresh();
    }
  },
);

watch(
  () => library.searchQuery.value,
  () => library.scheduleSearch(),
);

watch(
  [() => library.tagFilter.value, () => library.languageFilter.value],
  () => {
    void library.searchDiagrams();
  },
);

watch(libraryApiUrl, () => {
  if (props.open) {
    void library.refresh();
  }
});
</script>

<template>
  <AppModal :open="open" :title="t('library.title')" @close="emit('close')">
    <div class="library-status">
      <span
        class="status-pill"
        :class="library.isOnline.value ? 'is-ready' : 'is-error'"
      >
        {{ library.isOnline.value ? t("app.online") : t("app.offline") }}
      </span>
      <span v-if="library.isLocalMode.value" class="library-status__hint">
        {{ t("library.localMode") }}
      </span>
      <span
        v-else-if="library.apiAvailable.value"
        class="library-status__hint"
      >
        {{ t("library.serverMode", { url: libraryApiUrl }) }}
      </span>
      <span v-else-if="library.usingCache.value" class="library-status__hint">
        {{ t("library.offlineCache") }}
      </span>
      <span
        v-else-if="library.isOnline.value"
        class="library-status__hint"
      >
        {{ t("library.apiUnavailable") }}
      </span>
      <span v-if="library.isSyncing.value" class="library-status__hint">
        {{ t("app.loading") }}
      </span>
    </div>

    <div class="library-tabs">
      <button
        class="btn"
        :class="{ 'is-active': activeTab === 'browse' }"
        type="button"
        @click="activeTab = 'browse'"
      >
        {{ t("app.search") }}
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

    <p v-if="uploadError" class="library-error">{{ uploadError }}</p>
    <p v-if="library.errorMessage.value" class="library-error">
      {{ library.errorMessage.value }}
    </p>

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
          :class="{ 'is-active': library.selectedSectionId.value === null }"
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
            :class="{ 'is-active': library.selectedSectionId.value === section.id }"
            type="button"
            :style="{ paddingLeft: `${12 + section.depth * 14}px` }"
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
            v-model="library.searchQuery.value"
            class="select library-search"
            type="search"
            :placeholder="t('library.searchPlaceholder')"
          />
          <select v-model="library.tagFilter.value" class="select">
            <option value="">{{ t("library.filterByTag") }}</option>
            <option
              v-for="tag in library.allTags.value"
              :key="tag"
              :value="tag"
            >
              {{ tag }}
            </option>
          </select>
          <select v-model="library.languageFilter.value" class="select">
            <option value="">{{ t("library.anyLanguage") }}</option>
            <option
              v-for="option in languageOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="library-content">
          <div class="library-list">
            <p v-if="library.isLoading.value" class="library-empty">
              {{ t("app.loading") }}
            </p>
            <p
              v-else-if="library.diagrams.value.length === 0"
              class="library-empty"
            >
              {{ t("library.noResults") }}
            </p>
            <button
              v-for="diagram in library.diagrams.value"
              :key="diagram.id"
              class="library-diagram-item"
              :class="{
                'is-active': library.selectedDiagram.value?.id === diagram.id,
              }"
              type="button"
              @click="library.selectDiagram(diagram.id)"
            >
              <span class="library-diagram-item__title">{{ diagram.title }}</span>
              <span class="library-diagram-item__meta">
                {{ diagram.language }} ·
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

          <div class="library-detail">
            <template v-if="library.selectedDiagram.value">
              <h3 class="library-detail__title">
                {{ library.selectedDiagram.value.title }}
              </h3>
              <p class="library-detail__meta">
                {{ library.selectedDiagram.value.language }} ·
                {{ library.selectedDiagram.value.fileName }} ·
                {{
                  t("library.updatedAt", {
                    date: formatDate(library.selectedDiagram.value.updatedAt),
                  })
                }}
              </p>
              <p class="library-detail__description">
                {{
                  library.selectedDiagram.value.description ||
                  t("library.emptyDescription")
                }}
              </p>
              <div
                v-if="library.selectedDiagram.value.tags.length"
                class="library-detail__tags"
              >
                <span
                  v-for="tag in library.selectedDiagram.value.tags"
                  :key="tag"
                  class="library-tag"
                >
                  {{ tag }}
                </span>
              </div>
              <pre class="library-detail__source">{{
                library.selectedDiagram.value.source
              }}</pre>
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
                    onDeleteDiagram(
                      library.selectedDiagram.value!.id,
                      library.selectedDiagram.value!.title,
                    )
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
        <input
          type="file"
          :accept="PUML_FILE_ACCEPT"
          @change="onFileChange"
        />
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
          rows="4"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.tags") }}</span>
        <input v-model="uploadTags" class="select" type="text" />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.language") }}</span>
        <select v-model="uploadLanguage" class="select">
          <option
            v-for="option in languageOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
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
.library-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.library-status__hint {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
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
  grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
  gap: 12px;
  min-height: 420px;
}

.library-sidebar {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  padding: 8px;
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
  gap: 4px;
}

.library-section-row__actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.library-filters {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 8px;
}

.library-search {
  min-height: 40px;
  padding: 0 10px;
}

.library-content {
  display: grid;
  grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
  gap: 10px;
  min-height: 360px;
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
}

.library-detail {
  padding: 12px;
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
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
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
}

.library-upload__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-upload__textarea {
  min-height: 100px;
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
  width: min(960px, 100%);
  max-height: min(90vh, 860px);
}

@media (min-width: 901px) {
  :deep(.modal) {
    width: min(1100px, calc(100vw - 48px));
  }

  .library-layout {
    min-height: clamp(420px, 62vh, 720px);
  }

  .library-content {
    min-height: clamp(360px, 52vh, 640px);
  }

  .library-filters {
    grid-template-columns: minmax(220px, 2fr) minmax(140px, 1fr) minmax(140px, 1fr);
  }
}

@media (max-width: 800px) {
  .library-layout,
  .library-content,
  .library-filters {
    grid-template-columns: 1fr;
  }
}
</style>
