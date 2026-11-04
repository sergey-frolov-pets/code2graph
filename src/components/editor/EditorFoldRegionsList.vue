<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import {
  isBookmark,
  type CodeFoldRegion,
} from "@/utils/code-folds";

defineProps<{
  regions: CodeFoldRegion[];
}>();

const emit = defineEmits<{
  navigate: [line: number];
  remove: [regionId: string];
}>();

const { t } = useLocale();

function formatRegionTitle(region: CodeFoldRegion): string {
  if (isBookmark(region)) {
    return t("editor.regions.bookmarkLine", { line: region.startLine });
  }

  return t("editor.regions.rangeLines", {
    from: region.startLine,
    to: region.endLine,
  });
}

function onRemoveClick(regionId: string, event: MouseEvent): void {
  event.preventDefault();
  event.stopPropagation();
  emit("remove", regionId);
}
</script>

<template>
  <div v-if="regions.length > 0" class="fold-regions-panel__list">
    <p class="fold-regions-panel__list-title">
      {{ t("editor.regions.existing") }}
    </p>
    <ul class="fold-regions-panel__items">
      <li
        v-for="region in regions"
        :key="region.id"
        class="fold-regions-panel__item"
      >
        <button
          type="button"
          class="fold-regions-panel__item-button"
          @click="emit('navigate', region.startLine)"
        >
          <span class="fold-regions-panel__item-title">
            {{ formatRegionTitle(region) }}
          </span>
          <span
            v-if="region.label"
            class="fold-regions-panel__item-label"
          >
            {{ region.label }}
          </span>
        </button>
        <button
          type="button"
          class="fold-regions-panel__item-remove"
          :aria-label="t('editor.regions.remove')"
          @click="onRemoveClick(region.id, $event)"
        >
          ×
        </button>
      </li>
    </ul>
  </div>

  <p v-else class="fold-regions-panel__empty">
    {{ t("editor.regions.empty") }}
  </p>
</template>

<style scoped>
.fold-regions-panel__list {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.fold-regions-panel__list-title {
  margin: 0 0 8px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.fold-regions-panel__items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.fold-regions-panel__item {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.fold-regions-panel__item + .fold-regions-panel__item {
  margin-top: 4px;
}

.fold-regions-panel__item-button {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  text-align: left;
}

.fold-regions-panel__item-button:hover {
  border-color: var(--accent);
}

.fold-regions-panel__item-title {
  font-size: 0.84rem;
  font-weight: 600;
}

.fold-regions-panel__item-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.fold-regions-panel__item-remove {
  flex: 0 0 36px;
  width: 36px;
  min-height: 36px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-muted);
  font-size: 1.2rem;
  line-height: 1;
}

.fold-regions-panel__item-remove:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.fold-regions-panel__empty {
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.78rem;
}
</style>
