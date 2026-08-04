<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type {
  DiagramDto,
  LibraryExportBundle,
  SectionDto,
} from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  sections: SectionDto[];
  diagrams: DiagramDto[];
  importBundle: LibraryExportBundle | null;
  isProcessing: boolean;
}>();

const emit = defineEmits<{
  export: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  import: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "load-import-file": [file: File];
}>();

const { t } = useLocale();

const exportSectionIds = ref<Set<string>>(new Set());
const exportDiagramIds = ref<Set<string>>(new Set());
const importSectionIds = ref<Set<string>>(new Set());
const importDiagramIds = ref<Set<string>>(new Set());
const importError = ref("");

function buildFlatSections(sections: SectionDto[]) {
  const result: Array<{ id: string; title: string; depth: number }> = [];

  function walk(items: SectionDto[], depth = 0): void {
    for (const item of items) {
      result.push({ id: item.id, title: item.title, depth });
      if (item.children?.length) {
        walk(item.children, depth + 1);
      }
    }
  }

  const byId = new Map(
    sections.map((section) => [
      section.id,
      { ...section, children: [] as SectionDto[] },
    ]),
  );
  const roots: SectionDto[] = [];
  for (const section of byId.values()) {
    if (section.parentId && byId.has(section.parentId)) {
      byId.get(section.parentId)!.children!.push(section);
    } else {
      roots.push(section);
    }
  }
  walk(roots);
  return result;
}

const exportFlatSections = computed(() => buildFlatSections(props.sections));
const importFlatSections = computed(() =>
  props.importBundle
    ? buildFlatSections(props.importBundle.sections)
    : [],
);
const importDiagrams = computed(() => props.importBundle?.diagrams ?? []);

const hasExportSelection = computed(
  () => exportSectionIds.value.size > 0 || exportDiagramIds.value.size > 0,
);
const hasImportSelection = computed(
  () => importSectionIds.value.size > 0 || importDiagramIds.value.size > 0,
);

function toggleExportSection(id: string, checked: boolean): void {
  const next = new Set(exportSectionIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  exportSectionIds.value = next;
}

function toggleExportDiagram(id: string, checked: boolean): void {
  const next = new Set(exportDiagramIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  exportDiagramIds.value = next;
}

function toggleImportSection(id: string, checked: boolean): void {
  const next = new Set(importSectionIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  importSectionIds.value = next;
}

function toggleImportDiagram(id: string, checked: boolean): void {
  const next = new Set(importDiagramIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  importDiagramIds.value = next;
}

function selectAllExport(): void {
  exportSectionIds.value = new Set(props.sections.map((section) => section.id));
  exportDiagramIds.value = new Set(props.diagrams.map((diagram) => diagram.id));
}

function deselectAllExport(): void {
  exportSectionIds.value = new Set();
  exportDiagramIds.value = new Set();
}

function selectAllImport(): void {
  if (!props.importBundle) return;
  importSectionIds.value = new Set(
    props.importBundle.sections.map((section) => section.id),
  );
  importDiagramIds.value = new Set(
    props.importBundle.diagrams.map((diagram) => diagram.id),
  );
}

function deselectAllImport(): void {
  importSectionIds.value = new Set();
  importDiagramIds.value = new Set();
}

function onExportClick(): void {
  emit("export", {
    sectionIds: exportSectionIds.value,
    diagramIds: exportDiagramIds.value,
  });
}

function onImportClick(): void {
  emit("import", {
    sectionIds: importSectionIds.value,
    diagramIds: importDiagramIds.value,
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
  () => props.importBundle,
  (bundle) => {
    if (!bundle) {
      importSectionIds.value = new Set();
      importDiagramIds.value = new Set();
      return;
    }
    selectAllImport();
  },
);
</script>

<template>
  <div class="library-transfer">
    <section class="library-transfer__panel">
      <h3 class="library-transfer__title">{{ t("library.exportTitle") }}</h3>
      <p class="library-transfer__hint">{{ t("library.exportHint") }}</p>

      <div class="library-transfer__lists">
        <div class="library-transfer__list-block">
          <h4 class="library-transfer__subtitle">{{ t("library.sections") }}</h4>
          <p v-if="exportFlatSections.length === 0" class="library-transfer__empty">
            {{ t("library.noSections") }}
          </p>
          <label
            v-for="section in exportFlatSections"
            :key="section.id"
            class="library-transfer__item"
          >
            <input
              type="checkbox"
              :checked="exportSectionIds.has(section.id)"
              @change="
                toggleExportSection(
                  section.id,
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            <span :style="{ paddingLeft: `${section.depth * 12}px` }">
              {{ section.title }}
            </span>
          </label>
        </div>

        <div class="library-transfer__list-block">
          <h4 class="library-transfer__subtitle">{{ t("library.diagrams") }}</h4>
          <p v-if="diagrams.length === 0" class="library-transfer__empty">
            {{ t("library.noResults") }}
          </p>
          <label
            v-for="diagram in diagrams"
            :key="diagram.id"
            class="library-transfer__item"
          >
            <input
              type="checkbox"
              :checked="exportDiagramIds.has(diagram.id)"
              @change="
                toggleExportDiagram(
                  diagram.id,
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
            <span>{{ diagram.title }}</span>
          </label>
        </div>
      </div>

      <div class="library-transfer__actions">
        <button class="btn" type="button" @click="selectAllExport">
          {{ t("library.selectAll") }}
        </button>
        <button class="btn" type="button" @click="deselectAllExport">
          {{ t("library.deselectAll") }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!hasExportSelection || isProcessing"
          @click="onExportClick"
        >
          {{ isProcessing ? t("app.loading") : t("library.exportAction") }}
        </button>
      </div>
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

      <template v-if="importBundle">
        <div class="library-transfer__lists">
          <div class="library-transfer__list-block">
            <h4 class="library-transfer__subtitle">{{ t("library.sections") }}</h4>
            <p
              v-if="importFlatSections.length === 0"
              class="library-transfer__empty"
            >
              {{ t("library.noSections") }}
            </p>
            <label
              v-for="section in importFlatSections"
              :key="section.id"
              class="library-transfer__item"
            >
              <input
                type="checkbox"
                :checked="importSectionIds.has(section.id)"
                @change="
                  toggleImportSection(
                    section.id,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span :style="{ paddingLeft: `${section.depth * 12}px` }">
                {{ section.title }}
              </span>
            </label>
          </div>

          <div class="library-transfer__list-block">
            <h4 class="library-transfer__subtitle">{{ t("library.diagrams") }}</h4>
            <p v-if="importDiagrams.length === 0" class="library-transfer__empty">
              {{ t("library.noResults") }}
            </p>
            <label
              v-for="diagram in importDiagrams"
              :key="diagram.id"
              class="library-transfer__item"
            >
              <input
                type="checkbox"
                :checked="importDiagramIds.has(diagram.id)"
                @change="
                  toggleImportDiagram(
                    diagram.id,
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
              <span>{{ diagram.title }}</span>
            </label>
          </div>
        </div>

        <div class="library-transfer__actions">
          <button class="btn" type="button" @click="selectAllImport">
            {{ t("library.selectAll") }}
          </button>
          <button class="btn" type="button" @click="deselectAllImport">
            {{ t("library.deselectAll") }}
          </button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!hasImportSelection || isProcessing"
            @click="onImportClick"
          >
            {{ isProcessing ? t("app.loading") : t("library.importAction") }}
          </button>
        </div>
      </template>
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

.library-transfer__lists {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.library-transfer__list-block {
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  padding: 8px;
  max-height: min(180px, 24dvh);
  overflow: auto;
}

.library-transfer__item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
  font-size: 0.85rem;
  cursor: pointer;
}

.library-transfer__empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-transfer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

@media (max-width: 640px) {
  .library-transfer__lists {
    grid-template-columns: 1fr;
  }
}
</style>
