<script setup lang="ts">
import { computed, ref } from "vue";
import { useVirtualizer } from "@tanstack/vue-virtual";
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import EmptyState from "@/components/ui/EmptyState.vue";
import LoadingState from "@/components/ui/LoadingState.vue";
import { useLocale } from "@/composables/useLocale";
import { LIBRARY_ROW_ESTIMATE_HEIGHT } from "@/constants/library-browse";
import type { DiagramListItemDto, DiagramSortOption } from "@/constants/diagram-library";
import { DIAGRAM_SORT_OPTIONS } from "@/constants/diagram-library";

const props = defineProps<{
  diagrams: DiagramListItemDto[];
  allTags: string[];
  isLoading: boolean;
}>();

const searchQuery = defineModel<string>("searchQuery", { required: true });
const tagFilter = defineModel<string>("tagFilter", { required: true });
const minRatingFilter = defineModel<number>("minRatingFilter", { required: true });
const minVotesFilter = defineModel<number>("minVotesFilter", { required: true });
const sortByFilter = defineModel<DiagramSortOption>("sortByFilter", { required: true });

const emit = defineEmits<{
  "diagram-pick": [diagramId: string];
  "filters-change": [];
}>();

const { t } = useLocale();
const listRef = ref<HTMLElement | null>(null);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: props.diagrams.length,
    getScrollElement: () => listRef.value,
    estimateSize: () => LIBRARY_ROW_ESTIMATE_HEIGHT,
    overscan: 8,
  })),
);

const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

function onFiltersChange(): void {
  emit("filters-change");
}

function diagramAt(index: number): DiagramListItemDto {
  return props.diagrams[index]!;
}
</script>

<template>
  <div class="library-step">
    <div class="library-filters">
      <input
        v-model="searchQuery"
        class="select library-search"
        type="search"
        :placeholder="t('library.searchPlaceholder')"
      />
      <select v-model="tagFilter" class="select" @change="onFiltersChange()">
        <option value="">{{ t("library.filterByTag") }}</option>
        <option v-for="tag in allTags" :key="tag" :value="tag">
          {{ tag }}
        </option>
      </select>
      <label class="library-filter-field">
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
      <label class="library-filter-field">
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
          <option v-for="option in DIAGRAM_SORT_OPTIONS" :key="option" :value="option">
            {{ t(`library.sortBy.${option}`) }}
          </option>
        </select>
      </label>
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
          class="library-virtual-list__row"
          :style="{
            transform: `translateY(${virtualRow.start}px)`,
          }"
        >
          <button
            class="library-row list-virtual-row"
            type="button"
            @click="emit('diagram-pick', diagramAt(virtualRow.index).id)"
          >
            <span class="library-row__main">
              <span class="library-row__title">
                {{ diagramAt(virtualRow.index).title }}
              </span>
              <span class="library-row__meta">
                {{ t("library.bytes", { size: diagramAt(virtualRow.index).byteSize }) }}
                <template v-if="(diagramAt(virtualRow.index).voteCount ?? 0) > 0">
                  ·
                  {{
                    t("library.ratingVotesShort", {
                      votes: diagramAt(virtualRow.index).voteCount ?? 0,
                    })
                  }}
                </template>
              </span>
              <span
                v-if="diagramAt(virtualRow.index).avgRating"
                class="library-row__rating"
              >
                <LibraryStarRating
                  :value="Math.round(diagramAt(virtualRow.index).avgRating!)"
                  readonly
                  size="sm"
                />
                <span>{{ diagramAt(virtualRow.index).avgRating!.toFixed(1) }}</span>
              </span>
              <span
                v-if="diagramAt(virtualRow.index).description"
                class="library-row__description"
              >
                {{ diagramAt(virtualRow.index).description }}
              </span>
              <span
                v-if="diagramAt(virtualRow.index).tags.length"
                class="library-row__tags"
              >
                <span
                  v-for="tag in diagramAt(virtualRow.index).tags"
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
    </div>
  </div>
</template>

<style scoped>
.library-filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
}

.library-row__rating {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
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
</style>
