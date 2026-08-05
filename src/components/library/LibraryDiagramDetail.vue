<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { formatDate } from "@/shared/format-date";
import type { DiagramDto } from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";

defineProps<{
  diagram: DiagramDto;
  flatSectionOptions: FlatSectionOption[];
  isEditing: boolean;
  isSaving: boolean;
}>();

const editTitle = defineModel<string>("editTitle", { required: true });
const editDescription = defineModel<string>("editDescription", { required: true });
const editTags = defineModel<string>("editTags", { required: true });
const editSectionId = defineModel<string>("editSectionId", { required: true });

const emit = defineEmits<{
  save: [];
  cancel: [];
  "start-edit": [];
  "open-in-editor": [];
  delete: [];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="library-step">
    <template v-if="isEditing">
      <div class="library-step__content library-step__content--form">
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.diagramTitle") }}</span>
          <input v-model="editTitle" class="select" type="text" />
        </label>
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.description") }}</span>
          <textarea v-model="editDescription" class="textarea" rows="4" />
        </label>
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.tags") }}</span>
          <input v-model="editTags" class="select" type="text" />
        </label>
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.sections") }}</span>
          <select v-model="editSectionId" class="select">
            <option value="">{{ t("library.allSections") }}</option>
            <option
              v-for="section in flatSectionOptions"
              :key="section.id"
              :value="section.id"
            >
              {{ "—".repeat(section.depth) }}{{ section.depth > 0 ? " " : ""
              }}{{ section.title }}
            </option>
          </select>
        </label>
        <pre class="library-detail__source">{{ diagram.source }}</pre>
        <div class="library-detail__actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="isSaving"
            @click="emit('save')"
          >
            {{ isSaving ? t("app.loading") : t("library.saveChanges") }}
          </button>
          <button
            class="btn"
            type="button"
            :disabled="isSaving"
            @click="emit('cancel')"
          >
            {{ t("app.cancel") }}
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="library-step__content library-step__content--padded">
        <p class="library-detail__meta">
          {{ diagram.fileName }} ·
          {{ t("library.updatedAt", { date: formatDate(diagram.updatedAt) }) }}
        </p>
        <p v-if="diagram.description" class="library-detail__description">
          {{ diagram.description }}
        </p>
        <div v-if="diagram.tags.length" class="library-detail__tags">
          <span v-for="tag in diagram.tags" :key="tag" class="library-tag">
            {{ tag }}
          </span>
        </div>
        <pre class="library-detail__source">{{ diagram.source }}</pre>
        <div class="library-detail__actions">
          <button class="btn btn-primary" type="button" @click="emit('open-in-editor')">
            {{ t("library.openInEditor") }}
          </button>
          <button class="btn" type="button" @click="emit('start-edit')">
            {{ t("library.edit") }}
          </button>
          <button class="btn" type="button" @click="emit('delete')">
            {{ t("app.delete") }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
