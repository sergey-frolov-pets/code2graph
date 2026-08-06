<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { PUML_FILE_ACCEPT } from "@/utils/puml-files";
import type { FlatSectionOption } from "@/shared/library/section-tree";

defineProps<{
  flatSectionOptions: FlatSectionOption[];
  uploadFile: File | null;
  maxSizeKb: number;
  isUploading: boolean;
}>();

const uploadTitle = defineModel<string>("uploadTitle", { required: true });
const uploadDescription = defineModel<string>("uploadDescription", {
  required: true,
});
const uploadTags = defineModel<string>("uploadTags", { required: true });
const uploadSectionId = defineModel<string>("uploadSectionId", { required: true });

const emit = defineEmits<{
  "file-change": [event: Event];
  submit: [];
}>();

const { t } = useLocale();
</script>

<template>
  <form
    class="library-step library-step__content library-step__content--form"
    @submit.prevent="emit('submit')"
  >
    <p class="library-upload__hint">
      {{ t("library.sizeLimit", { size: maxSizeKb }) }}
    </p>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.selectFile") }}</span>
      <input type="file" :accept="PUML_FILE_ACCEPT" @change="emit('file-change', $event)" />
      <span class="library-upload__file-name">
        {{ uploadFile?.name ?? t("library.noFile") }}
      </span>
    </label>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.diagramTitle") }}</span>
      <input v-model="uploadTitle" class="select" type="text" />
    </label>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.description") }}</span>
      <textarea v-model="uploadDescription" class="textarea" rows="3" />
    </label>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.tags") }}</span>
      <input v-model="uploadTags" class="select" type="text" />
    </label>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.sections") }}</span>
      <select v-model="uploadSectionId" class="select">
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
    <button
      class="btn btn-primary"
      type="submit"
      :disabled="isUploading || !uploadFile"
    >
      {{ isUploading ? t("app.loading") : t("app.upload") }}
    </button>
  </form>
</template>
