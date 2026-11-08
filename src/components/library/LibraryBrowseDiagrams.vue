<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import { useLocale } from "@/composables/useLocale";
import { LIBRARY_ROW_ESTIMATE_HEIGHT } from "@/constants/library-browse";
import type { DiagramListItemDto, DiagramSortOption } from "@/constants/diagram-library";
import { DIAGRAM_SORT_OPTIONS } from "@/constants/diagram-library";
import { formatDate } from "@/shared/format-date";
import { diagramAllowsWrite, getDiagramFormatLabel } from "@/utils/library-display";

const props = defineProps<{
  diagrams: DiagramListItemDto[];
  allTags: string[];
  isLoading: boolean;
  isLocalLibrary: boolean;
}>();

const searchQuery = defineModel<string>("searchQuery", { required: true });
const tagFilter = defineModel<string>("tagFilter", { required: true });
const minRatingFilter = defineModel<number>("minRatingFilter", { required: true });
const minVotesFilter = defineModel<number>("minVotesFilter", { required: true });
const sortByFilter = defineModel<DiagramSortOption>("sortByFilter", { required: true });

const emit = defineEmits<{
  "diagram-pick": [diagramId: string];
  "filters-change": [];
  "delete-diagram": [payload: { id: string; title: string }];
}>();

const { t } = useLocale();
const listRef = ref<HTMLElement | null>(null);
const filtersOpen = ref(false);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.diagrams.length,
    getScrollElement: () => listRef.value,
    estimateSize: () => LIBRARY_ROW_ESTIMATE_HEIGHT,
    overscan: 8,
  })),
);

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

const activeFilterCount = computed(() => {
  let count = 0;
  if (tagFilter.value) count += 1;
  if (minRatingFilter.value > 0) count += 1;
  if (minVotesFilter.value > 0) count += 1;
  if (sortByFilter.value !== "updated") count += 1;
  return count;
});

const sortOptions = computed(() =>
  props.isLocalLibrary
    ? DIAGRAM_SORT_OPTIONS.filter((option) => option === "updated")
    : DIAGRAM_SORT_OPTIONS,
);

watch(
  () => props.isLocalLibrary,
  (local) => {
    if (local && sortByFilter.value !== "updated") {
      sortByFilter.value = "updated";
      emit("filters-change");
    }
  },
  { immediate: true },
);

const filtersLabel = computed(() =>
  activeFilterCount.value > 0
    ? `${t("library.filters")} (${activeFilterCount.value})`
    : t("library.filters"),
);

function onFiltersChange(): void {
  emit("filters-change");
}

function diagramAt(index: number): DiagramListItemDto {
  return props.diagrams[index]!;
}

function measureRow(node: unknown): void {
  if (node instanceof Element) {
    rowVirtualizer.value.measureElement(node);
  }
}

function metaLine(diagram: DiagramListItemDto): string {
  const parts = [
    getDiagramFormatLabel(diagram.language),
    formatDate(diagram.updatedAt),
  ];
  if (diagram.authorName) {
    parts.push(diagram.authorName);
  }
  if (diagram.avgRating) {
    parts.push(diagram.avgRating.toFixed(1));
  }
  return parts.join(" · ");
}

function onDelete(diagram: DiagramListItemDto): void {
  emit("delete-diagram", { id: diagram.id, title: diagram.title });
}
</script>

<template>
  <div
    class="library-step"
    :style="{ '--library-row-height': `${LIBRARY_ROW_ESTIMATE_HEIGHT}px` }"
  >
    <div class="library-filters">
      <div class="library-filters__bar">
        <input
          v-model="searchQuery"
          class="select library-search"
          type="search"
          :placeholder="t('library.searchPlaceholder')"
        />
        <button
          class="btn library-filters__toggle"
          type="button"
          :aria-expanded="filtersOpen"
          @click="filtersOpen = !filtersOpen"
        >
          {{ filtersLabel }}
        </button>
      </div>
      <div v-show="filtersOpen" class="library-filters__advanced">
        <select v-model="tagFilter" class="select" @change="onFiltersChange()">
          <option value="">{{ t("library.filterByTag") }}</option>
          <option v-for="tag in allTags" :key="tag" :value="tag">
            {{ tag }}
          </option>
        </select>
        <label v-if="!isLocalLibrary" class="library-filter-field">
          <span>{{ t("library.filterMinRating") }}</span>
          <select
            v-model.number="minRatingFilter"
            class="select"
            @change="onFiltersChange()"
          >
            <option :value="0">{{ t("library.filterAny") }}</option>
            <option v-for="star in 5" :key="star" :value="star">{{ star }}+</option>
          </select>
        </label>
        <label v-if="!isLocalLibrary" class="library-filter-field">
          <span>{{ t("library.filterMinVotes") }}</span>
          <input
            v-model.number="minVotesFilter"
            class="select"
            type="number"
            min="0"
            step="1"
            @change="onFiltersChange()"
          />
        </label>
        <label class="library-filter-field">
          <span>{{ t("library.sortBy") }}</span>
          <select v-model="sortByFilter" class="select" @change="onFiltersChange()">
            <option v-for="option in sortOptions" :key="option" :value="option">
              {{ t(`library.sortBy.${option}`) }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div ref="listRef" class="library-step__content library-step__content--virtual">
      <LoadingState v-if="isLoading" :message="t('app.loading')" />
      <EmptyState
        v-else-if="diagrams.length === 0"
        :title="t('library.noResults')"
        :description="t('library.noResultsHint')"
      />
      <div
        v-else
        class="library-virtual-list"
        :style="{ height: `${rowVirtualizer.getTotalSize()}px` }"
      >
        <div
          v-for="virtualRow in virtualRows"
          :key="String(virtualRow.key)"
          :ref="measureRow"
          class="library-virtual-list__row library-browse-row list-virtual-row"
          :data-index="virtualRow.index"
          :style="{
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <button
            class="library-row library-row--compact"
            type="button"
            @click="emit('diagram-pick', diagramAt(virtualRow.index).id)"
          >
            <span class="library-row__main">
              <span class="library-row__title">
                {{ diagramAt(virtualRow.index).title }}
              </span>
              <span class="library-row__meta">
                {{ metaLine(diagramAt(virtualRow.index)) }}
              </span>
              <span
                v-if="diagramAt(virtualRow.index).description"
                class="library-row__description"
              >
                {{ diagramAt(virtualRow.index).description }}
              </span>
            </span>
            <span class="library-row__chevron" aria-hidden="true">›</span>
          </button>
          <IconButton
            v-if="diagramAllowsWrite(diagramAt(virtualRow.index))"
            class="library-browse-row__delete"
            :label="t('app.delete')"
            @click="onDelete(diagramAt(virtualRow.index))"
          >
            <ActionIcon name="trash" />
          </IconButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.library-virtual-list {
  position: relative;
  width: 100%;
}

.library-virtual-list__row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.library-browse-row {
  display: flex;
  align-items: stretch;
  height: var(--library-row-height);
  contain-intrinsic-size: 0 var(--library-row-height);
  border-bottom: 1px solid var(--border);
}

.library-browse-row .library-row {
  height: 100%;
  border-bottom: 0;
  padding: 8px 12px;
}

.library-row--compact .library-row__title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.library-browse-row__delete {
  align-self: center;
  margin-right: 8px;
}
</style>
