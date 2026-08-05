<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";

type SectionOption = {
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
};

const props = defineProps<{
  open: boolean;
  section: SectionOption | null;
  sectionOptions: SectionOption[];
}>();

const emit = defineEmits<{
  close: [];
  save: [payload: { title: string; parentId: string | null }];
}>();

const { t } = useLocale();

const title = ref("");
const parentId = ref("");
const errorMessage = ref("");
const isSaving = ref(false);

const availableParentOptions = computed(() =>
  props.sectionOptions.filter((option) => option.id !== props.section?.id),
);

function resetForm(): void {
  title.value = props.section?.title ?? "";
  parentId.value = props.section?.parentId ?? "";
  errorMessage.value = "";
  isSaving.value = false;
}

function submit(): void {
  const trimmedTitle = title.value.trim();
  if (!trimmedTitle) {
    errorMessage.value = t("library.sectionTitle");
    return;
  }

  emit("save", {
    title: trimmedTitle,
    parentId: parentId.value || null,
  });
}

watch(
  () => [props.open, props.section] as const,
  ([open]) => {
    if (open) {
      resetForm();
    }
  },
);
</script>

<template>
  <AppModal
    :open="open"
    :title="t('library.editSection')"
    @close="emit('close')"
  >
    <form class="section-edit-form" @submit.prevent="submit">
      <p v-if="errorMessage" class="section-edit-form__error">
        {{ errorMessage }}
      </p>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.sectionTitle") }}</span>
        <input v-model="title" class="select" type="text" autofocus />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">
          {{ t("library.parentSection") }}
        </span>
        <select v-model="parentId" class="select">
          <option value="">{{ t("library.noParentSection") }}</option>
          <option
            v-for="option in availableParentOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ "—".repeat(option.depth) }}{{ option.depth > 0 ? " " : ""
            }}{{ option.title }}
          </option>
        </select>
      </label>
    </form>

    <template #footer>
      <button class="btn" type="button" :disabled="isSaving" @click="emit('close')">
        {{ t("app.cancel") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="isSaving"
        @click="submit"
      >
        {{ isSaving ? t("app.loading") : t("library.saveChanges") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.section-edit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

:deep(.modal-backdrop) {
  z-index: 1100;
}

.section-edit-form__error {
  margin: 0;
  color: var(--danger);
  font-size: 0.9rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.settings-field__label {
  font-size: 0.88rem;
  color: var(--text-muted);
}
</style>
