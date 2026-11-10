<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import { formatSectionOptionLabel } from "@/utils/library-move-targets";

const props = defineProps<{
  open: boolean;
  diagramTitle: string;
  currentSectionId: string | null;
  currentSectionTitle: string;
  sections: FlatSectionOption[];
  isSaving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  save: [sectionId: string | null];
}>();

const { t } = useLocale();
const sectionId = ref("");

const destinationOptions = computed(() => {
  const options = [...props.sections];
  if (
    props.currentSectionId &&
    !options.some((option) => option.id === props.currentSectionId)
  ) {
    options.unshift({
      id: props.currentSectionId,
      title: props.currentSectionTitle || props.currentSectionId,
      depth: 0,
    });
  }
  return options;
});

const currentValue = computed(() => props.currentSectionId ?? "");

const isUnchanged = computed(() => sectionId.value === currentValue.value);

const currentSectionLabel = computed(() =>
  props.currentSectionTitle || t("library.noSection"),
);

function resetForm(): void {
  sectionId.value = currentValue.value;
}

function submit(): void {
  if (props.isSaving || isUnchanged.value) {
    return;
  }
  emit("save", sectionId.value || null);
}

watch(
  () => [props.open, props.currentSectionId] as const,
  ([open]) => {
    if (open) {
      resetForm();
    }
  },
  { immediate: true },
);
</script>

<template>
  <AppModal
    :open="open"
    layer="above-library"
    :title="t('library.moveDiagramTitle')"
    test-id="library-move-diagram-modal"
    @close="emit('close')"
  >
    <form class="move-diagram-form" @submit.prevent="submit">
      <p class="move-diagram-form__hint">
        {{ t("library.moveDiagramHint", { title: diagramTitle }) }}
      </p>
      <p class="move-diagram-form__current">
        {{ t("library.currentSection", { section: currentSectionLabel }) }}
      </p>
      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.diagramSection") }}</span>
        <select v-model="sectionId" class="select">
          <option value="">{{ t("library.noSection") }}</option>
          <option
            v-for="section in destinationOptions"
            :key="section.id"
            :value="section.id"
          >
            {{ formatSectionOptionLabel(section) }}
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
        :disabled="isSaving || isUnchanged"
        @click="submit"
      >
        {{ isSaving ? t("app.loading") : t("library.moveDiagram") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.move-diagram-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.move-diagram-form__hint,
.move-diagram-form__current {
  margin: 0;
}

.move-diagram-form__current {
  color: var(--text-muted);
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
