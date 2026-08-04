<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LibraryTransferTab from "@/components/LibraryTransferTab.vue";
import {
  MAX_PUML_FILE_BYTES,
  type DiagramDto,
  type LibraryExportBundle,
  type SectionDto,
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

type LibraryTab = "browse" | "upload" | "transfer";
type BrowseStep = "sections" | "diagrams" | "detail";

const activeTab = ref<LibraryTab>("browse");
const browseStep = ref<BrowseStep>("sections");
const uploadTitle = ref("");
const uploadSectionId = ref("");
const uploadFile = ref<File | null>(null);
const uploadError = ref("");
const isUploading = ref(false);

const isEditing = ref(false);
const isSaving = ref(false);
const editTitle = ref("");
const editDescription = ref("");
const editTags = ref("");
const editSectionId = ref("");

const transferSections = ref<SectionDto[]>([]);
const transferDiagrams = ref<DiagramDto[]>([]);
const importBundle = ref<LibraryExportBundle | null>(null);
const isTransferProcessing = ref(false);

const maxSizeKb = computed(() => Math.round(MAX_PUML_FILE_BYTES / 1024));

const statusHint = computed(() => {
  if (isLocalMode.value) return t("library.localMode");
  if (apiAvailable.value) return t("library.serverMode", { url: libraryApiUrl.value });
  if (usingCache.value) return t("library.offlineCache");
  if (isOnline.value) return t("library.apiUnavailable");
  return t("library.offlineCache");
});

const headerTitle = computed(() => {
  if (activeTab.value === "upload") return t("library.uploadDiagram");
  if (activeTab.value === "transfer") return t("library.transfer");
  if (browseStep.value === "sections") return t("library.chooseSection");
  if (browseStep.value === "diagrams") {
    if (selectedSectionId.value === null) return t("library.allSections");
    const section = flatSectionOptions.value.find(
      (item) => item.id === selectedSectionId.value,
    );
    return section?.title ?? t("library.chooseDiagram");
  }
  if (selectedDiagram.value) return selectedDiagram.value.title;
  return t("library.title");
});

const showBackButton = computed(
  () => activeTab.value === "browse" && browseStep.value !== "sections",
);

const showModeTabs = computed(
  () => activeTab.value !== "browse" || browseStep.value === "sections",
);

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

const flatSectionOptions = computed(() =>
  flattenSections(sectionTree.value),
);

function resetBrowseFlow(): void {
  browseStep.value = "sections";
  resetEditForm();
}

function goBack(): void {
  if (browseStep.value === "detail") {
    browseStep.value = "diagrams";
    resetEditForm();
    return;
  }
  if (browseStep.value === "diagrams") {
    browseStep.value = "sections";
    resetEditForm();
  }
}

async function onSectionPick(sectionId: string | null): Promise<void> {
  await library.selectSection(sectionId);
  browseStep.value = "diagrams";
}

async function onDiagramPick(diagramId: string): Promise<void> {
  await library.selectDiagram(diagramId);
  browseStep.value = "detail";
}

async function loadTransferData(): Promise<void> {
  const data = await library.loadTransferData();
  transferSections.value = data.sections;
  transferDiagrams.value = data.diagrams;
}

function resetEditForm(): void {
  isEditing.value = false;
  editTitle.value = "";
  editDescription.value = "";
  editTags.value = "";
  editSectionId.value = "";
}

function startEdit(): void {
  if (!selectedDiagram.value) return;
  editTitle.value = selectedDiagram.value.title;
  editDescription.value = selectedDiagram.value.description;
  editTags.value = selectedDiagram.value.tags.join(", ");
  editSectionId.value = selectedDiagram.value.sectionId ?? "";
  isEditing.value = true;
}

async function saveEdit(): Promise<void> {
  if (!selectedDiagram.value) return;
  isSaving.value = true;
  uploadError.value = "";
  try {
    const tags = editTags.value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    await library.updateDiagram(selectedDiagram.value.id, {
      title: editTitle.value.trim(),
      description: editDescription.value,
      tags,
      sectionId: editSectionId.value || null,
    });
    resetEditForm();
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.syncError");
  } finally {
    isSaving.value = false;
  }
}

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
    await library.addDiagramFromFile(uploadFile.value, {
      title: uploadTitle.value.trim() || undefined,
      sectionId: uploadSectionId.value || null,
    });
    uploadTitle.value = "";
    uploadSectionId.value = selectedSectionId.value ?? "";
    uploadFile.value = null;
    activeTab.value = "browse";
    resetBrowseFlow();
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
  if (!title?.trim()) return;
  try {
    await library.addSection({ title: title.trim(), parentId });
    if (activeTab.value === "transfer") await loadTransferData();
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
  if (!confirmed) return;
  try {
    await library.removeSection(sectionId);
    if (activeTab.value === "transfer") await loadTransferData();
    if (selectedSectionId.value === sectionId) browseStep.value = "sections";
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
  if (!confirmed) return;
  try {
    await library.removeDiagram(diagramId);
    resetEditForm();
    browseStep.value = "diagrams";
    if (activeTab.value === "transfer") await loadTransferData();
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.syncError");
  }
}

function openInEditor(): void {
  if (!selectedDiagram.value) return;
  emit("open-diagram", {
    content: selectedDiagram.value.source,
    fileName: selectedDiagram.value.fileName,
  });
  emit("close");
}

async function onExportSelection(payload: {
  sectionIds: Set<string>;
  diagramIds: Set<string>;
}): Promise<void> {
  isTransferProcessing.value = true;
  uploadError.value = "";
  try {
    await library.exportLibrarySelection(
      payload.sectionIds,
      payload.diagramIds,
    );
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.exportError");
  } finally {
    isTransferProcessing.value = false;
  }
}

async function onImportFile(file: File): Promise<void> {
  uploadError.value = "";
  try {
    const content = await file.text();
    importBundle.value = library.parseImportBundle(content);
  } catch (error) {
    importBundle.value = null;
    uploadError.value =
      error instanceof Error ? error.message : t("library.importError");
  }
}

async function onImportSelection(payload: {
  sectionIds: Set<string>;
  diagramIds: Set<string>;
}): Promise<void> {
  if (!importBundle.value) return;
  isTransferProcessing.value = true;
  uploadError.value = "";
  try {
    await library.importLibrarySelection(
      importBundle.value,
      payload.sectionIds,
      payload.diagramIds,
    );
    importBundle.value = null;
    await loadTransferData();
    activeTab.value = "browse";
    resetBrowseFlow();
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.importError");
  } finally {
    isTransferProcessing.value = false;
  }
}

function switchTab(tab: LibraryTab): void {
  activeTab.value = tab;
  if (tab === "browse") resetBrowseFlow();
  if (tab !== "browse") resetEditForm();
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      uploadSectionId.value = selectedSectionId.value ?? "";
      importBundle.value = null;
      activeTab.value = "browse";
      resetBrowseFlow();
      void library.refresh();
    }
  },
);

watch(activeTab, (tab) => {
  if (tab === "transfer") void loadTransferData();
});

watch(searchQuery, () => library.scheduleSearch());
watch(tagFilter, () => void library.searchDiagrams());
watch(libraryApiUrl, () => {
  if (props.open) void library.refresh();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="library-screen" role="dialog" aria-modal="true">
      <header class="library-header">
        <div class="library-header__row">
          <button
            v-if="showBackButton"
            class="btn library-header__back"
            type="button"
            @click="goBack"
          >
            ← {{ t("library.back") }}
          </button>
          <h2 class="library-header__title">{{ headerTitle }}</h2>
          <div class="library-header__actions">
            <button
              class="btn btn-icon"
              type="button"
              :title="t('library.refresh')"
              :disabled="isSyncing"
              @click="library.refresh()"
            >
              ↻
            </button>
            <button
              class="btn btn-icon library-header__close"
              type="button"
              :aria-label="t('app.close')"
              @click="emit('close')"
            >
              ×
            </button>
          </div>
        </div>

        <p v-if="showModeTabs" class="library-header__hint">{{ statusHint }}</p>

        <nav v-if="showModeTabs" class="library-modes" :aria-label="t('library.title')">
          <button
            class="btn"
            :class="{ 'is-active': activeTab === 'browse' }"
            type="button"
            @click="switchTab('browse')"
          >
            {{ t("library.browse") }}
          </button>
          <button
            class="btn"
            :class="{ 'is-active': activeTab === 'upload' }"
            type="button"
            @click="switchTab('upload')"
          >
            {{ t("library.uploadDiagram") }}
          </button>
          <button
            class="btn"
            :class="{ 'is-active': activeTab === 'transfer' }"
            type="button"
            @click="switchTab('transfer')"
          >
            {{ t("library.transfer") }}
          </button>
        </nav>
      </header>

      <div class="library-body">
        <p v-if="uploadError" class="library-error">{{ uploadError }}</p>
        <p v-if="errorMessage" class="library-error">{{ errorMessage }}</p>

        <!-- Шаг 1: разделы -->
        <div
          v-if="activeTab === 'browse' && browseStep === 'sections'"
          class="library-step"
        >
          <div class="library-step__toolbar">
            <span class="status-pill" :class="isOnline ? 'is-ready' : 'is-error'">
              {{ isOnline ? t("app.online") : t("app.offline") }}
            </span>
            <button
              class="btn"
              type="button"
              @click="createSection(null)"
            >
              + {{ t("library.addSection") }}
            </button>
          </div>

          <div class="library-step__content">
            <button
              class="library-row"
              :class="{ 'is-active': selectedSectionId === null }"
              type="button"
              @click="onSectionPick(null)"
            >
              <span class="library-row__title">{{ t("library.allSections") }}</span>
              <span class="library-row__chevron">›</span>
            </button>

            <div
              v-for="section in flatSectionOptions"
              :key="section.id"
              class="library-section-row"
            >
              <button
                class="library-row"
                :class="{ 'is-active': selectedSectionId === section.id }"
                type="button"
                :style="{ paddingLeft: `${16 + section.depth * 16}px` }"
                @click="onSectionPick(section.id)"
              >
                <span class="library-row__title">{{ section.title }}</span>
                <span class="library-row__chevron">›</span>
              </button>
              <div class="library-section-row__actions">
                <button
                  class="btn btn-icon"
                  type="button"
                  :title="t('library.addSubsection')"
                  @click.stop="createSection(section.id)"
                >
                  +
                </button>
                <button
                  class="btn btn-icon"
                  type="button"
                  :title="t('app.delete')"
                  @click.stop="onDeleteSection(section.id, section.title)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Шаг 2: список диаграмм -->
        <div
          v-else-if="activeTab === 'browse' && browseStep === 'diagrams'"
          class="library-step"
        >
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

          <div class="library-step__content">
            <p v-if="isLoading" class="library-empty">{{ t("app.loading") }}</p>
            <p v-else-if="diagrams.length === 0" class="library-empty">
              {{ t("library.noResults") }}
            </p>
            <button
              v-for="diagram in diagrams"
              :key="diagram.id"
              class="library-row"
              type="button"
              @click="onDiagramPick(diagram.id)"
            >
              <span class="library-row__main">
                <span class="library-row__title">{{ diagram.title }}</span>
                <span class="library-row__meta">
                  {{ t("library.bytes", { size: diagram.byteSize }) }}
                </span>
                <span
                  v-if="diagram.tags.length"
                  class="library-row__tags"
                >
                  <span
                    v-for="tag in diagram.tags"
                    :key="tag"
                    class="library-tag"
                  >
                    {{ tag }}
                  </span>
                </span>
              </span>
              <span class="library-row__chevron">›</span>
            </button>
          </div>
        </div>

        <!-- Шаг 3: детали -->
        <div
          v-else-if="activeTab === 'browse' && browseStep === 'detail' && selectedDiagram"
          class="library-step"
        >
          <template v-if="isEditing">
            <div class="library-step__content library-step__content--form">
              <label class="settings-field">
                <span class="settings-field__label">{{ t("library.diagramTitle") }}</span>
                <input v-model="editTitle" class="select" type="text" />
              </label>
              <label class="settings-field">
                <span class="settings-field__label">{{ t("library.description") }}</span>
                <textarea
                  v-model="editDescription"
                  class="textarea"
                  rows="4"
                />
              </label>
              <label class="settings-field">
                <span class="settings-field__label">{{ t("library.tags") }}</span>
                <input v-model="editTags" class="select" type="text" />
              </label>
              <label class="settings-field">
                <span class="settings-field__label">{{ t("library.sections") }}</span>
                <select v-model="editSectionId" class="select">
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
              <pre class="library-detail__source">{{ selectedDiagram.source }}</pre>
              <div class="library-detail__actions">
                <button
                  class="btn btn-primary"
                  type="button"
                  :disabled="isSaving"
                  @click="saveEdit"
                >
                  {{ isSaving ? t("app.loading") : t("library.saveChanges") }}
                </button>
                <button
                  class="btn"
                  type="button"
                  :disabled="isSaving"
                  @click="resetEditForm"
                >
                  {{ t("app.cancel") }}
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="library-step__content library-step__content--padded">
              <p class="library-detail__meta">
                {{ selectedDiagram.fileName }} ·
                {{ t("library.updatedAt", { date: formatDate(selectedDiagram.updatedAt) }) }}
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
                <button class="btn btn-primary" type="button" @click="openInEditor">
                  {{ t("library.openInEditor") }}
                </button>
                <button class="btn" type="button" @click="startEdit">
                  {{ t("library.edit") }}
                </button>
                <button
                  class="btn"
                  type="button"
                  @click="onDeleteDiagram(selectedDiagram.id, selectedDiagram.title)"
                >
                  {{ t("app.delete") }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Загрузка -->
        <form
          v-else-if="activeTab === 'upload'"
          class="library-step library-step__content library-step__content--form"
          @submit.prevent="submitUpload"
        >
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

        <!-- Импорт/экспорт -->
        <LibraryTransferTab
          v-else-if="activeTab === 'transfer'"
          :sections="transferSections"
          :diagrams="transferDiagrams"
          :import-bundle="importBundle"
          :is-processing="isTransferProcessing"
          @export="onExportSelection"
          @import="onImportSelection"
          @load-import-file="onImportFile"
        />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.library-screen {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  color: var(--text);
}

.library-header {
  flex-shrink: 0;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}

.library-header__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.library-header__back {
  flex-shrink: 0;
}

.library-header__title {
  flex: 1;
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.library-header__actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.library-header__close {
  font-size: 1.5rem;
  line-height: 1;
  min-height: auto;
  padding: 0 6px;
}

.library-header__hint {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.library-modes .btn.is-active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.library-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px 16px 16px;
}

.library-step {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.library-step__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.library-step__content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);
}

.library-step__content--form {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 560px;
}

.library-step__content--padded {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.library-filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 180px);
  gap: 8px;
  flex-shrink: 0;
}

.library-search {
  min-height: 44px;
  padding: 0 12px;
}

.library-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  text-align: left;
  padding: 14px 16px;
  cursor: pointer;
}

.library-row:last-child {
  border-bottom: 0;
}

.library-row:hover,
.library-row.is-active {
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
}

.library-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.library-row__title {
  font-weight: 600;
  font-size: 0.95rem;
  word-break: break-word;
}

.library-row__meta {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.library-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.library-row__chevron {
  color: var(--text-muted);
  font-size: 1.2rem;
  flex-shrink: 0;
}

.library-section-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border);
}

.library-section-row:last-child {
  border-bottom: 0;
}

.library-section-row .library-row {
  border-bottom: 0;
}

.library-section-row__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 8px;
  flex-shrink: 0;
}

.library-tag {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.75rem;
}

.library-detail__meta {
  margin: 0 0 10px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-detail__description {
  margin: 0 0 12px;
  white-space: pre-wrap;
}

.library-detail__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.library-detail__source {
  margin: 0 0 16px;
  padding: 12px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.45;
  flex: 1;
  min-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.library-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex-shrink: 0;
}

.library-empty {
  margin: 0;
  padding: 32px 16px;
  color: var(--text-muted);
  text-align: center;
}

.library-error {
  margin: 0 0 8px;
  color: var(--danger);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.library-upload__hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
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

@media (max-width: 600px) {
  .library-filters {
    grid-template-columns: 1fr;
  }

  .library-header {
    padding: 10px 12px;
  }

  .library-body {
    padding: 10px 12px 12px;
  }
}
</style>
