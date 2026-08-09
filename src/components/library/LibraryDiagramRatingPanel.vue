<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import { useLocale } from "@/composables/useLocale";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import type { DiagramDto, DiagramRatingDto } from "@/constants/diagram-library";
import {
  deleteDiagramRating,
  fetchDiagram,
  fetchDiagramRatings,
  moderateDiagramRatingComment,
  submitDiagramRatingComment,
  submitDiagramRatingStars,
} from "@/services/library/api";

const props = defineProps<{
  diagram: DiagramDto;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  updated: [diagram: DiagramDto];
}>();

const { t } = useLocale();
const { currentUser, isAdmin } = useLibraryAuth();
const approvedComments = ref<DiagramRatingDto[]>([]);
const pendingModeration = ref<DiagramRatingDto[]>([]);
const ratingValue = ref<number | null>(props.diagram.userRating ?? null);
const commentValue = ref(props.diagram.userComment ?? "");
const isLoading = ref(false);
const isSavingComment = ref(false);
const isSavingStars = ref(false);
const errorMessage = ref("");

const isDiagramAuthor = computed(
  () =>
    Boolean(
      props.diagram.authorId &&
        currentUser.value &&
        props.diagram.authorId === currentUser.value.id,
    ) || isAdmin.value,
);

const canDeleteOwnRating = computed(
  () =>
    ratingValue.value !== null &&
    Boolean(currentUser.value) &&
    props.diagram.userRating !== null,
);

async function loadRatings(): Promise<void> {
  if (!props.apiUrl) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchDiagramRatings(props.diagram.id, props.apiUrl);
    approvedComments.value = response.approved;
    pendingModeration.value = response.pending;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingLoadError");
  } finally {
    isLoading.value = false;
  }
}

async function onStarsChange(stars: number): Promise<void> {
  if (!props.apiUrl) {
    ratingValue.value = stars;
    return;
  }

  ratingValue.value = stars;
  isSavingStars.value = true;
  errorMessage.value = "";
  try {
    const diagram = await submitDiagramRatingStars(
      props.diagram.id,
      stars,
      props.apiUrl,
    );
    emit("updated", diagram);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingSaveError");
  } finally {
    isSavingStars.value = false;
  }
}

async function saveComment(): Promise<void> {
  if (!props.apiUrl || ratingValue.value === null) {
    return;
  }

  isSavingComment.value = true;
  errorMessage.value = "";
  try {
    const diagram = await submitDiagramRatingComment(
      props.diagram.id,
      commentValue.value.trim(),
      props.apiUrl,
    );
    emit("updated", diagram);
    await loadRatings();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingSaveError");
  } finally {
    isSavingComment.value = false;
  }
}

async function moderate(
  ratingUserId: string,
  status: "approved" | "rejected",
): Promise<void> {
  if (!props.apiUrl) {
    return;
  }

  try {
    await moderateDiagramRatingComment(
      props.diagram.id,
      ratingUserId,
      status,
      props.apiUrl,
    );
    await loadRatings();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingModerateError");
  }
}

async function removeOwnRating(): Promise<void> {
  if (!props.apiUrl || !currentUser.value) {
    return;
  }

  try {
    await deleteDiagramRating(
      props.diagram.id,
      currentUser.value.id,
      props.apiUrl,
    );
    const diagram = await fetchDiagram(props.diagram.id, props.apiUrl);
    emit("updated", diagram);
    ratingValue.value = null;
    commentValue.value = "";
    await loadRatings();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingDeleteError");
  }
}

watch(
  () => props.diagram.id,
  () => {
    ratingValue.value = props.diagram.userRating ?? null;
    commentValue.value = props.diagram.userComment ?? "";
    void loadRatings();
  },
  { immediate: true },
);

watch(
  () => props.diagram.userRating,
  (value) => {
    ratingValue.value = value ?? null;
  },
);

watch(
  () => props.diagram.userComment,
  (value) => {
    if (value !== undefined) {
      commentValue.value = value ?? "";
    }
  },
);
</script>

<template>
  <section class="library-rating-panel">
    <div class="library-rating-panel__summary">
      <LibraryStarRating
        :value="diagram.avgRating ? Math.round(diagram.avgRating) : null"
        readonly
      />
      <span class="library-rating-panel__meta">
        {{
          t("library.ratingSummary", {
            rating: diagram.avgRating?.toFixed(1) ?? "—",
            votes: diagram.voteCount ?? 0,
          })
        }}
      </span>
      <span v-if="isSavingStars" class="library-rating-panel__hint">
        {{ t("app.loading") }}
      </span>
    </div>

    <div class="library-rating-panel__form">
      <p class="library-rating-panel__label">{{ t("library.yourRating") }}</p>
      <LibraryStarRating :value="ratingValue" @change="onStarsChange($event)" />
      <label class="settings-field">
        <span class="settings-field__label">{{ t("library.ratingComment") }}</span>
        <textarea
          v-model="commentValue"
          class="textarea"
          rows="3"
          :placeholder="t('library.ratingCommentHint')"
        />
      </label>
      <p
        v-if="diagram.userCommentStatus === 'pending'"
        class="library-rating-panel__hint"
      >
        {{ t("library.ratingCommentPending") }}
      </p>
      <button
        class="btn"
        type="button"
        :disabled="isSavingComment || ratingValue === null"
        @click="saveComment()"
      >
        {{ isSavingComment ? t("app.loading") : t("library.ratingCommentSubmit") }}
      </button>
      <button
        v-if="canDeleteOwnRating"
        class="btn"
        type="button"
        @click="removeOwnRating()"
      >
        {{ t("library.ratingDeleteOwn") }}
      </button>
    </div>

    <p v-if="errorMessage" class="library-rating-panel__error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="library-rating-panel__hint">{{ t("app.loading") }}</p>

    <div v-if="approvedComments.length" class="library-rating-panel__comments">
      <p class="library-rating-panel__label">{{ t("library.ratingComments") }}</p>
      <article
        v-for="entry in approvedComments"
        :key="entry.id"
        class="library-rating-panel__comment"
      >
        <div class="library-rating-panel__comment-head">
          <strong>{{ entry.username ?? t("library.anonymousUser") }}</strong>
          <LibraryStarRating :value="entry.rating" readonly size="sm" />
        </div>
        <p>{{ entry.comment }}</p>
      </article>
    </div>

    <div v-if="isDiagramAuthor && pendingModeration.length" class="library-rating-panel__moderation">
      <p class="library-rating-panel__label">{{ t("library.ratingModeration") }}</p>
      <article
        v-for="entry in pendingModeration"
        :key="entry.id"
        class="library-rating-panel__comment"
      >
        <div class="library-rating-panel__comment-head">
          <strong>{{ entry.username ?? t("library.anonymousUser") }}</strong>
          <LibraryStarRating :value="entry.rating" readonly size="sm" />
        </div>
        <p>{{ entry.comment }}</p>
        <div class="library-rating-panel__moderation-actions">
          <button
            class="btn btn-primary"
            type="button"
            @click="moderate(entry.userId, 'approved')"
          >
            {{ t("library.ratingApprove") }}
          </button>
          <button
            class="btn"
            type="button"
            @click="moderate(entry.userId, 'rejected')"
          >
            {{ t("library.ratingReject") }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.library-rating-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.library-rating-panel__summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.library-rating-panel__meta {
  font-size: 0.9rem;
  color: var(--text-muted, #666);
}

.library-rating-panel__label {
  margin: 0 0 6px;
  font-weight: 600;
}

.library-rating-panel__hint,
.library-rating-panel__error {
  font-size: 0.88rem;
}

.library-rating-panel__error {
  color: var(--danger, #c62828);
}

.library-rating-panel__comment {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.library-rating-panel__comment-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.library-rating-panel__moderation-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
</style>
