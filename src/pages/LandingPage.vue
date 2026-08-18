<script setup lang="ts">
import SiteFooter from "@/components/site/SiteFooter.vue";
import LandingDiagramBackground from "@/components/site/LandingDiagramBackground.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";

const { t } = useLocale();
const { navigateTo } = useAppRouter();

const painRows = [
  {
    problem: "site.pain.row1.problem",
    current: "site.pain.row1.current",
    solution: "site.pain.row1.solution",
  },
  {
    problem: "site.pain.row2.problem",
    current: "site.pain.row2.current",
    solution: "site.pain.row2.solution",
  },
  {
    problem: "site.pain.row3.problem",
    current: "site.pain.row3.current",
    solution: "site.pain.row3.solution",
  },
  {
    problem: "site.pain.row4.problem",
    current: "site.pain.row4.current",
    solution: "site.pain.row4.solution",
  },
] as const;

const featureItems = [
  {
    title: "site.features.item1.title",
    what: "site.features.item1.what",
    benefit: "site.features.item1.benefit",
  },
  {
    title: "site.features.item2.title",
    what: "site.features.item2.what",
    benefit: "site.features.item2.benefit",
  },
  {
    title: "site.features.item3.title",
    what: "site.features.item3.what",
    benefit: "site.features.item3.benefit",
  },
  {
    title: "site.features.item4.title",
    what: "site.features.item4.what",
    benefit: "site.features.item4.benefit",
  },
] as const;

const audienceCards = [
  {
    title: "site.audience.lead.title",
    items: ["site.audience.lead.item1", "site.audience.lead.item2"],
  },
  {
    title: "site.audience.architect.title",
    items: ["site.audience.architect.item1", "site.audience.architect.item2"],
  },
  {
    title: "site.audience.dev.title",
    items: ["site.audience.dev.item1", "site.audience.dev.item2"],
  },
  {
    title: "site.audience.cto.title",
    items: ["site.audience.cto.item1", "site.audience.cto.item2"],
  },
] as const;

const howSteps = [
  { title: "site.how.step1.title", text: "site.how.step1.text" },
  { title: "site.how.step2.title", text: "site.how.step2.text" },
  { title: "site.how.step3.title", text: "site.how.step3.text" },
] as const;

const metrics = [
  "site.metrics.item1",
  "site.metrics.item2",
  "site.metrics.item3",
] as const;

const pricingPlans = [
  {
    id: "starter",
    popular: false,
    name: "site.pricing.starter.name",
    desc: "site.pricing.starter.desc",
    features: [
      "site.pricing.starter.feature1",
      "site.pricing.starter.feature2",
      "site.pricing.starter.feature3",
    ],
    price: "site.pricing.starter.price",
    cta: "site.pricing.starter.cta",
    action: "register" as const,
  },
  {
    id: "team",
    popular: true,
    name: "site.pricing.team.name",
    desc: "site.pricing.team.desc",
    features: [
      "site.pricing.team.feature1",
      "site.pricing.team.feature2",
      "site.pricing.team.feature3",
      "site.pricing.team.feature4",
    ],
    price: "site.pricing.team.price",
    cta: "site.pricing.team.cta",
    action: "register" as const,
  },
  {
    id: "enterprise",
    popular: false,
    name: "site.pricing.enterprise.name",
    desc: "site.pricing.enterprise.desc",
    features: [
      "site.pricing.enterprise.feature1",
      "site.pricing.enterprise.feature2",
      "site.pricing.enterprise.feature3",
      "site.pricing.enterprise.feature4",
    ],
    price: "site.pricing.enterprise.price",
    cta: "site.pricing.enterprise.cta",
    action: "mailto" as const,
  },
] as const;

const faqItems = [
  { q: "site.faq.q1", a: "site.faq.a1" },
  { q: "site.faq.q2", a: "site.faq.a2" },
  { q: "site.faq.q3", a: "site.faq.a3" },
  { q: "site.faq.q4", a: "site.faq.a4" },
] as const;

function onPricingAction(action: "register" | "mailto"): void {
  if (action === "register") {
    navigateTo("register");
    return;
  }

  window.location.href = "mailto:support@code2graph.ru?subject=Code2Graph Enterprise";
}
</script>

<template>
  <div class="site-page landing-page">
    <LandingDiagramBackground />
    <SiteHeader landing-nav />

    <main class="landing-main">
      <section class="landing-section landing-hero" aria-labelledby="hero-title">
        <div class="landing-hero__grid">
          <div class="landing-hero__content">
            <h1 id="hero-title" class="landing-hero__title">{{ t("site.hero.title") }}</h1>
            <p class="landing-hero__subtitle">{{ t("site.hero.subtitle") }}</p>

            <div class="landing-hero__actions">
              <div class="landing-hero__cta-primary">
                <button class="btn btn-primary btn-lg" type="button" @click="navigateTo('register')">
                  {{ t("site.hero.ctaPrimary") }}
                </button>
                <span class="landing-hero__cta-note">{{ t("site.hero.ctaPrimaryNote") }}</span>
              </div>
              <button class="btn btn-lg" type="button" @click="navigateTo('app')">
                {{ t("site.hero.ctaSecondary") }}
              </button>
            </div>

            <ul class="landing-hero__trust">
              <li>{{ t("site.hero.trustSecurity") }}</li>
              <li>{{ t("site.hero.trustLanguages") }}</li>
            </ul>
          </div>

          <figure class="landing-hero__visual">
            <img
              class="landing-hero__image"
              src="/images/landing-workflow.svg"
              :alt="t('site.landingHeroAlt')"
              width="1200"
              height="675"
              loading="eager"
              decoding="async"
            />
          </figure>
        </div>
      </section>

      <section id="pain" class="landing-section landing-pain" aria-labelledby="pain-title">
        <h2 id="pain-title" class="landing-section__title">{{ t("site.pain.title") }}</h2>
        <div class="landing-pain__table-wrap">
          <table class="landing-pain__table">
            <thead>
              <tr>
                <th>{{ t("site.pain.colProblem") }}</th>
                <th>{{ t("site.pain.colCurrent") }}</th>
                <th>{{ t("site.pain.colSolution") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in painRows" :key="index">
                <th scope="row">{{ t(row.problem) }}</th>
                <td :data-label="t('site.pain.colCurrent')">{{ t(row.current) }}</td>
                <td :data-label="t('site.pain.colSolution')">{{ t(row.solution) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        id="features"
        class="landing-section landing-features-block"
        aria-labelledby="features-title"
      >
        <h2 id="features-title" class="landing-section__title">{{ t("site.features.title") }}</h2>
        <div class="landing-features-grid">
          <article v-for="(item, index) in featureItems" :key="index" class="landing-feature-card">
            <h3>{{ t(item.title) }}</h3>
            <p>
              <strong>{{ t("site.features.whatLabel") }}:</strong>
              {{ t(item.what) }}
            </p>
            <p>
              <strong>{{ t("site.features.benefitLabel") }}:</strong>
              {{ t(item.benefit) }}
            </p>
          </article>
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

      <section id="how" class="landing-section landing-how" aria-labelledby="how-title">
        <h2 id="how-title" class="landing-section__title">{{ t("site.how.title") }}</h2>
        <ol class="landing-how__steps">
          <li v-for="(step, index) in howSteps" :key="index" class="landing-how__step">
            <h3>{{ t(step.title) }}</h3>
            <p>{{ t(step.text) }}</p>
          </li>
        </ol>
      </section>

      <section class="landing-section landing-metrics" aria-labelledby="metrics-title">
        <h2 id="metrics-title" class="landing-section__title">{{ t("site.metrics.title") }}</h2>
        <ul class="landing-metrics__list">
          <li v-for="(metricKey, index) in metrics" :key="index">{{ t(metricKey) }}</li>
        </ul>
      </section>

      <section
        id="pricing"
        class="landing-section landing-pricing"
        aria-labelledby="pricing-title"
      >
        <h2 id="pricing-title" class="landing-section__title">{{ t("site.pricing.title") }}</h2>
        <div class="landing-pricing__grid">
          <article
            v-for="plan in pricingPlans"
            :key="plan.id"
            class="landing-pricing-card"
            :class="{ 'landing-pricing-card--popular': plan.popular }"
          >
            <p v-if="plan.popular" class="landing-pricing-card__badge">
              {{ t("site.pricing.popular") }}
            </p>
            <h3>{{ t(plan.name) }}</h3>
            <p class="landing-pricing-card__desc">{{ t(plan.desc) }}</p>
            <ul>
              <li v-for="(featureKey, index) in plan.features" :key="index">{{ t(featureKey) }}</li>
            </ul>
            <p class="landing-pricing-card__price">{{ t(plan.price) }}</p>
            <button
              class="btn"
              :class="plan.popular ? 'btn-primary' : 'btn-ghost'"
              type="button"
              @click="onPricingAction(plan.action)"
            >
              {{ t(plan.cta) }}
            </button>
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
        <button class="btn btn-primary btn-lg" type="button" @click="navigateTo('register')">
          {{ t("site.finalCta.button") }}
        </button>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>
