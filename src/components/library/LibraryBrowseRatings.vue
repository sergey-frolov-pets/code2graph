<script setup lang="ts">
import { onMounted, ref } from "vue";
import LibraryStarRating from "@/components/library/LibraryStarRating.vue";
import { useLocale } from "@/composables/useLocale";
import type { RatingsLeaderboardDto } from "@/constants/diagram-library";
import { fetchRatingsLeaderboard } from "@/services/library/api";
import { getDiagramFormatLabel } from "@/utils/library-display";

const emit = defineEmits<{
  "diagram-pick": [diagramId: string];
  "section-pick": [sectionId: string];
}>();

const { t } = useLocale();
const leaderboard = ref<RatingsLeaderboardDto | null>(null);
const isLoading = ref(false);
const errorMessage = ref("");

async function loadLeaderboard(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";
  try {
    leaderboard.value = await fetchRatingsLeaderboard();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.ratingsLoadError");
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  void loadLeaderboard();
});
</script>

<template>
  <div class="library-step">
    <div class="library-step__content library-step__content--padded">
      <p v-if="isLoading" class="library-empty">{{ t("app.loading") }}</p>
      <p v-else-if="errorMessage" class="library-empty">{{ errorMessage }}</p>
      <template v-else-if="leaderboard">
        <section class="library-ratings-block">
          <h3 class="library-ratings-block__title">{{ t("library.ratingsTopDiagrams") }}</h3>
          <p v-if="leaderboard.topDiagrams.length === 0" class="library-empty">
            {{ t("library.ratingsEmpty") }}
          </p>
          <button
            v-for="diagram in leaderboard.topDiagrams"
            :key="diagram.id"
            class="library-row"
            type="button"
            @click="emit('diagram-pick', diagram.id)"
          >
            <span class="library-row__main">
              <span class="library-row__title">
                <span class="library-badge library-badge--format">
                  {{ getDiagramFormatLabel(diagram.language) }}
                </span>
                {{ diagram.title }}
              </span>
              <span v-if="diagram.avgRating" class="library-row__rating">
                <LibraryStarRating
                  :value="Math.round(diagram.avgRating)"
                  readonly
                  size="sm"
                />
                <span>{{ diagram.avgRating.toFixed(1) }}</span>
                <span>{{ t("library.ratingVotesShort", { votes: diagram.voteCount ?? 0 }) }}</span>
              </span>
            </span>
            <span class="library-row__chevron">›</span>
          </button>
        </section>

        <section class="library-ratings-block">
          <h3 class="library-ratings-block__title">{{ t("library.ratingsTopSections") }}</h3>
          <p v-if="leaderboard.topSections.length === 0" class="library-empty">
            {{ t("library.ratingsEmpty") }}
          </p>
          <button
            v-for="section in leaderboard.topSections"
            :key="section.sectionId"
            class="library-row"
            type="button"
            @click="emit('section-pick', section.sectionId)"
          >
            <span class="library-row__main">
              <span class="library-row__title">{{ section.title }}</span>
              <span class="library-row__meta">
                {{ t("library.ratingsSectionMeta", {
                  diagrams: section.diagramCount,
                  votes: section.totalVotes,
                }) }}
              </span>
            </span>
            <span class="library-row__chevron">›</span>
          </button>
        </section>

        <section class="library-ratings-block">
          <h3 class="library-ratings-block__title">{{ t("library.ratingsTopAuthors") }}</h3>
          <p v-if="leaderboard.topAuthors.length === 0" class="library-empty">
            {{ t("library.ratingsEmpty") }}
          </p>
          <div
            v-for="author in leaderboard.topAuthors"
            :key="author.authorId"
            class="library-row library-row--static"
          >
            <span class="library-row__main">
              <span class="library-row__title">{{ author.username }}</span>
              <span class="library-row__meta">
                {{ t("library.ratingsAuthorMeta", {
                  diagrams: author.diagramCount,
                  votes: author.totalVotes,
                }) }}
              </span>
            </span>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.library-ratings-block {
  margin-bottom: 24px;
}

.library-ratings-block__title {
  margin: 0 0 8px;
  font-size: 0.95rem;
}

.library-row--static {
  cursor: default;
}

.library-badge {
  display: inline-block;
  margin-right: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  vertical-align: middle;
}

.library-badge--format {
  background: var(--accent-muted, #e8f0fe);
  color: var(--accent-color, #1a56db);
}

.library-row__rating {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
</style>
