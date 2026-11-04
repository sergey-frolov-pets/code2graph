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

const props = defineProps<{
  sections: SectionDto[];
  diagrams: DiagramDto[];
  serverSections: SectionDto[];
  serverDiagrams: DiagramDto[];
  canSyncOnline: boolean;
  importBundle: LibraryExportBundle | null;
  isProcessing: boolean;
}>();

const emit = defineEmits<{
  export: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  import: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "load-import-file": [file: File];
  "push-to-server": [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "pull-from-server": [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
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

function onImportFileChange(event: Event): void {
  importError.value = "";
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  emit("load-import-file", file);
  input.value = "";
}

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

@media (max-width: 640px) {
  .library-transfer__sync-grid {
    grid-template-columns: 1fr;
  }
}
</style>
