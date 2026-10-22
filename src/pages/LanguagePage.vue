<script setup lang="ts">
import { computed } from "vue";
import SiteFooter from "@/components/site/SiteFooter.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";
import {
  LANGUAGE_GUIDES,
  resolveLocalizedSnippet,
  type LocalizedSnippet,
} from "@/languages/wiremark-reference";
import { LANGUAGE_RESOURCES } from "@/languages/resources";

const { t, locale } = useLocale();
const { route, navigateTo } = useAppRouter();

const language = computed(() =>
  DIAGRAM_LANGUAGE_MODULES.find((module) => module.id === route.value.languageId) ?? null,
);

const resources = computed(() =>
  language.value ? LANGUAGE_RESOURCES[language.value.id] : [],
);

const guide = computed(() =>
  language.value ? LANGUAGE_GUIDES[language.value.id] : undefined,
);

const siteLinks = computed(() => resources.value.filter((link) => link.kind === "site"));
const libraryLinks = computed(() => resources.value.filter((link) => link.kind === "library"));

function exampleOf(snippet: LocalizedSnippet): string {
  return resolveLocalizedSnippet(snippet, locale.value);
}
</script>

<template>
  <div
    v-if="language?.site"
    class="site-page language-page"
  >
    <SiteHeader />

    <main
      class="language-main"
      :class="{ 'language-main--guide': guide }"
    >
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

      <template v-if="guide">
        <section aria-labelledby="language-types-title">
          <h2 id="language-types-title">
            {{ t("site.language.diagramTypes") }}
          </h2>
          <p class="language-lead">
            {{ t(guide.typesLeadKey) }}
          </p>
          <div class="language-entries">
            <article
              v-for="diagramType in guide.diagramTypes"
              :key="diagramType.id"
              class="language-entry"
              :aria-labelledby="`diagram-type-${diagramType.id}`"
            >
              <h3 :id="`diagram-type-${diagramType.id}`">
                {{ t(diagramType.titleKey) }}
              </h3>
              <p>{{ t(diagramType.descriptionKey) }}</p>
              <pre class="language-example"><code>{{ exampleOf(diagramType.example) }}</code></pre>
            </article>
          </div>
        </section>

        <section aria-labelledby="language-keywords-title">
          <h2 id="language-keywords-title">
            {{ t("site.language.keywords") }}
          </h2>
          <p class="language-lead">
            {{ t(guide.keywordsLeadKey) }}
          </p>
          <p class="language-docs">
            <a
              :href="guide.componentsHref"
              target="_blank"
              rel="noopener noreferrer"
            >{{ t(guide.componentsLabelKey) }}</a>
            ·
            <a
              :href="guide.iconsHref"
              target="_blank"
              rel="noopener noreferrer"
            >{{ t(guide.iconsLabelKey) }}</a>
          </p>
          <div class="language-groups">
            <section
              v-for="group in guide.keywordGroups"
              :key="group.id"
              class="language-group"
              :aria-labelledby="`keyword-group-${group.id}`"
            >
              <h3 :id="`keyword-group-${group.id}`">
                {{ t(group.titleKey) }}
              </h3>
              <div class="language-keywords">
                <article
                  v-for="keyword in group.keywords"
                  :key="keyword.id"
                  class="language-entry"
                  :aria-labelledby="`keyword-${keyword.id}`"
                >
                  <h4 :id="`keyword-${keyword.id}`">
                    <code>{{ keyword.name }}</code>
                  </h4>
                  <p>{{ t(keyword.descriptionKey) }}</p>
                  <pre class="language-example"><code>{{ exampleOf(keyword.example) }}</code></pre>
                </article>
              </div>
            </section>
          </div>
        </section>
      </template>

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

.language-main--guide {
  width: min(960px, calc(100% - 32px));
}

.language-back {
  justify-self: start;
}

.language-main h1 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
}

.language-summary,
.language-features,
.language-lead,
.language-entry p,
.language-docs {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.language-main h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.language-main h3,
.language-main h4 {
  margin: 0;
}

.language-main h4 {
  font-size: 0.95rem;
}

.language-main ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 6px;
}

.language-main a,
.language-main code {
  color: var(--accent);
}

.language-entries,
.language-groups,
.language-keywords {
  display: grid;
  gap: 12px;
}

.language-keywords {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.language-entry {
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.language-example {
  margin: 0;
  padding: 12px 14px;
  overflow: auto;
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.language-example code {
  color: inherit;
}
</style>
