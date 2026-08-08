<script setup lang="ts">
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import { useLocale } from "@/composables/useLocale";
import type { DiagramListItemDto, DiagramSortOption } from "@/constants/diagram-library";
import { DIAGRAM_SORT_OPTIONS } from "@/constants/diagram-library";

defineProps<{
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

function onFiltersChange(): void {
  emit("filters-change");
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

    <div class="library-step__content">
      <p v-if="isLoading" class="library-empty">{{ t("app.loading") }}</p>
      <p v-else-if="diagrams.length === 0" class="library-empty">
        {{ t("library.noResults") }}
      </p>
      <button
        v-for="diagram in diagrams"
        :key="diagram.id"
        class="library-row list-virtual-row"
        type="button"
        @click="emit('diagram-pick', diagram.id)"
      >
        <span class="library-row__main">
          <span class="library-row__title">{{ diagram.title }}</span>
          <span class="library-row__meta">
            {{ t("library.bytes", { size: diagram.byteSize }) }}
            <template v-if="diagram.voteCount">
              · {{ t("library.ratingVotesShort", { votes: diagram.voteCount }) }}
            </template>
          </span>
          <span
            v-if="diagram.avgRating"
            class="library-row__rating"
          >
            <LibraryStarRating
              :value="Math.round(diagram.avgRating)"
              readonly
              size="sm"
            />
            <span>{{ diagram.avgRating.toFixed(1) }}</span>
          </span>
          <span v-if="diagram.description" class="library-row__description">
            {{ diagram.description }}
          </span>
          <span v-if="diagram.tags.length" class="library-row__tags">
            <span v-for="tag in diagram.tags" :key="tag" class="library-tag">
              {{ tag }}
            </span>
          </span>
        </span>
        <span class="library-row__chevron">›</span>
      </button>
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
</style>
