<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import { APP_LINKS } from "@/constants";
import {
  GITHUB_REPOSITORY,
  GITHUB_STAR_CACHE_TTL_MS,
  githubApiAcceptHeader,
  githubRepositoryApiUrl,
  githubStarCacheKey,
  readCachedStarCount,
  writeCachedStarCount,
} from "@/components/site/github-stars";

const { t } = useLocale();
const countLabel = ref("★");
const cacheKey = githubStarCacheKey(GITHUB_REPOSITORY);

onMounted(() => {
  const nowMs = Date.now();
  const cached = readCachedStarCount(
    localStorage.getItem(cacheKey),
    nowMs,
    GITHUB_STAR_CACHE_TTL_MS,
  );
  if (cached !== null) {
    countLabel.value = cached.toLocaleString();
    return;
  }

  fetch(githubRepositoryApiUrl(GITHUB_REPOSITORY), {
    headers: { Accept: githubApiAcceptHeader() },
  })
    .then((response) => (response.ok ? response.json() : Promise.reject(response)))
    .then((data: { stargazers_count?: number }) => {
      const count = data.stargazers_count ?? 0;
      countLabel.value = count.toLocaleString();
      localStorage.setItem(cacheKey, writeCachedStarCount(count, Date.now()));
    })
    .catch(() => {
      // Keep the star placeholder when GitHub is unreachable.
    });
});
</script>

<template>
  <a
    class="gh-star-btn"
    :href="APP_LINKS.github"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="t('site.github.starLabel')"
  >
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
    <span>{{ t("site.github.star") }}</span>
    <span class="gh-star-count">{{ countLabel }}</span>
  </a>
</template>

<style scoped>
.gh-star-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.4em 0.8em;
  border: 1px solid var(--border);
  border-radius: 6px;
  font: inherit;
  text-decoration: none;
  color: inherit;
  background: transparent;
}

.gh-star-btn:hover {
  background: var(--surface);
}

.gh-star-count {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
</style>
