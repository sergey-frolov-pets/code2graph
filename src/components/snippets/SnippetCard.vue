<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import type { CustomSnippet, SnippetListItem } from "@/types/snippets";

const props = defineProps<{
  item: SnippetListItem;
}>();

const emit = defineEmits<{
  insert: [content: string];
  edit: [snippet: CustomSnippet];
  delete: [snippet: CustomSnippet];
}>();

const { t } = useLocale();

function getItemTitle(item: SnippetListItem): string {
  return item.kind === "builtin" ? t(item.titleKey) : item.snippet.title;
}

function getItemDescription(item: SnippetListItem): string {
  if (item.kind === "builtin" && item.descriptionKey) {
    return t(item.descriptionKey);
  }
  return item.kind === "custom" ? item.snippet.description ?? "" : "";
}

function getItemContent(item: SnippetListItem): string {
  return item.kind === "builtin" ? item.content : item.snippet.content;
}
</script>

<template>
  <article class="snippet-card">
    <div class="snippet-card__main">
      <h4 class="snippet-card__title">
        {{ getItemTitle(props.item) }}
        <span
          v-if="props.item.kind === 'custom'"
          class="snippet-card__badge"
        >
          {{ t("snippets.customBadge") }}
        </span>
      </h4>
      <p v-if="getItemDescription(props.item)" class="snippet-card__desc">
        {{ getItemDescription(props.item) }}
      </p>
      <pre class="snippet-card__preview">{{ getItemContent(props.item) }}</pre>
    </div>

    <div class="snippet-card__actions">
      <button
        class="btn btn-primary btn-sm"
        type="button"
        @click="emit('insert', getItemContent(props.item))"
      >
        {{ t("snippets.insert") }}
      </button>
      <template v-if="props.item.kind === 'custom'">
        <button
          class="btn btn-sm"
          type="button"
          @click="emit('edit', props.item.snippet)"
        >
          {{ t("snippets.edit") }}
        </button>
        <button
          class="btn btn-sm"
          type="button"
          @click="emit('delete', props.item.snippet)"
        >
          {{ t("app.delete") }}
        </button>
      </template>
    </div>
  </article>
</template>

<style scoped>
.snippet-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  background: var(--surface-muted);
}

.snippet-card__title {
  margin: 0 0 4px;
  font-size: 0.88rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.snippet-card__badge {
  font-size: 0.68rem;
  font-weight: 500;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 999px;
  padding: 1px 6px;
}

.snippet-card__desc {
  margin: 0 0 6px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.snippet-card__preview {
  margin: 0;
  padding: 8px;
  border-radius: 6px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  line-height: 1.4;
  white-space: pre-wrap;
  max-height: 96px;
  overflow: auto;
}

.snippet-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.btn-sm {
  min-height: 28px;
  padding: 0 10px;
  font-size: 0.78rem;
}
</style>
