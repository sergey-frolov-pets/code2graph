<script setup lang="ts">
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { APP_META } from "@/constants";

const { t } = useLocale();
const { navigateTo } = useAppRouter();
</script>

<template>
  <div class="site-page landing-page">
    <SiteHeader />

    <main class="landing-hero">
      <div class="landing-hero__grid">
        <div class="landing-hero__content">
          <p class="landing-hero__badge">PlantUML · Mermaid · GraphML</p>
          <h1 class="landing-hero__title">{{ t("site.landingTitle") }}</h1>
          <p class="landing-hero__subtitle">{{ t("site.landingSubtitle") }}</p>
          <div class="landing-hero__actions">
            <button class="btn btn-primary btn-lg" type="button" @click="navigateTo('app')">
              {{ t("site.landingCtaApp") }}
            </button>
            <button class="btn btn-lg" type="button" @click="navigateTo('register')">
              {{ t("site.landingCtaRegister") }}
            </button>
            <button class="btn btn-ghost btn-lg" type="button" @click="navigateTo('login')">
              {{ t("site.landingCtaLogin") }}
            </button>
          </div>
        </div>

        <figure class="landing-hero__visual">
          <img
            class="landing-hero__image"
            src="./images/landing-workflow.png"
            :alt="t('site.landingHeroAlt')"
            width="1200"
            height="675"
            loading="eager"
            decoding="async"
          />
        </figure>
      </div>

      <ul class="landing-features">
        <li>{{ t("site.featureOffline") }}</li>
        <li>{{ t("site.featureFormats") }}</li>
        <li>{{ t("site.featureAi") }}</li>
        <li>{{ t("site.featureLibrary") }}</li>
        <li>{{ t("site.featureLlmLocal") }}</li>
      </ul>
    </main>

    <footer class="site-footer">
      <span>{{ APP_META.copyright }}</span>
    </footer>
  </div>
</template>
