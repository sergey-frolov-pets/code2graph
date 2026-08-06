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
const pushFlatSections = computed(() => buildFlatSections(props.sections));
const pullFlatSections = computed(() => buildFlatSections(props.serverSections));
const importFlatSections = computed(() =>
  props.importBundle
    ? buildFlatSections(props.importBundle.sections)
    : [],
);
const importDiagrams = computed(() => props.importBundle?.diagrams ?? []);

const hasExportSelection = computed(
  () => exportSectionIds.value.size > 0 || exportDiagramIds.value.size > 0,
);
const hasPushSelection = computed(
  () => pushSectionIds.value.size > 0 || pushDiagramIds.value.size > 0,
);
const hasPullSelection = computed(
  () => pullSectionIds.value.size > 0 || pullDiagramIds.value.size > 0,
);
const hasImportSelection = computed(
  () => importSectionIds.value.size > 0 || importDiagramIds.value.size > 0,
);

function togglePushSection(id: string, checked: boolean): void {
  const next = new Set(pushSectionIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  pushSectionIds.value = next;
}

function togglePushDiagram(id: string, checked: boolean): void {
  const next = new Set(pushDiagramIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  pushDiagramIds.value = next;
}

function togglePullSection(id: string, checked: boolean): void {
  const next = new Set(pullSectionIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  pullSectionIds.value = next;
}

function togglePullDiagram(id: string, checked: boolean): void {
  const next = new Set(pullDiagramIds.value);
  if (checked) next.add(id);
  else next.delete(id);
  pullDiagramIds.value = next;
}

function selectAllPush(): void {
  pushSectionIds.value = new Set(props.sections.map((section) => section.id));
  pushDiagramIds.value = new Set(props.diagrams.map((diagram) => diagram.id));
}

function deselectAllPush(): void {
  pushSectionIds.value = new Set();
  pushDiagramIds.value = new Set();
}

function selectAllPull(): void {
  pullSectionIds.value = new Set(
    props.serverSections.map((section) => section.id),
  );
  pullDiagramIds.value = new Set(
    props.serverDiagrams.map((diagram) => diagram.id),
  );
}

function deselectAllPull(): void {
  pullSectionIds.value = new Set();
  pullDiagramIds.value = new Set();
}

function onPushClick(): void {
  emit("push-to-server", {
    sectionIds: pushSectionIds.value,
    diagramIds: pushDiagramIds.value,
  });
}

function onPullClick(): void {
  emit("pull-from-server", {
    sectionIds: pullSectionIds.value,
    diagramIds: pullDiagramIds.value,
  });
}

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
    <section v-if="canSyncOnline" class="library-transfer__panel">
      <h3 class="library-transfer__title">{{ t("library.syncTitle") }}</h3>
      <p class="library-transfer__hint">{{ t("library.syncHint") }}</p>

      <div class="library-transfer__sync-grid">
        <div class="library-transfer__sync-block">
          <h4 class="library-transfer__subtitle">{{ t("library.syncLocalSource") }}</h4>
          <div class="library-transfer__lists">
            <div class="library-transfer__list-block">
              <h4 class="library-transfer__subtitle">{{ t("library.sections") }}</h4>
              <label
                v-for="section in pushFlatSections"
                :key="section.id"
                class="library-transfer__item"
              >
                <input
                  type="checkbox"
                  :checked="pushSectionIds.has(section.id)"
                  @change="
                    togglePushSection(
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
              <label
                v-for="diagram in diagrams"
                :key="diagram.id"
                class="library-transfer__item"
              >
                <input
                  type="checkbox"
                  :checked="pushDiagramIds.has(diagram.id)"
                  @change="
                    togglePushDiagram(
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
            <button class="btn" type="button" @click="selectAllPush">
              {{ t("library.selectAll") }}
            </button>
            <button class="btn" type="button" @click="deselectAllPush">
              {{ t("library.deselectAll") }}
            </button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="!hasPushSelection || isProcessing"
              @click="onPushClick"
            >
              {{ isProcessing ? t("app.loading") : t("library.pushToServer") }}
            </button>
          </div>
        </div>

        <div class="library-transfer__sync-block">
          <h4 class="library-transfer__subtitle">{{ t("library.syncServerSource") }}</h4>
          <div class="library-transfer__lists">
            <div class="library-transfer__list-block">
              <h4 class="library-transfer__subtitle">{{ t("library.sections") }}</h4>
              <p
                v-if="pullFlatSections.length === 0"
                class="library-transfer__empty"
              >
                {{ t("library.noSections") }}
              </p>
              <label
                v-for="section in pullFlatSections"
                :key="section.id"
                class="library-transfer__item"
              >
                <input
                  type="checkbox"
                  :checked="pullSectionIds.has(section.id)"
                  @change="
                    togglePullSection(
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
              <p
                v-if="serverDiagrams.length === 0"
                class="library-transfer__empty"
              >
                {{ t("library.noResults") }}
              </p>
              <label
                v-for="diagram in serverDiagrams"
                :key="diagram.id"
                class="library-transfer__item"
              >
                <input
                  type="checkbox"
                  :checked="pullDiagramIds.has(diagram.id)"
                  @change="
                    togglePullDiagram(
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
            <button class="btn" type="button" @click="selectAllPull">
              {{ t("library.selectAll") }}
            </button>
            <button class="btn" type="button" @click="deselectAllPull">
              {{ t("library.deselectAll") }}
            </button>
            <button
              class="btn btn-primary"
              type="button"
              :disabled="!hasPullSelection || isProcessing"
              @click="onPullClick"
            >
              {{ isProcessing ? t("app.loading") : t("library.pullFromServer") }}
            </button>
          </div>
        </div>
      </div>
    </section>

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

@media (max-width: 640px) {
  .library-transfer__lists {
    grid-template-columns: 1fr;
  }
}
</style>
