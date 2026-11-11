<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { getLanguageModule } from "@/languages/registry";
import type { LocaleKey } from "@/locales/types";
import {
  SNIPPET_CATEGORY_IDS,
  SNIPPET_LANGUAGE_IDS,
  type CustomSnippet,
  type SnippetCategoryId,
  type SnippetLanguageId,
} from "@/types/snippets";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  open: boolean;
  snippet?: CustomSnippet | null;
  defaultLanguage?: SnippetLanguageId;
}>();

const emit = defineEmits<{
  close: [];
  save: [
    payload: {
      language: SnippetLanguageId;
      title: string;
      content: string;
      description?: string;
      categoryId: SnippetCategoryId | "custom";
    },
  ];
}>();

const { t } = useLocale();

const language = ref<SnippetLanguageId>("plantuml");
const title = ref("");
const content = ref("");
const description = ref("");
const categoryId = ref<SnippetCategoryId | "custom">("custom");
const errorMessage = ref("");

const isEditing = computed(() => Boolean(props.snippet));

const modalTitle = computed(() =>
  isEditing.value ? t("snippets.editTitle") : t("snippets.addTitle"),
);

const languageOptions = computed(() =>
  SNIPPET_LANGUAGE_IDS.map((id) => ({
    value: id,
    label: t(getLanguageModule(id).labelKey),
  })),
);

const categoryOptions = computed(() => [
  { value: "custom" as const, label: t("snippets.category.custom") },
  ...SNIPPET_CATEGORY_IDS.map((id) => {
    const key: LocaleKey = `snippets.category.${id}`;
    return {
      value: id,
      label: t(key),
    };
  }),
]);

function resetForm(): void {
  if (props.snippet) {
    language.value = props.snippet.language;
    title.value = props.snippet.title;
    content.value = props.snippet.content;
    description.value = props.snippet.description ?? "";
    categoryId.value = props.snippet.categoryId;
  } else {
    language.value = props.defaultLanguage ?? "plantuml";
    title.value = "";
    content.value = "";
    description.value = "";
    categoryId.value = "custom";
  }
  errorMessage.value = "";
}

function submit(): void {
  const trimmedTitle = title.value.trim();
  const trimmedContent = content.value.trim();

  if (!trimmedTitle) {
    errorMessage.value = t("snippets.errorTitleRequired");
    return;
  }

  if (!trimmedContent) {
    errorMessage.value = t("snippets.errorContentRequired");
    return;
  }

  emit("save", {
    language: language.value,
    title: trimmedTitle,
    content: trimmedContent,
    description: description.value.trim() || undefined,
    categoryId: categoryId.value,
  });
}

watch(
  () => [props.open, props.snippet, props.defaultLanguage] as const,
  ([open]) => {
    if (open) {
      resetForm();
    }
  },
);
</script>

<template>
  <AppModal :open="open" :title="modalTitle" @close="emit('close')">
    <form class="snippet-form" @submit.prevent="submit">
      <label class="field">
        <span class="field-label">{{ t("snippets.fieldTitle") }}</span>
        <input
          v-model="title"
          class="input"
          type="text"
          :placeholder="t('snippets.fieldTitlePlaceholder')"
          autocomplete="off"
        />
      </label>

      <div class="snippet-form__row">
        <label class="field">
          <span class="field-label">{{ t("snippets.fieldLanguage") }}</span>
          <select v-model="language" class="select">
            <option
              v-for="option in languageOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span class="field-label">{{ t("snippets.fieldCategory") }}</span>
          <select v-model="categoryId" class="select">
            <option
              v-for="option in categoryOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="field">
        <span class="field-label">{{ t("snippets.fieldDescription") }}</span>
        <input
          v-model="description"
          class="input"
          type="text"
          :placeholder="t('snippets.fieldDescriptionPlaceholder')"
          autocomplete="off"
        />
      </label>

      <label class="field">
        <span class="field-label">{{ t("snippets.fieldContent") }}</span>
        <textarea
          v-model="content"
          class="textarea"
          rows="10"
          spellcheck="false"
          :placeholder="t('snippets.fieldContentPlaceholder')"
        />
      </label>

      <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
    </form>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.cancel") }}
      </button>
      <button class="btn btn-primary" type="button" @click="submit">
        {{ t("app.save") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.snippet-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.snippet-form__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.82rem;
  color: var(--text-muted);
}

.textarea {
  min-height: 180px;
  resize: vertical;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.45;
}

.form-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.85rem;
}

@media (max-width: 520px) {
  .snippet-form__row {
    grid-template-columns: 1fr;
  }
}
</style>
