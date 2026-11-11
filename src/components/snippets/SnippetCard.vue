<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { getLanguageModule } from "@/languages/registry";
import type { LocaleKey } from "@/locales/types";
import type {
  CustomSnippet,
  SnippetCategoryId,
  SnippetLanguageId,
  SnippetListItem,
} from "@/types/snippets";

const props = withDefaults(
  defineProps<{
    item: SnippetListItem;
    canInsert?: boolean;
  }>(),
  {
    canInsert: true,
  },
);

const emit = defineEmits<{
  insert: [content: string];
  edit: [snippet: CustomSnippet];
  delete: [snippet: CustomSnippet];
  selectLanguage: [language: SnippetLanguageId];
  selectCategory: [category: SnippetCategoryId | "custom"];
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

function getItemLanguage(item: SnippetListItem): SnippetLanguageId {
  return item.kind === "builtin" ? item.language : item.snippet.language;
}

function getItemLanguageLabel(item: SnippetListItem): string {
  const language = getItemLanguage(item);
  return t(getLanguageModule(language).labelKey);
}

function getItemCategory(item: SnippetListItem): SnippetCategoryId | "custom" {
  return item.kind === "builtin" ? item.categoryId : item.snippet.categoryId;
}

function getItemCategoryLabel(item: SnippetListItem): string {
  const category = getItemCategory(item);
  const key: LocaleKey = `snippets.category.${category}`;
  return t(key);
}
</script>

<template>
  <article class="snippet-card">
    <div class="snippet-card__main">
      <div class="snippet-card__head">
        <h4 class="snippet-card__title">
          {{ getItemTitle(props.item) }}
          <span
            v-if="props.item.kind === 'custom'"
            class="snippet-card__badge"
          >
            {{ t("snippets.customBadge") }}
          </span>
        </h4>
        <div class="snippet-card__tags">
          <button
            class="snippet-card__tag snippet-card__tag--lang"
            type="button"
            @click="emit('selectLanguage', getItemLanguage(props.item))"
          >
            {{ getItemLanguageLabel(props.item) }}
          </button>
          <button
            class="snippet-card__tag"
            type="button"
            @click="emit('selectCategory', getItemCategory(props.item))"
          >
            {{ getItemCategoryLabel(props.item) }}
          </button>
        </div>
      </div>
      <p v-if="getItemDescription(props.item)" class="snippet-card__desc">
        {{ getItemDescription(props.item) }}
      </p>
      <pre class="snippet-card__preview">{{ getItemContent(props.item) }}</pre>
    </div>

    <div class="snippet-card__actions">
      <button
        class="btn btn-primary btn-sm"
        type="button"
        :disabled="!props.canInsert"
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

.snippet-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.snippet-card__title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.snippet-card__tags {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.snippet-card__tag {
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 0.68rem;
  line-height: 1.35;
  background: var(--surface);
  color: var(--text-muted);
  min-height: auto;
  cursor: pointer;
}

.snippet-card__tag:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.snippet-card__tag--lang {
  font-weight: 600;
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
