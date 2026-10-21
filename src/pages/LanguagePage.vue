<script setup lang="ts">
import { computed } from "vue";
import SiteFooter from "@/components/site/SiteFooter.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";
import { LANGUAGE_RESOURCES } from "@/languages/resources";

const { t } = useLocale();
const { route, navigateTo } = useAppRouter();

const language = computed(() =>
  DIAGRAM_LANGUAGE_MODULES.find((module) => module.id === route.value.languageId) ?? null,
);

const resources = computed(() =>
  language.value ? LANGUAGE_RESOURCES[language.value.id] : [],
);

const siteLinks = computed(() => resources.value.filter((link) => link.kind === "site"));
const libraryLinks = computed(() => resources.value.filter((link) => link.kind === "library"));
</script>

<template>
  <div
    v-if="language?.site"
    class="site-page language-page"
  >
    <SiteHeader />

    <main class="language-main">
      <button
        class="btn btn-ghost language-back"
        type="button"
        @click="navigateTo('landing')"
      >
        {{ t("site.backHome") }}
      </button>

      <h1>{{ t(language.labelKey) }}</h1>
      <p class="language-summary">
        {{ t(language.site.summaryKey) }}
      </p>
      <p class="language-features">
        {{ t(language.site.featuresKey) }}
      </p>

      <section aria-labelledby="language-sites-title">
        <h2 id="language-sites-title">
          {{ t("site.language.sites") }}
        </h2>
        <ul>
          <li
            v-for="link in siteLinks"
            :key="link.href"
          >
            <a
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
            >{{ link.label }}</a>
          </li>
        </ul>
      </section>

      <section aria-labelledby="language-libraries-title">
        <h2 id="language-libraries-title">
          {{ t("site.language.libraries") }}
        </h2>
        <ul>
          <li
            v-for="link in libraryLinks"
            :key="link.href"
          >
            <a
              :href="link.href"
              target="_blank"
              rel="noopener noreferrer"
            >{{ link.label }}</a>
          </li>
        </ul>
      </section>

      <button
        class="btn btn-primary"
        type="button"
        @click="navigateTo('app')"
      >
        {{ t("site.openEditor") }}
      </button>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.language-main {
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 64px;
  display: grid;
  gap: 16px;
}

.language-back {
  justify-self: start;
}

.language-main h1 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
}

.language-summary,
.language-features {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.language-main h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.language-main ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 6px;
}

.language-main a {
  color: var(--accent);
}
</style>
