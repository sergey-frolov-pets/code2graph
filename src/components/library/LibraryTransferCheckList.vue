<script setup lang="ts">
import { computed } from "vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import type { DiagramDto } from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";
import type { FlatSectionOption } from "@shared/section-tree";

const props = defineProps<{
  sections: FlatSectionOption[];
  diagrams: DiagramDto[];
  selectedSectionIds: Set<string>;
  selectedDiagramIds: Set<string>;
  isProcessing: boolean;
  actionLabel: string;
  showEmptyStates?: boolean;
}>();

const emit = defineEmits<{
  "update:selectedSectionIds": [value: Set<string>];
  "update:selectedDiagramIds": [value: Set<string>];
  submit: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
}>();

const { t } = useLocale();

const hasSelection = computed(
  () => props.selectedSectionIds.size > 0 || props.selectedDiagramIds.size > 0,
);

function toggleSection(id: string, checked: boolean): void {
  const next = new Set(props.selectedSectionIds);
  if (checked) next.add(id);
  else next.delete(id);
  emit("update:selectedSectionIds", next);
}

function toggleDiagram(id: string, checked: boolean): void {
  const next = new Set(props.selectedDiagramIds);
  if (checked) next.add(id);
  else next.delete(id);
  emit("update:selectedDiagramIds", next);
}

function selectAll(): void {
  emit(
    "update:selectedSectionIds",
    new Set(props.sections.map((section) => section.id)),
  );
  emit(
    "update:selectedDiagramIds",
    new Set(props.diagrams.map((diagram) => diagram.id)),
  );
}

function deselectAll(): void {
  emit("update:selectedSectionIds", new Set());
  emit("update:selectedDiagramIds", new Set());
}

function onSubmit(): void {
  emit("submit", {
    sectionIds: props.selectedSectionIds,
    diagramIds: props.selectedDiagramIds,
  });
}
</script>

<template>
  <div class="library-transfer__lists">
    <div class="library-transfer__list-block">
      <h4 class="library-transfer__subtitle">{{ t("library.sections") }}</h4>
      <EmptyState
        v-if="showEmptyStates && sections.length === 0"
        class="library-transfer__empty-state"
        :title="t('library.noSections')"
      />
      <label
        v-for="section in sections"
        :key="section.id"
        class="library-transfer__item"
      >
        <input
          type="checkbox"
          :checked="selectedSectionIds.has(section.id)"
          @change="
            toggleSection(
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
      <EmptyState
        v-if="showEmptyStates && diagrams.length === 0"
        class="library-transfer__empty-state"
        :title="t('library.noResults')"
      />
      <label
        v-for="diagram in diagrams"
        :key="diagram.id"
        class="library-transfer__item"
      >
        <input
          type="checkbox"
          :checked="selectedDiagramIds.has(diagram.id)"
          @change="
            toggleDiagram(
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
    <button class="btn" type="button" @click="selectAll">
      {{ t("library.selectAll") }}
    </button>
    <button class="btn" type="button" @click="deselectAll">
      {{ t("library.deselectAll") }}
    </button>
    <button
      class="btn btn-primary"
      type="button"
      :disabled="!hasSelection || isProcessing"
      @click="onSubmit"
    >
      {{ isProcessing ? t("app.loading") : actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.library-transfer__subtitle {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--text-muted);
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

.library-transfer__empty-state {
  padding: 12px 8px;
}

.library-transfer__empty-state :deep(.empty-state__title) {
  font-size: 0.85rem;
}

.library-transfer__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 640px) {
  .library-transfer__lists {
    grid-template-columns: 1fr;
  }
}
</style>
