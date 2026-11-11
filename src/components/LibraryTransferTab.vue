<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LibraryTransferCheckList from "@/components/library/LibraryTransferCheckList.vue";
import { useLocale } from "@/composables/useLocale";
import type {
  DiagramDto,
  LibraryExportBundle,
  SectionDto,
} from "@/constants/diagram-library";
import { buildSectionTree, flattenSections } from "@shared/section-tree";
import type {
  AppBackupFile,
  AppBackupRestoreMode,
  DiagramBackupDiff,
  SnippetBackupDiff,
} from "@/utils/app-backup";

const props = defineProps<{
  sections: SectionDto[];
  diagrams: DiagramDto[];
  serverSections: SectionDto[];
  serverDiagrams: DiagramDto[];
  canSyncOnline: boolean;
  importBundle: LibraryExportBundle | null;
  pendingRestore: AppBackupFile | null;
  syncBackup: AppBackupFile | null;
  syncDiagramDiffs: DiagramBackupDiff[];
  syncSnippetDiffs: SnippetBackupDiff[];
  backupError: string;
  isProcessing: boolean;
}>();

const emit = defineEmits<{
  export: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  import: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "load-import-file": [file: File];
  "push-to-server": [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "pull-from-server": [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "save-backup": [];
  "restore-file": [file: File];
  "restore-cancel": [];
  "restore-confirm": [mode: AppBackupRestoreMode];
  "sync-file": [file: File];
  "sync-apply": [payload: { diagramIds: Set<string>; snippetIds: Set<string> }];
}>();

const { t } = useLocale();

const exportSectionIds = ref<Set<string>>(new Set());
const exportDiagramIds = ref<Set<string>>(new Set());
const pushSectionIds = ref<Set<string>>(new Set());
const pushDiagramIds = ref<Set<string>>(new Set());
const pullSectionIds = ref<Set<string>>(new Set());
const pullDiagramIds = ref<Set<string>>(new Set());
const importSectionIds = ref<Set<string>>(new Set());
const importDiagramIds = ref<Set<string>>(new Set());
const importError = ref("");
const selectedSyncDiagramIds = ref<Set<string>>(new Set());
const selectedSyncSnippetIds = ref<Set<string>>(new Set());
const restoreFileInput = ref<HTMLInputElement | null>(null);
const syncFileInput = ref<HTMLInputElement | null>(null);

const exportFlatSections = computed(() =>
  flattenSections(buildSectionTree(props.sections)),
);
const pushFlatSections = computed(() => exportFlatSections.value);
const pullFlatSections = computed(() =>
  flattenSections(buildSectionTree(props.serverSections)),
);
const importFlatSections = computed(() =>
  props.importBundle
    ? flattenSections(buildSectionTree(props.importBundle.sections))
    : [],
);
const importDiagrams = computed(() => props.importBundle?.diagrams ?? []);

const syncHasDiffs = computed(
  () => props.syncDiagramDiffs.length > 0 || props.syncSnippetDiffs.length > 0,
);
const canCopySyncSelection = computed(
  () => selectedSyncDiagramIds.value.size > 0 || selectedSyncSnippetIds.value.size > 0,
);

function formatStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function sectionTitle(sectionId: string | null): string {
  if (!sectionId || !props.syncBackup) {
    return t("library.noSection");
  }
  return (
    props.syncBackup.library.sections.find((section) => section.id === sectionId)?.title ??
    t("library.noSection")
  );
}

function readChosenFile(event: Event): File | null {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  input.value = "";
  return file;
}

function onRestoreFileChange(event: Event): void {
  const file = readChosenFile(event);
  if (!file) return;
  emit("restore-file", file);
}

function onSyncFileChange(event: Event): void {
  const file = readChosenFile(event);
  if (!file) return;
  emit("sync-file", file);
}

function toggleSyncDiagram(id: string, checked: boolean): void {
  const next = new Set(selectedSyncDiagramIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  selectedSyncDiagramIds.value = next;
}

function toggleSyncSnippet(id: string, checked: boolean): void {
  const next = new Set(selectedSyncSnippetIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  selectedSyncSnippetIds.value = next;
}

function selectAllSyncDiagrams(): void {
  selectedSyncDiagramIds.value = new Set(
    props.syncDiagramDiffs.map((diff) => diff.diagram.id),
  );
}

function selectAllSyncSnippets(): void {
  selectedSyncSnippetIds.value = new Set(
    props.syncSnippetDiffs.map((diff) => diff.snippet.id),
  );
}

function onSyncApply(): void {
  emit("sync-apply", {
    diagramIds: selectedSyncDiagramIds.value,
    snippetIds: selectedSyncSnippetIds.value,
  });
}

function onImportFileChange(event: Event): void {
  importError.value = "";
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  emit("load-import-file", file);
  input.value = "";
}

watch(
  () => props.syncDiagramDiffs,
  (diffs) => {
    selectedSyncDiagramIds.value = new Set(diffs.map((diff) => diff.diagram.id));
  },
);

watch(
  () => props.syncSnippetDiffs,
  (diffs) => {
    selectedSyncSnippetIds.value = new Set(diffs.map((diff) => diff.snippet.id));
  },
);

watch(
  () => props.importBundle,
  (bundle) => {
    if (!bundle) {
      importSectionIds.value = new Set();
      importDiagramIds.value = new Set();
      return;
    }
    importSectionIds.value = new Set(bundle.sections.map((section) => section.id));
    importDiagramIds.value = new Set(bundle.diagrams.map((diagram) => diagram.id));
  },
);
</script>

<template>
  <div class="library-transfer">
    <section class="library-transfer__panel">
      <h3 class="library-transfer__title">{{ t("library.backupTitle") }}</h3>
      <p class="library-transfer__hint">{{ t("library.backupHint") }}</p>

      <div class="library-transfer__actions">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="isProcessing"
          @click="emit('save-backup')"
        >
          {{ t("library.backupSave") }}
        </button>
        <button
          class="btn"
          type="button"
          :disabled="isProcessing"
          @click="restoreFileInput?.click()"
        >
          {{ t("library.backupRestore") }}
        </button>
        <button
          class="btn"
          type="button"
          :disabled="isProcessing"
          @click="syncFileInput?.click()"
        >
          {{ t("library.backupSync") }}
        </button>
        <input
          ref="restoreFileInput"
          class="library-backup__file-input"
          type="file"
          accept="application/json,.json"
          @change="onRestoreFileChange"
        />
        <input
          ref="syncFileInput"
          class="library-backup__file-input"
          type="file"
          accept="application/json,.json"
          @change="onSyncFileChange"
        />
      </div>

      <p v-if="backupError" class="library-error">{{ backupError }}</p>

      <div
        v-if="pendingRestore"
        class="library-backup__confirm"
        role="alertdialog"
        aria-labelledby="library-backup-confirm-title"
      >
        <h4 id="library-backup-confirm-title" class="library-transfer__subtitle">
          {{ t("library.backupRestore") }}
        </h4>
        <p class="library-transfer__hint">
          {{
            t("library.backupRestoreConfirm", {
              date: formatStamp(pendingRestore.exportedAt),
            })
          }}
        </p>
        <div class="library-transfer__actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="isProcessing"
            @click="emit('restore-confirm', 'save-and-replace')"
          >
            {{ t("library.backupSaveAndReplace") }}
          </button>
          <button
            class="btn"
            type="button"
            :disabled="isProcessing"
            @click="emit('restore-confirm', 'replace')"
          >
            {{ t("library.backupReplace") }}
          </button>
          <button
            class="btn"
            type="button"
            :disabled="isProcessing"
            @click="emit('restore-cancel')"
          >
            {{ t("library.backupCancel") }}
          </button>
        </div>
      </div>

      <div v-if="syncBackup" class="library-backup__sync">
        <p v-if="!syncHasDiffs" class="library-transfer__hint">
          {{ t("library.backupSyncEmpty") }}
        </p>
        <template v-else>
          <div v-if="syncDiagramDiffs.length > 0" class="library-backup__group">
            <div class="library-backup__group-head">
              <h4 class="library-transfer__subtitle">{{ t("library.backupSyncDiagrams") }}</h4>
              <button class="btn" type="button" @click="selectAllSyncDiagrams">
                {{ t("library.backupSelectDiagrams") }}
              </button>
            </div>
            <label
              v-for="diff in syncDiagramDiffs"
              :key="diff.diagram.id"
              class="library-transfer__item"
            >
              <input
                type="checkbox"
                :checked="selectedSyncDiagramIds.has(diff.diagram.id)"
                :disabled="isProcessing"
                @change="
                  toggleSyncDiagram(
                    diff.diagram.id,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span>
                <strong>{{ diff.diagram.title }}</strong>
                — {{ sectionTitle(diff.diagram.sectionId) }}
                — {{
                  diff.kind === "new"
                    ? t("library.backupSyncNew")
                    : t("library.backupSyncChanged")
                }}
                — {{ t("library.backupUpdatedAt", { date: formatStamp(diff.diagram.updatedAt) }) }}
              </span>
            </label>
          </div>

          <div v-if="syncSnippetDiffs.length > 0" class="library-backup__group">
            <div class="library-backup__group-head">
              <h4 class="library-transfer__subtitle">{{ t("library.backupSyncSnippets") }}</h4>
              <button class="btn" type="button" @click="selectAllSyncSnippets">
                {{ t("library.backupSelectSnippets") }}
              </button>
            </div>
            <label
              v-for="diff in syncSnippetDiffs"
              :key="diff.snippet.id"
              class="library-transfer__item"
            >
              <input
                type="checkbox"
                :checked="selectedSyncSnippetIds.has(diff.snippet.id)"
                :disabled="isProcessing"
                @change="
                  toggleSyncSnippet(
                    diff.snippet.id,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span>
                <strong>{{ diff.snippet.title }}</strong>
                — {{
                  diff.kind === "new"
                    ? t("library.backupSyncNew")
                    : t("library.backupSyncChanged")
                }}
                — {{ t("library.backupUpdatedAt", { date: formatStamp(diff.snippet.updatedAt) }) }}
              </span>
            </label>
          </div>

          <div class="library-transfer__actions">
            <button
              class="btn btn-primary"
              type="button"
              :disabled="isProcessing || !canCopySyncSelection"
              @click="onSyncApply"
            >
              {{ t("library.backupSyncApply") }}
            </button>
          </div>
        </template>
      </div>
    </section>

    <section v-if="canSyncOnline" class="library-transfer__panel">
      <h3 class="library-transfer__title">{{ t("library.syncTitle") }}</h3>
      <p class="library-transfer__hint">{{ t("library.syncHint") }}</p>

      <div class="library-transfer__sync-grid">
        <div class="library-transfer__sync-block">
          <h4 class="library-transfer__subtitle">{{ t("library.syncLocalSource") }}</h4>
          <LibraryTransferCheckList
            v-model:selected-section-ids="pushSectionIds"
            v-model:selected-diagram-ids="pushDiagramIds"
            :sections="pushFlatSections"
            :diagrams="diagrams"
            :is-processing="isProcessing"
            :action-label="t('library.pushToServer')"
            @submit="emit('push-to-server', $event)"
          />
        </div>

        <div class="library-transfer__sync-block">
          <h4 class="library-transfer__subtitle">{{ t("library.syncServerSource") }}</h4>
          <LibraryTransferCheckList
            v-model:selected-section-ids="pullSectionIds"
            v-model:selected-diagram-ids="pullDiagramIds"
            :sections="pullFlatSections"
            :diagrams="serverDiagrams"
            :is-processing="isProcessing"
            :action-label="t('library.pullFromServer')"
            show-empty-states
            @submit="emit('pull-from-server', $event)"
          />
        </div>
      </div>
    </section>

    <section class="library-transfer__panel">
      <h3 class="library-transfer__title">{{ t("library.exportTitle") }}</h3>
      <p class="library-transfer__hint">{{ t("library.exportHint") }}</p>

      <LibraryTransferCheckList
        v-model:selected-section-ids="exportSectionIds"
        v-model:selected-diagram-ids="exportDiagramIds"
        :sections="exportFlatSections"
        :diagrams="diagrams"
        :is-processing="isProcessing"
        :action-label="t('library.exportAction')"
        show-empty-states
        @submit="emit('export', $event)"
      />
    </section>

    <section class="library-transfer__panel">
      <h3 class="library-transfer__title">{{ t("library.importTitle") }}</h3>
      <p class="library-transfer__hint">{{ t("library.importHint") }}</p>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.importFile") }}</span>
        <input
          type="file"
          accept="application/json,.json"
          @change="onImportFileChange"
        />
      </label>

      <p v-if="importError" class="library-error">{{ importError }}</p>
      <p v-else-if="importBundle" class="library-transfer__hint">
        {{ t("library.importLoaded", { date: importBundle.exportedAt }) }}
      </p>

      <LibraryTransferCheckList
        v-if="importBundle"
        v-model:selected-section-ids="importSectionIds"
        v-model:selected-diagram-ids="importDiagramIds"
        :sections="importFlatSections"
        :diagrams="importDiagrams"
        :is-processing="isProcessing"
        :action-label="t('library.importAction')"
        show-empty-states
        @submit="emit('import', $event)"
      />
    </section>
  </div>
</template>

<style scoped>
.library-transfer {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  width: 100%;
}

.library-transfer__panel {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  padding: 12px;
}

.library-transfer__title {
  margin: 0 0 6px;
  font-size: 0.95rem;
}

.library-transfer__subtitle {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.library-transfer__hint {
  margin: 0 0 10px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-error {
  margin: 0 0 10px;
  color: var(--danger);
  font-size: 0.9rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.settings-field__label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.library-transfer__sync-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.library-transfer__sync-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 8px;
}

.library-transfer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.library-transfer__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.85rem;
  cursor: pointer;
}

.library-backup__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.library-backup__confirm,
.library-backup__sync {
  margin-top: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 8px;
}

.library-backup__group + .library-backup__group {
  margin-top: 12px;
}

.library-backup__group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

@media (max-width: 640px) {
  .library-transfer__sync-grid {
    grid-template-columns: 1fr;
  }
}
</style>
