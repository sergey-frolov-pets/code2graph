<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryTarget } from "@/config/library-target";
import { useLocale } from "@/composables/useLocale";
import { flattenSections } from "@/shared/library/section-tree";
import { parseTagsInput } from "@/utils/library-tags";
import {
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { resolveDiagramFileName } from "@/utils/diagram-files";

const props = defineProps<{
  open: boolean;
  source: string;
  fileName: string;
  diagramFormat: DiagramFormat;
  linkedDiagramId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useLocale();
const library = useDiagramLibrary();
const { libraryTarget, canUseOnline, setLibraryTarget } = useLibraryTarget();

const title = ref("");
const description = ref("");
const tags = ref("");
const sectionId = ref("");
const isSaving = ref(false);
const errorMessage = ref("");

const flatSectionOptions = computed(() =>
  flattenSections(library.sectionTree.value),
);

const isUpdateMode = computed(() => Boolean(props.linkedDiagramId));

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      return;
    }

    errorMessage.value = "";
    void library.refresh();

    if (props.linkedDiagramId) {
      void library.selectDiagram(props.linkedDiagramId);
    }

    const baseName = props.fileName.replace(
      /\.(puml|plantuml|txt|mmd|mermaid|graphml)$/i,
      "",
    );
    title.value = baseName || t("library.defaultDiagramTitle");
    description.value = "";
    tags.value = "";
    sectionId.value = library.selectedSectionId.value ?? "";

    if (props.linkedDiagramId && library.selectedDiagram.value?.id === props.linkedDiagramId) {
      const diagram = library.selectedDiagram.value;
      title.value = diagram.title;
      description.value = diagram.description;
      tags.value = diagram.tags.join(", ");
      sectionId.value = diagram.sectionId ?? "";
    }
  },
);

async function onSave(): Promise<void> {
  errorMessage.value = "";
  const trimmedTitle = title.value.trim();
  if (!trimmedTitle) {
    errorMessage.value = t("library.titleRequired");
    return;
  }

  isSaving.value = true;
  try {
    const payload = {
      title: trimmedTitle,
      description: description.value.trim(),
      tags: parseTagsInput(tags.value),
      sectionId: sectionId.value || null,
      source: props.source,
      fileName: resolveDiagramFileName(props.fileName, props.diagramFormat),
    };

    if (isUpdateMode.value && props.linkedDiagramId) {
      await library.updateDiagram(props.linkedDiagramId, payload);
    } else {
      await library.addDiagram({
        ...payload,
        language: getDiagramFormatDefinition(props.diagramFormat).language,
      });
    }

    emit("saved");
    emit("close");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.syncError");
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <AppModal
    :open="open"
    :title="t('library.saveToLibraryTitle')"
    wide
    @close="emit('close')"
  >
    <p class="save-library__hint">{{ t("library.saveToLibraryHint") }}</p>

    <div v-if="canUseOnline" class="save-library__target">
      <span class="save-library__target-label">{{ t("library.targetLabel") }}</span>
      <IconButton
        :label="t('library.targetLocal')"
        extra-class="save-library__target-btn"
        :pressed="libraryTarget === 'local'"
        @click="setLibraryTarget('local')"
      >
        <ActionIcon name="unlink" />
      </IconButton>
      <IconButton
        :label="t('library.targetOnline')"
        extra-class="save-library__target-btn"
        :pressed="libraryTarget === 'online'"
        @click="setLibraryTarget('online')"
      >
        <ActionIcon name="globe" />
      </IconButton>
    </div>

    <p v-if="isUpdateMode" class="save-library__hint">
      {{ t("library.updateLinkedDiagram") }}
    </p>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.diagramTitle") }}</span>
      <input v-model="title" class="select" type="text" />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.description") }}</span>
      <textarea v-model="description" class="textarea" rows="4" />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.tags") }}</span>
      <input v-model="tags" class="select" type="text" />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.sections") }}</span>
      <select v-model="sectionId" class="select">
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

    <p v-if="errorMessage" class="library-error">{{ errorMessage }}</p>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.cancel") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="isSaving"
        @click="onSave()"
      >
        {{ isSaving ? t("app.loading") : t("library.saveChanges") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.save-library__hint {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.save-library__target {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.save-library__target-label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.save-library__target-btn {
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
}

.library-error {
  margin: 8px 0 0;
  color: var(--danger);
  font-size: 0.9rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.settings-field__label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.textarea {
  min-height: 88px;
  resize: vertical;
}
</style>
