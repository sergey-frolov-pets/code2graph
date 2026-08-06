<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import { useLocale } from "@/composables/useLocale";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import type { DiagramDto, DiagramRatingDto } from "@/constants/diagram-library";
import {
  fetchDiagramRatings,
  moderateDiagramRatingComment,
  submitDiagramRating,
} from "@/utils/diagram-api";

const props = defineProps<{
  diagram: DiagramDto;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  updated: [diagram: DiagramDto];
}>();

const { t } = useLocale();
const { currentUser } = useLibraryAuth();
const ratings = ref<DiagramRatingDto[]>([]);
const ratingValue = ref<number | null>(props.diagram.userRating ?? null);
const commentValue = ref("");
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

const isAuthor = computed(
  () =>
    Boolean(
      props.diagram.authorId &&
        currentUser.value &&
        props.diagram.authorId === currentUser.value.id,
    ),
);

const pendingModeration = computed(() =>
  ratings.value.filter((entry) => entry.commentStatus === "pending" && entry.comment),
);

const approvedComments = computed(() =>
  ratings.value.filter(
    (entry) => entry.commentStatus === "approved" && entry.comment,
  ),
);

async function loadRatings(): Promise<void> {
  if (!props.apiUrl) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchDiagramRatings(props.diagram.id, props.apiUrl);
    ratings.value = response.ratings;
    const own = currentUser.value
      ? response.ratings.find((entry) => entry.userId === currentUser.value?.id)
      : undefined;
    if (own?.comment) {
      commentValue.value = own.comment;
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingLoadError");
  } finally {
    isLoading.value = false;
  }
}

async function saveRating(): Promise<void> {
  if (!props.apiUrl || ratingValue.value === null) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    const diagram = await submitDiagramRating(
      props.diagram.id,
      {
        rating: ratingValue.value,
        comment: commentValue.value.trim() || undefined,
      },
      props.apiUrl,
    );
    emit("updated", diagram);
    await loadRatings();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingSaveError");
  } finally {
    isSaving.value = false;
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

watch(
  () => props.diagram.id,
  () => {
    ratingValue.value = props.diagram.userRating ?? null;
    commentValue.value = "";
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
    </div>

    <div class="library-rating-panel__form">
      <p class="library-rating-panel__label">{{ t("library.yourRating") }}</p>
      <LibraryStarRating :value="ratingValue" @change="ratingValue = $event" />
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
        class="btn btn-primary"
        type="button"
        :disabled="isSaving || ratingValue === null"
        @click="saveRating()"
      >
        {{ isSaving ? t("app.loading") : t("library.ratingSubmit") }}
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

    <div v-if="isAuthor && pendingModeration.length" class="library-rating-panel__moderation">
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
  border-top: 1px solid var(--border-color, #ddd);
}

.library-rating-panel__summary {
  display: flex;
  align-items: center;
  gap: 10px;
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
  border-bottom: 1px solid var(--border-color, #eee);
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
}
</style>
