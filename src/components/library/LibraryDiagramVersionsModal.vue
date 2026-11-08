<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { useLibraryDiagramPreview } from "@/composables/useLibraryDiagramPreview";
import type { DiagramDto, DiagramVersionDto } from "@/constants/diagram-library";
import {
  createLibraryDiagramVersion,
  deleteLibraryDiagramVersion,
  fetchDiagramVersions,
  restoreLibraryDiagramVersion,
} from "@/services/library/api";
import { diagramAllowsWrite } from "@/utils/library-display";

const props = defineProps<{
  open: boolean;
  diagram: DiagramDto | null;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  close: [];
  restored: [diagram: DiagramDto];
}>();

const { t } = useLocale();
const { confirm } = useAppDialog();
const preview = useLibraryDiagramPreview();
const previewError = preview.error;
const previewRendering = preview.isRendering;
const previewMarkup = preview.previewMarkup;

const versions = ref<DiagramVersionDto[]>([]);
const selectedVersionId = ref("");
const viewMode = ref<"preview" | "source">("preview");
const comment = ref("");
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

const hasApi = computed(() => Boolean(props.apiUrl));
const canMutate = computed(() =>
  props.diagram ? diagramAllowsWrite(props.diagram) : false,
);
const hasVersions = computed(() => versions.value.length > 0);
const canSaveVersion = computed(
  () =>
    Boolean(props.diagram?.source?.trim() && props.apiUrl) && canMutate.value,
);
const selectedVersion = computed(
  () => versions.value.find((item) => item.id === selectedVersionId.value) ?? null,
);

const modalTitle = computed(() =>
  props.diagram
    ? t("library.versionsTitle", { title: props.diagram.title })
    : t("library.versions"),
);

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function selectVersion(version: DiagramVersionDto): void {
  selectedVersionId.value = version.id;
  viewMode.value = "preview";
}

async function loadVersions(): Promise<void> {
  if (!props.diagram || !props.apiUrl) {
    versions.value = [];
    selectedVersionId.value = "";
    preview.resetPreview();
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchDiagramVersions(props.diagram.id, props.apiUrl);
    versions.value = response.versions;
    const stillSelected = response.versions.some(
      (item) => item.id === selectedVersionId.value,
    );
    selectedVersionId.value = stillSelected
      ? selectedVersionId.value
      : (response.versions[0]?.id ?? "");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.loadError");
    versions.value = [];
    selectedVersionId.value = "";
  } finally {
    isLoading.value = false;
  }
}

async function saveVersion(): Promise<void> {
  if (!props.diagram || !props.apiUrl || !canSaveVersion.value || isSaving.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    const response = await createLibraryDiagramVersion(
      props.diagram.id,
      { source: props.diagram.source, comment: comment.value },
      props.apiUrl,
    );
    versions.value = [response.version, ...versions.value];
    selectedVersionId.value = response.version.id;
    comment.value = "";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.saveError");
  } finally {
    isSaving.value = false;
  }
}

async function requestRestore(version: DiagramVersionDto): Promise<void> {
  if (!props.diagram || !props.apiUrl || !canMutate.value) {
    return;
  }

  const confirmed = await confirm({
    title: t("versions.restoreTitle"),
    message: t("versions.restoreMessage", { number: version.versionNumber }),
    confirmLabel: t("versions.restore"),
    variant: "default",
  });

  if (!confirmed) {
    return;
  }

  try {
    const diagram = await restoreLibraryDiagramVersion(
      props.diagram.id,
      version.id,
      props.apiUrl,
    );
    emit("restored", diagram);
    emit("close");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.loadError");
  }
}

async function requestDelete(version: DiagramVersionDto): Promise<void> {
  if (!props.diagram || !props.apiUrl || !canMutate.value) {
    return;
  }

  const confirmed = await confirm({
    title: t("versions.deleteTitle"),
    message: t("versions.deleteMessage", { number: version.versionNumber }),
    confirmLabel: t("app.delete"),
    variant: "danger",
  });

  if (!confirmed) {
    return;
  }

  try {
    await deleteLibraryDiagramVersion(props.diagram.id, version.id, props.apiUrl);
    versions.value = versions.value.filter((item) => item.id !== version.id);
    if (selectedVersionId.value === version.id) {
      selectedVersionId.value = versions.value[0]?.id ?? "";
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.deleteError");
  }
}

watch(
  () => [props.open, props.diagram?.id, props.apiUrl] as const,
  ([isOpen]) => {
    if (isOpen) {
      comment.value = "";
      errorMessage.value = "";
      viewMode.value = "preview";
      void loadVersions();
    }
  },
);

watch(selectedVersion, (version) => {
  if (!version || !props.diagram) {
    preview.resetPreview();
    return;
  }

  void preview.renderPreview(version.source, {
    watermarked: props.diagram.canDownload === false,
    fileName: props.diagram.fileName,
    language: props.diagram.language,
  });
});
</script>

<template>
  <AppModal
    :open="open"
    :title="modalTitle"
    layer="above-library"
    wide
    @close="emit('close')"
  >
    <div class="versions-panel">
      <p v-if="!hasApi" class="versions-empty">
        {{ t("library.versionsOnlineOnly") }}
      </p>

      <template v-else>
        <section v-if="canMutate" class="versions-save">
          <label class="field">
            <span class="field-label">{{ t("versions.commentLabel") }}</span>
            <input
              v-model="comment"
              class="select"
              type="text"
              :placeholder="t('versions.commentPlaceholder')"
              :disabled="isSaving"
              @keydown.enter="saveVersion()"
            />
          </label>
          <button
            class="btn btn-primary versions-save__btn"
            type="button"
            :disabled="!canSaveVersion || isSaving"
            @click="saveVersion()"
          >
            {{ isSaving ? t("app.loading") : t("versions.saveCurrent") }}
          </button>
        </section>

        <p v-if="errorMessage" class="versions-error">{{ errorMessage }}</p>

        <p v-if="isLoading" class="versions-empty">{{ t("app.loading") }}</p>
        <p v-else-if="!hasVersions" class="versions-empty">
          {{ t("versions.empty") }}
        </p>

        <div v-else class="versions-split">
          <section class="versions-list-section">
            <h3 class="versions-list-title">{{ t("versions.history") }}</h3>
            <ul class="versions-list">
              <li v-for="version in versions" :key="version.id">
                <button
                  class="versions-item"
                  type="button"
                  :aria-pressed="version.id === selectedVersionId"
                  @click="selectVersion(version)"
                >
                  <span class="versions-item__number">
                    {{ t("versions.versionNumber", { number: version.versionNumber }) }}
                  </span>
                  <span class="versions-item__date">{{ formatDate(version.createdAt) }}</span>
                  <span v-if="version.authorName" class="versions-item__date">
                    {{ version.authorName }}
                  </span>
                  <span v-if="version.comment" class="versions-item__comment">
                    {{ version.comment }}
                  </span>
                  <span v-else class="versions-item__comment is-muted">
                    {{ t("versions.noComment") }}
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <section v-if="selectedVersion" class="versions-viewer">
            <div class="versions-viewer__toolbar">
              <div class="versions-viewer__tabs">
                <button
                  class="btn"
                  :class="{ 'btn-primary': viewMode === 'preview' }"
                  type="button"
                  @click="viewMode = 'preview'"
                >
                  {{ t("library.preview") }}
                </button>
                <button
                  class="btn"
                  :class="{ 'btn-primary': viewMode === 'source' }"
                  type="button"
                  @click="viewMode = 'source'"
                >
                  {{ t("library.versionSource") }}
                </button>
              </div>
              <div v-if="canMutate" class="versions-viewer__actions">
                <button
                  class="btn"
                  type="button"
                  @click="requestRestore(selectedVersion)"
                >
                  {{ t("versions.restore") }}
                </button>
                <button
                  class="btn versions-viewer__delete"
                  type="button"
                  @click="requestDelete(selectedVersion)"
                >
                  {{ t("app.delete") }}
                </button>
              </div>
            </div>

            <p v-if="viewMode === 'preview' && previewError" class="versions-error">
              {{ previewError }}
            </p>
            <p
              v-else-if="viewMode === 'preview' && previewRendering"
              class="versions-empty"
            >
              {{ t("library.previewLoading") }}
            </p>
            <div
              v-else-if="viewMode === 'preview' && previewMarkup"
              class="versions-preview"
              v-html="previewMarkup"
            />
            <p v-else-if="viewMode === 'preview'" class="versions-empty">
              {{ t("library.previewEmpty") }}
            </p>
            <pre v-else class="versions-source">{{ selectedVersion.source }}</pre>
          </section>
        </div>
      </template>
    </div>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.versions-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.versions-save {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: end;
}

.versions-save__btn {
  align-self: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.field-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.versions-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.88rem;
}

.versions-split {
  display: grid;
  grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  gap: 12px;
  min-height: 280px;
}

.versions-list-section,
.versions-viewer {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.versions-list-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.versions-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.versions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(50vh, 420px);
  overflow: auto;
}

.versions-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.versions-item[aria-pressed="true"] {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
}

.versions-item__number {
  font-weight: 600;
  font-size: 0.9rem;
}

.versions-item__date {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.versions-item__comment {
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.versions-item__comment.is-muted {
  color: var(--text-muted);
  font-style: italic;
}

.versions-viewer__toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
}

.versions-viewer__tabs,
.versions-viewer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.versions-viewer__delete {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
}

.versions-preview,
.versions-source {
  margin: 0;
  min-height: 180px;
  max-height: min(50vh, 420px);
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.versions-preview {
  padding: 12px;
}

.versions-preview :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}

.versions-source {
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 720px) {
  .versions-save,
  .versions-split {
    grid-template-columns: 1fr;
  }
}
</style>
