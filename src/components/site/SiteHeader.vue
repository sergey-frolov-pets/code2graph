<script setup lang="ts">
import InstallAppButton from "@/components/InstallAppButton.vue";
import HeaderControls from "@/components/layout/HeaderControls.vue";
import { useLocale } from "@/composables/useLocale";
import { useAppRouter } from "@/composables/useAppRouter";
import { APP_META } from "@/constants";

const props = withDefaults(defineProps<{ landingNav?: boolean }>(), { landingNav: false });

const { t } = useLocale();
const { navigateTo } = useAppRouter();

const landingSections = [
  { id: "features", labelKey: "site.nav.features" },
  { id: "converter", labelKey: "site.nav.converter" },
  { id: "pwa", labelKey: "site.nav.pwa" },
  { id: "formats", labelKey: "site.nav.formats" },
  { id: "faq", labelKey: "site.nav.faq" },
] as const;

function scrollToSection(sectionId: string): void {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
</script>

<template>
  <header class="site-header" :class="{ 'site-header--landing': props.landingNav }">
    <div class="site-header__row">
      <button class="site-header__brand" type="button" @click="navigateTo('landing')">
        <span class="site-header__logo">{{ APP_META.name }}</span>
        <span v-if="props.landingNav" class="site-header__tagline">{{ t("site.tagline") }}</span>
      </button>

      <nav v-if="props.landingNav" class="site-header__links" aria-label="Landing sections">
        <button
          v-for="section in landingSections"
          :key="section.id"
          class="site-header__link"
          type="button"
          @click="scrollToSection(section.id)"
        >
          {{ t(section.labelKey) }}
        </button>
      </nav>

      <nav class="site-header__nav">
        <HeaderControls />
        <template v-if="props.landingNav">
          <InstallAppButton landing-label />
          <button class="btn btn-primary" type="button" @click="navigateTo('app')">
            {{ t("site.landingCtaApp") }}
          </button>
        </template>
        <template v-else>
          <button class="btn btn-ghost" type="button" @click="navigateTo('account')">
            {{ t("site.accountTitle") }}
          </button>
          <button class="btn btn-ghost" type="button" @click="navigateTo('login')">
            {{ t("site.landingCtaLogin") }}
          </button>
          <button class="btn btn-primary" type="button" @click="navigateTo('app')">
            {{ t("site.landingCtaApp") }}
          </button>
        </template>
      </nav>
    </div>

    <nav
      v-if="props.landingNav"
      class="site-header__scroll-links"
      aria-label="Landing sections"
    >
      <button
        v-for="section in landingSections"
        :key="`mobile-${section.id}`"
        class="site-header__scroll-link"
        type="button"
        @click="scrollToSection(section.id)"
      >
        {{ t(section.labelKey) }}
      </button>
    </nav>
  </header>
</template>
