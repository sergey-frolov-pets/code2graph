<script setup lang="ts">
import { computed } from "vue";
import SiteFooter from "@/components/site/SiteFooter.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";
import { LANGUAGE_RESOURCES } from "@/languages/resources";
import {
  LANGUAGE_PRIMERS,
  primerExample,
  type LocalizedExample,
} from "@/languages/primer";

const { locale, t } = useLocale();
const { route, navigateTo } = useAppRouter();

const language = computed(() =>
  DIAGRAM_LANGUAGE_MODULES.find((module) => module.id === route.value.languageId) ?? null,
);

const primer = computed(() =>
  language.value ? LANGUAGE_PRIMERS[language.value.id] : null,
);

const resources = computed(() =>
  language.value ? LANGUAGE_RESOURCES[language.value.id] : [],
);

function exampleText(snippet: LocalizedExample): string {
  return primerExample(snippet, locale.value);
}

const siteLinks = computed(() => resources.value.filter((link) => link.kind === "site"));
const libraryLinks = computed(() => resources.value.filter((link) => link.kind === "library"));
</script>

<template>
  <div
    v-if="language?.site && primer"
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

      <section aria-labelledby="language-types-title">
        <h2 id="language-types-title">
          {{ t("site.language.types") }}
        </h2>
        <ul class="language-cards">
          <li
            v-for="diagramType in primer.types"
            :key="diagramType.id"
            class="language-card"
          >
            <h3>{{ t(diagramType.titleKey) }}</h3>
            <p>{{ t(diagramType.summaryKey) }}</p>
            <pre
              class="language-example"
              :aria-label="t('site.language.example')"
            ><code>{{ exampleText(diagramType.example) }}</code></pre>
          </li>
        </ul>
      </section>

      <section aria-labelledby="language-keywords-title">
        <h2 id="language-keywords-title">
          {{ t("site.language.keywords") }}
        </h2>
        <ul class="language-cards">
          <li
            v-for="keyword in primer.keywords"
            :key="keyword.id"
            class="language-card"
          >
            <div class="language-keyword-head">
              <code>{{ keyword.token }}</code>
              <p>{{ t(keyword.hintKey) }}</p>
            </div>
            <pre
              class="language-example"
              :aria-label="t('site.language.example')"
            ><code>{{ exampleText(keyword.example) }}</code></pre>
          </li>
        </ul>
      </section>

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
  width: min(840px, calc(100% - 32px));
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

.language-main .language-cards {
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 12px;
}

.language-card {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.language-card h3 {
  margin: 0;
  font-size: 1rem;
}

.language-card p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.45;
}

.language-keyword-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: baseline;
}

.language-keyword-head code {
  color: var(--accent);
  font-family: var(--font-mono);
  font-weight: 600;
}

.language-keyword-head p {
  flex: 1;
  min-width: 12rem;
}

.language-example {
  margin: 0;
  padding: 10px 12px;
  overflow: auto;
  border-radius: calc(var(--radius) - 4px);
  background: var(--surface-muted);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.45;
}

.language-example code {
  color: inherit;
  font-family: inherit;
}

.language-main a {
  color: var(--accent);
}
</style>
