<script setup lang="ts">
import GithubStarButton from "@/components/site/GithubStarButton.vue";
import SiteFooter from "@/components/site/SiteFooter.vue";
import LandingDiagramBackground from "@/components/site/LandingDiagramBackground.vue";
import LandingInstallButton from "@/components/site/LandingInstallButton.vue";
import McpConnectionTag from "@/components/site/McpConnectionTag.vue";
import McpResultPreview from "@/components/site/McpResultPreview.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { APP_LINKS } from "@/constants";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";

const { t } = useLocale();
const { navigateTo } = useAppRouter();

const languages = DIAGRAM_LANGUAGE_MODULES.filter((module) => module.site);
</script>

<template>
  <div class="site-page landing-page">
    <LandingDiagramBackground />
    <SiteHeader landing-nav />

    <main class="landing-main">
      <section
        class="landing-section landing-hero"
        aria-labelledby="hero-title"
      >
        <p class="landing-hero__tagline">
          {{ t("site.tagline") }}
        </p>
        <h1
          id="hero-title"
          class="landing-hero__title"
        >
          {{ t("site.hero.title") }}
        </h1>
        <p class="landing-hero__subtitle">
          {{ t("site.hero.subtitle") }}
        </p>
        <div class="landing-hero__actions">
          <button
            class="btn btn-primary btn-lg"
            type="button"
            @click="navigateTo('app')"
          >
            {{ t("site.landingCtaApp") }}
          </button>
          <LandingInstallButton size="large" />
          <a
            class="btn btn-ghost btn-lg"
            :href="APP_LINKS.github"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t("site.hero.viewOnGithub") }}
          </a>
          <GithubStarButton />
          <a
            class="btn btn-ghost btn-lg"
            :href="APP_LINKS.discussions"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t("site.hero.askQuestion") }}
          </a>
        </div>
        <p class="landing-note">
          {{ t("site.offlineNote") }}
        </p>
      </section>

      <section
        id="formats"
        class="landing-section"
        aria-labelledby="languages-title"
      >
        <h2
          id="languages-title"
          class="landing-section__title"
        >
          {{ t("site.languages.title") }}
        </h2>
        <div class="landing-languages">
          <button
            v-for="module in languages"
            :key="module.id"
            class="landing-language-card"
            type="button"
            @click="navigateTo('language', module.id)"
          >
            <strong>{{ t(module.labelKey) }}</strong>
            <span>{{ t(module.site!.purposeKey) }}</span>
          </button>
        </div>
      </section>

      <section
        id="mcp"
        class="landing-section landing-mcp"
        aria-labelledby="mcp-title"
      >
        <h2
          id="mcp-title"
          class="landing-section__title landing-mcp__title"
        >
          {{ t("site.mcp.title") }}
          <McpConnectionTag />
        </h2>
        <p class="landing-mcp__lead">
          {{ t("site.mcp.lead") }}
        </p>
        <ul class="landing-mcp__points">
          <li>{{ t("site.mcp.pointPlan") }}</li>
          <li>{{ t("site.mcp.pointGenerate") }}</li>
          <li>{{ t("site.mcp.pointLanguages") }}</li>
        </ul>
        <McpResultPreview />
        <button
          class="btn btn-primary"
          type="button"
          @click="navigateTo('mcp')"
        >
          {{ t("site.mcp.openPage") }}
        </button>
      </section>

      <section
        id="license"
        class="landing-section landing-license"
        aria-labelledby="license-title"
      >
        <h2
          id="license-title"
          class="landing-section__title"
        >
          {{ t("site.license.title") }}
        </h2>
        <p>{{ t("site.license.summary") }}</p>
        <p>{{ t("site.license.commercial") }}</p>
        <p class="landing-license__links">
          <a
            :href="APP_LINKS.prosperityLicense"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t("site.license.read") }}</a>
          ·
          <a :href="APP_LINKS.commercialContact">{{ t("site.license.commercialLink") }}</a>
        </p>
      </section>

      <p class="landing-stack">
        {{ t("site.stackLead") }}
        <a
          :href="APP_LINKS.vue"
          target="_blank"
          rel="noopener noreferrer"
        >Vue</a>
        ·
        <a
          :href="APP_LINKS.vite"
          target="_blank"
          rel="noopener noreferrer"
        >Vite</a>
      </p>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.landing-note,
.landing-stack {
  margin: 20px 0 0;
  color: var(--text-muted);
}

.landing-languages {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.landing-language-card {
  display: grid;
  gap: 6px;
  text-align: left;
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  color: inherit;
  cursor: pointer;
}

.landing-language-card span {
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.4;
}

.landing-language-card:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
}

.landing-stack a,
.landing-license__links a {
  color: var(--accent);
}

.landing-license {
  display: grid;
  gap: 8px;
  max-width: 720px;
}

.landing-license p {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.landing-mcp {
  display: grid;
  justify-items: center;
  gap: 16px;
  text-align: center;
}

.landing-mcp__title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

@media (max-width: 767px) {
  .landing-mcp__title {
    justify-content: flex-start;
  }
}

.landing-mcp__lead,
.landing-mcp__points {
  margin: 0;
  max-width: 640px;
  color: var(--text-muted);
  line-height: 1.5;
}

.landing-mcp__points {
  text-align: left;
}
</style>
