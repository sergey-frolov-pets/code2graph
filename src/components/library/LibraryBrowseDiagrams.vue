<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import type { DiagramListItemDto } from "@/constants/diagram-library";

defineProps<{
  diagrams: DiagramListItemDto[];
  allTags: string[];
  isLoading: boolean;
}>();

const searchQuery = defineModel<string>("searchQuery", { required: true });
const tagFilter = defineModel<string>("tagFilter", { required: true });

const emit = defineEmits<{
  "diagram-pick": [diagramId: string];
}>();

const { t } = useLocale();
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
        @click="emit('diagram-pick', diagram.id)"
      >
        <span class="library-row__main">
          <span class="library-row__title">{{ diagram.title }}</span>
          <span class="library-row__meta">
            {{ t("library.bytes", { size: diagram.byteSize }) }}
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
