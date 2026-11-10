<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import LibraryDiagramRatingPanel from "@/components/library/LibraryDiagramRatingPanel.vue";
import LibraryDataLinkFields from "@/components/library/LibraryDataLinkFields.vue";
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import { useLocale } from "@/composables/useLocale";
import { useLibraryDiagramPreview } from "@/composables/useLibraryDiagramPreview";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { isLocaleKey } from "@/locales/types";
import { formatDate } from "@/shared/format-date";
import { VISIBILITY_OPTIONS } from "@/constants/library-visibility";
import {
  CONTENT_LOCALES,
  DIAGRAM_LANGUAGES,
  type DiagramDto,
  type DiagramLanguage,
  type DiagramVisibility,
} from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import { diagramAllowsWrite, getDiagramFormatLabel } from "@/utils/library-display";
import {
  diagramCanMoveToAnotherSection,
  formatSectionOptionLabel,
  type MoveDiagramRequest,
} from "@/utils/library-move-targets";

const props = defineProps<{
  diagram: DiagramDto;
  flatSectionOptions: FlatSectionOption[];
  moveSectionOptions: FlatSectionOption[];
  isEditing: boolean;
  isSaving: boolean;
  libraryApiUrl?: string;
  renderMode: RenderMode;
  layout: LayoutEngine;
  diagramDarkMode: boolean;
  isLocalLibrary: boolean;
}>();

const editTitle = defineModel<string>("editTitle", { required: true });
const editDescription = defineModel<string>("editDescription", { required: true });
const editTags = defineModel<string>("editTags", { required: true });
const editSectionId = defineModel<string>("editSectionId", { required: true });
const editVisibility = defineModel<DiagramVisibility>("editVisibility", {
  required: true,
});
const editLanguage = defineModel<DiagramLanguage>("editLanguage", { required: true });
const editContentLocale = defineModel<string>("editContentLocale", { required: true });

const emit = defineEmits<{
  save: [];
  cancel: [];
  "start-edit": [];
  "open-in-editor": [];
  delete: [];
  move: [payload: MoveDiagramRequest];
  share: [];
  preview: [];
  "manage-access": [];
  "toggle-favorite": [];
  "rating-updated": [diagram: DiagramDto];
  "open-versions": [];
}>();

const { t } = useLocale();
const moreOpen = ref(false);
const preview = useLibraryDiagramPreview();
const previewError = preview.error;
const previewRendering = preview.isRendering;
const previewMarkup = preview.previewMarkup;
const allowsWrite = computed(() => diagramAllowsWrite(props.diagram));
const canMove = computed(() =>
  diagramCanMoveToAnotherSection(props.diagram, props.moveSectionOptions),
);
const sectionChoices = computed(() => {
  const options = [...props.moveSectionOptions];
  const currentId = props.diagram.sectionId;
  if (currentId && !options.some((option) => option.id === currentId)) {
    const current = props.flatSectionOptions.find((option) => option.id === currentId);
    if (current) {
      options.unshift(current);
    }
  }
  return options;
});
const currentSectionTitle = computed(() => {
  if (!props.diagram.sectionId) {
    return "";
  }
  return (
    props.flatSectionOptions.find((option) => option.id === props.diagram.sectionId)
      ?.title ?? ""
  );
});

function requestMove(): void {
  emit("move", {
    id: props.diagram.id,
    title: props.diagram.title,
    sectionId: props.diagram.sectionId,
  });
}

watch(
  () =>
    [
      props.diagram.id,
      props.diagram.source,
      props.diagram.updatedAt,
      props.renderMode,
      props.layout,
      props.diagramDarkMode,
    ] as const,
  () => {
    moreOpen.value = false;
    void preview.renderPreview(props.diagram.source, {
      watermarked: props.diagram.canDownload === false,
      fileName: props.diagram.fileName,
      language: props.diagram.language,
      renderMode: props.renderMode,
      dark: props.diagramDarkMode,
      layout: props.layout,
    });
  },
  { immediate: true },
);

function contentLocaleLabel(locale: string): string {
  if (!locale) {
    return t("library.contentLocaleAny");
  }
  const key = `library.contentLocale.${locale}`;
  return isLocaleKey(key) ? t(key) : locale;
}
</script>

<template>
  <div class="library-step library-step--detail">
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
          <span class="settings-field__label">{{ t("library.diagramFormat") }}</span>
          <select v-model="editLanguage" class="select">
            <option v-for="lang in DIAGRAM_LANGUAGES" :key="lang" :value="lang">
              {{ getDiagramFormatLabel(lang) }}
            </option>
          </select>
        </label>
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.contentLocaleLabel") }}</span>
          <select v-model="editContentLocale" class="select">
            <option v-for="locale in CONTENT_LOCALES" :key="locale || 'any'" :value="locale">
              {{ contentLocaleLabel(locale) }}
            </option>
          </select>
        </label>
        <label class="settings-field">
          <span class="settings-field__label">{{ t("library.diagramSection") }}</span>
          <select v-model="editSectionId" class="select">
            <option value="">{{ t("library.noSection") }}</option>
            <option
              v-for="section in sectionChoices"
              :key="section.id"
              :value="section.id"
            >
              {{ formatSectionOptionLabel(section) }}
            </option>
          </select>
        </label>
        <label v-if="!isLocalLibrary" class="settings-field">
          <span class="settings-field__label">{{ t("library.visibility") }}</span>
          <select v-model="editVisibility" class="select">
            <option v-for="option in VISIBILITY_OPTIONS" :key="option" :value="option">
              {{ t(`library.visibility.${option}`) }}
            </option>
          </select>
        </label>
        <div class="library-detail__actions">
          <IconButton
            :label="isSaving ? t('app.loading') : t('library.saveChanges')"
            primary
            :disabled="isSaving"
            @click="emit('save')"
          >
            <ActionIcon name="save" />
          </IconButton>
          <IconButton
            :label="t('app.cancel')"
            :disabled="isSaving"
            @click="emit('cancel')"
          >
            <ActionIcon name="close" />
          </IconButton>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="library-step__toolbar">
        <div class="library-step__toolbar-actions">
          <button
            class="btn btn-primary"
            type="button"
            :disabled="diagram.canDownload === false"
            @click="emit('open-in-editor')"
          >
            {{ t("library.openInEditor") }}
          </button>
          <IconButton
            v-if="canMove"
            :label="t('library.moveDiagram')"
            @click="requestMove()"
          >
            <ActionIcon name="folder-open" />
          </IconButton>
          <IconButton :label="t('library.preview')" @click="emit('preview')">
            <ActionIcon name="eye" />
          </IconButton>
          <IconButton
            v-if="!isLocalLibrary"
            :label="
              diagram.isFavorite
                ? t('library.removeFavorite')
                : t('library.addFavorite')
            "
            :pressed="diagram.isFavorite"
            @click="emit('toggle-favorite')"
          >
            <ActionIcon name="star" />
          </IconButton>
          <button
            class="btn"
            type="button"
            :aria-expanded="moreOpen"
            @click="moreOpen = !moreOpen"
          >
            {{ t("library.moreActions") }}
          </button>
        </div>
      </div>
      <div v-if="moreOpen" class="library-detail__more">
        <button
          v-if="allowsWrite"
          class="btn"
          type="button"
          @click="emit('start-edit')"
        >
          {{ t("library.edit") }}
        </button>
        <button v-if="!isLocalLibrary" class="btn" type="button" @click="emit('share')">
          {{ t("library.shareLink") }}
        </button>
        <button v-if="!isLocalLibrary" class="btn" type="button" @click="emit('open-versions')">
          {{ t("library.versions") }}
        </button>
        <button
          v-if="allowsWrite"
          class="btn library-detail__delete"
          type="button"
          @click="emit('delete')"
        >
          {{ t("app.delete") }}
        </button>
      </div>

      <div class="library-detail__primary">
        <section class="library-detail__summary">
          <h3 class="library-detail__title">{{ diagram.title }}</h3>
          <p
            class="library-detail__description"
            :class="{ 'library-detail__description--empty': !diagram.description }"
          >
            {{ diagram.description || t("library.emptyDescription") }}
          </p>
        </section>

        <section class="library-detail__preview" :aria-label="t('library.preview')">
          <p v-if="previewError" class="library-detail__preview-status">
            {{ previewError }}
          </p>
          <p v-else-if="previewRendering" class="library-detail__preview-status">
            {{ t("library.previewLoading") }}
          </p>
          <div
            v-else-if="previewMarkup"
            class="library-detail__preview-frame"
            v-html="previewMarkup"
          />
          <p v-else class="library-detail__preview-status">
            {{ t("library.previewEmpty") }}
          </p>
        </section>
        <LibraryDataLinkFields :diagram-id="diagram.id" />
      </div>

      <div class="library-step__content library-step__content--padded">
        <section class="library-detail__summary">
            <div class="library-detail__badges">
              <span class="library-badge library-badge--format">
                {{ getDiagramFormatLabel(diagram.language) }}
              </span>
              <span
                v-if="diagram.contentLocale"
                class="library-badge library-badge--locale"
              >
                {{ diagram.contentLocale.toUpperCase() }}
              </span>
            </div>
            <p class="library-detail__meta">
              {{ t("library.updatedAt", { date: formatDate(diagram.updatedAt) }) }}
              <template v-if="diagram.authorName">
                · {{ t("library.author", { name: diagram.authorName }) }}
              </template>
              <template v-if="!isLocalLibrary">
                · {{ t(`library.visibility.${diagram.visibility ?? "all"}`) }}
              </template>
              <template v-if="diagram.contentLocale">
                · {{ contentLocaleLabel(diagram.contentLocale) }}
              </template>
              <template v-if="!isLocalLibrary && diagram.voteCount">
                · {{ t("library.ratingVotesShort", { votes: diagram.voteCount }) }}
              </template>
            </p>
            <p class="library-detail__file">
              {{ t("library.diagramSection") }}:
              {{ currentSectionTitle || t("library.noSection") }}
            </p>
            <p class="library-detail__file">{{ diagram.fileName }}</p>
            <p v-if="!isLocalLibrary && diagram.avgRating" class="library-detail__rating">
              <LibraryStarRating
                :value="Math.round(diagram.avgRating)"
                readonly
                size="sm"
              />
              <span>{{ diagram.avgRating.toFixed(1) }}</span>
            </p>
            <div v-if="diagram.tags.length" class="library-detail__tags">
              <span v-for="tag in diagram.tags" :key="tag" class="library-tag">
                {{ tag }}
              </span>
            </div>
            <p
              v-if="diagram.canDownload === false"
              class="library-detail__restricted"
            >
              {{ t("library.downloadRestricted") }}
            </p>
        </section>
        <LibraryDiagramRatingPanel
          v-if="!isLocalLibrary"
          :diagram="diagram"
          :api-url="libraryApiUrl"
          @updated="emit('rating-updated', $event)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.library-detail__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
}

.library-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.library-badge--format {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  color: var(--accent);
}

.library-badge--locale {
  background: var(--surface-muted);
  color: var(--text-muted);
}

.library-detail__more {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.library-detail__delete {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
}

.library-detail__summary,
.library-detail__preview {
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.library-detail__title {
  margin: 0 0 8px;
  font-size: 1.05rem;
}

.library-detail__file,
.library-detail__restricted,
.library-detail__preview-status {
  margin: 8px 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.library-detail__preview-frame {
  overflow: visible;
}

.library-detail__preview-frame :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}

.library-detail__rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
}

</style>
