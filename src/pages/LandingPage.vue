<script setup lang="ts">
import SiteFooter from "@/components/site/SiteFooter.vue";
import LandingDiagramBackground from "@/components/site/LandingDiagramBackground.vue";
import LandingInstallButton from "@/components/site/LandingInstallButton.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { APP_META } from "@/constants";

const { t } = useLocale();
const { navigateTo } = useAppRouter();

const pillarItems = [
  { title: "site.pillars.item1.title", text: "site.pillars.item1.text" },
  { title: "site.pillars.item2.title", text: "site.pillars.item2.text" },
  { title: "site.pillars.item3.title", text: "site.pillars.item3.text" },
] as const;

const deepDiveItems = [
  { title: "site.deepDive.item1.title", text: "site.deepDive.item1.text" },
  { title: "site.deepDive.item2.title", text: "site.deepDive.item2.text" },
  { title: "site.deepDive.item3.title", text: "site.deepDive.item3.text" },
  { title: "site.deepDive.item4.title", text: "site.deepDive.item4.text" },
] as const;

const formatRows = [
  {
    format: "PlantUML",
    purpose: "site.formats.plantuml.purpose",
    features: "site.formats.plantuml.features",
  },
  {
    format: "Mermaid",
    purpose: "site.formats.mermaid.purpose",
    features: "site.formats.mermaid.features",
  },
  {
    format: "GraphML",
    purpose: "site.formats.graphml.purpose",
    features: "site.formats.graphml.features",
  },
] as const;

const audienceCards = [
  {
    title: "site.audience.architect.title",
    items: ["site.audience.architect.item1", "site.audience.architect.item2"],
  },
  {
    title: "site.audience.dev.title",
    items: ["site.audience.dev.item1", "site.audience.dev.item2"],
  },
  {
    title: "site.audience.writer.title",
    items: ["site.audience.writer.item1", "site.audience.writer.item2"],
  },
] as const;

const heroTrustBadges = [
  "site.hero.trustOffline",
  "site.hero.trustAi",
  "site.hero.trustConverter",
  "site.hero.trustPwa",
] as const;

const faqItems = [
  { q: "site.faq.q1", a: "site.faq.a1" },
  { q: "site.faq.q2", a: "site.faq.a2" },
  { q: "site.faq.q3", a: "site.faq.a3" },
  { q: "site.faq.q4", a: "site.faq.a4" },
] as const;
</script>

<template>
  <div class="site-page landing-page">
    <LandingDiagramBackground />
    <SiteHeader landing-nav />

    <main class="landing-main">
      <section class="landing-section landing-hero" aria-labelledby="hero-title">
        <div class="landing-hero__grid">
          <div class="landing-hero__content">
            <p class="landing-hero__tagline">{{ t("site.tagline") }}</p>
            <h1 id="hero-title" class="landing-hero__title">{{ t("site.hero.title") }}</h1>
            <p class="landing-hero__subtitle">{{ t("site.hero.subtitle") }}</p>

            <div class="landing-hero__actions">
              <button class="btn btn-primary btn-lg" type="button" @click="navigateTo('app')">
                {{ t("site.hero.ctaPrimary") }}
              </button>
              <LandingInstallButton size="large" />
            </div>

            <ul class="landing-hero__trust">
              <li v-for="(badgeKey, index) in heroTrustBadges" :key="index">
                {{ t(badgeKey) }}
              </li>
            </ul>
          </div>

          <figure class="landing-hero__visual">
            <img
              class="landing-hero__image"
              :src="APP_META.landingHeroImage"
              :alt="t('site.landingHeroAlt')"
              width="1536"
              height="1024"
              loading="eager"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section
        id="features"
        class="landing-section landing-pillars"
        aria-labelledby="pillars-title"
      >
        <h2 id="pillars-title" class="landing-section__title">{{ t("site.pillars.title") }}</h2>
        <div class="landing-pillars__grid">
          <article v-for="(item, index) in pillarItems" :key="index" class="landing-pillar-card">
            <h3>{{ t(item.title) }}</h3>
            <p>{{ t(item.text) }}</p>
          </article>
        </div>
      </section>

      <section
        id="converter"
        class="landing-section landing-deep-dive"
        aria-labelledby="deep-dive-title"
      >
        <h2 id="deep-dive-title" class="landing-section__title">{{ t("site.deepDive.title") }}</h2>
        <div class="landing-deep-dive__grid">
          <article
            v-for="(item, index) in deepDiveItems"
            :key="index"
            class="landing-deep-dive-card"
          >
            <h3>{{ t(item.title) }}</h3>
            <p>{{ t(item.text) }}</p>
          </article>
        </div>
      </section>

      <section
        id="formats"
        class="landing-section landing-formats"
        aria-labelledby="formats-title"
      >
        <h2 id="formats-title" class="landing-section__title">{{ t("site.formats.title") }}</h2>
        <div class="landing-formats__table-wrap">
          <table class="landing-formats__table">
            <thead>
              <tr>
                <th>{{ t("site.formats.colFormat") }}</th>
                <th>{{ t("site.formats.colPurpose") }}</th>
                <th>{{ t("site.formats.colFeatures") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in formatRows" :key="row.format">
                <th scope="row">{{ row.format }}</th>
                <td :data-label="t('site.formats.colPurpose')">{{ t(row.purpose) }}</td>
                <td :data-label="t('site.formats.colFeatures')">{{ t(row.features) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="audience"
        class="landing-section landing-audience"
        aria-labelledby="audience-title"
      >
        <h2 id="audience-title" class="landing-section__title">{{ t("site.audience.title") }}</h2>
        <div class="landing-audience__grid">
          <article v-for="(card, index) in audienceCards" :key="index" class="landing-audience-card">
            <h3>{{ t(card.title) }}</h3>
            <ul>
              <li v-for="(itemKey, itemIndex) in card.items" :key="itemIndex">{{ t(itemKey) }}</li>
            </ul>
          </article>
        </div>
      </section>

      <section
        id="pwa"
        class="landing-section landing-getting-started"
        aria-labelledby="getting-started-title"
      >
        <h2 id="getting-started-title" class="landing-section__title">
          {{ t("site.gettingStarted.title") }}
        </h2>
        <div class="landing-getting-started__grid">
          <article class="landing-getting-started-card">
            <h3>{{ t("site.gettingStarted.browser.title") }}</h3>
            <p>{{ t("site.gettingStarted.browser.text") }}</p>
          </article>
          <article class="landing-getting-started-card">
            <h3>{{ t("site.gettingStarted.pwa.title") }}</h3>
            <p>{{ t("site.gettingStarted.pwa.text") }}</p>
          </article>
        </div>
      </section>

      <section id="faq" class="landing-section landing-faq" aria-labelledby="faq-title">
        <h2 id="faq-title" class="landing-section__title">{{ t("site.faq.title") }}</h2>
        <div class="landing-faq__list">
          <details v-for="(item, index) in faqItems" :key="index" class="landing-faq__item">
            <summary>{{ t(item.q) }}</summary>
            <p>{{ t(item.a) }}</p>
          </details>
        </div>
      </section>

      <section class="landing-section landing-final-cta" aria-labelledby="final-cta-title">
        <h2 id="final-cta-title" class="landing-section__title">{{ t("site.finalCta.title") }}</h2>
        <p class="landing-final-cta__text">{{ t("site.finalCta.text") }}</p>
        <div class="landing-final-cta__actions">
          <button class="btn btn-primary btn-lg" type="button" @click="navigateTo('app')">
            {{ t("site.finalCta.primary") }}
          </button>
          <LandingInstallButton size="large" />
        </div>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
