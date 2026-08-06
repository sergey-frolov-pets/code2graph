<script setup lang="ts">
import LibraryDiagramRatingPanel from "@/components/library/LibraryDiagramRatingPanel.vue";
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import { useLocale } from "@/composables/useLocale";
import { formatDate } from "@/shared/format-date";
import { VISIBILITY_OPTIONS } from "@/constants/library-visibility";
import type { DiagramDto, DiagramVisibility } from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";

defineProps<{
  diagram: DiagramDto;
  flatSectionOptions: FlatSectionOption[];
  isEditing: boolean;
  isSaving: boolean;
  libraryApiUrl?: string;
}>();

const editTitle = defineModel<string>("editTitle", { required: true });
const editDescription = defineModel<string>("editDescription", { required: true });
const editTags = defineModel<string>("editTags", { required: true });
const editSectionId = defineModel<string>("editSectionId", { required: true });
const editVisibility = defineModel<DiagramVisibility>("editVisibility", {
  required: true,
});

const emit = defineEmits<{
  save: [];
  cancel: [];
  "start-edit": [];
  "open-in-editor": [];
  delete: [];
  share: [];
  preview: [];
  "manage-access": [];
  "toggle-favorite": [];
  "rating-updated": [diagram: DiagramDto];
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
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.visibility") }}</span>
          <select v-model="editVisibility" class="select">
            <option v-for="option in VISIBILITY_OPTIONS" :key="option" :value="option">
              {{ t(`library.visibility.${option}`) }}
            </option>
          </select>
        </label>
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
        <button
          class="library-detail__open-card"
          type="button"
          :aria-label="t('library.openInEditor')"
          @click="emit('open-in-editor')"
        >
          <p class="library-detail__meta">
            {{ diagram.fileName }} ·
            {{ t("library.updatedAt", { date: formatDate(diagram.updatedAt) }) }}
            <template v-if="diagram.authorName">
              · {{ t("library.author", { name: diagram.authorName }) }}
            </template>
            · {{ t(`library.visibility.${diagram.visibility ?? "all"}`) }}
            <template v-if="diagram.voteCount">
              · {{ t("library.ratingVotesShort", { votes: diagram.voteCount }) }}
            </template>
          </p>
          <p v-if="diagram.avgRating" class="library-detail__rating">
            <LibraryStarRating
              :value="Math.round(diagram.avgRating)"
              readonly
              size="sm"
            />
            <span>{{ diagram.avgRating.toFixed(1) }}</span>
          </p>
          <p
            class="library-detail__description"
            :class="{ 'library-detail__description--empty': !diagram.description }"
          >
            {{ diagram.description || t("library.emptyDescription") }}
          </p>
          <div v-if="diagram.tags.length" class="library-detail__tags">
            <span v-for="tag in diagram.tags" :key="tag" class="library-tag">
              {{ tag }}
            </span>
          </div>
          <span class="library-detail__open-hint">{{ t("library.openInEditorHint") }}</span>
        </button>
        <div class="library-detail__actions">
          <button class="btn btn-primary" type="button" @click="emit('open-in-editor')">
            {{ t("library.openInEditor") }}
          </button>
          <button class="btn" type="button" @click="emit('toggle-favorite')">
            {{
              diagram.isFavorite
                ? t("library.removeFavorite")
                : t("library.addFavorite")
            }}
          </button>
          <button class="btn" type="button" @click="emit('share')">
            {{ t("library.shareLink") }}
          </button>
          <button class="btn" type="button" @click="emit('preview')">
            {{ t("library.preview") }}
          </button>
          <button
            v-if="diagram.canWrite"
            class="btn"
            type="button"
            @click="emit('start-edit')"
          >
            {{ t("library.edit") }}
          </button>
          <button
            v-if="diagram.canWrite"
            class="btn"
            type="button"
            @click="emit('delete')"
          >
            {{ t("app.delete") }}
          </button>
        </div>
        <LibraryDiagramRatingPanel
          :diagram="diagram"
          :api-url="libraryApiUrl"
          @updated="emit('rating-updated', $event)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.library-detail__rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
}
</style>
