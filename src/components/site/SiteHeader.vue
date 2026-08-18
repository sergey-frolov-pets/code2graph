<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { useAppRouter } from "@/composables/useAppRouter";
import HeaderControls from "@/components/layout/HeaderControls.vue";
import { APP_META } from "@/constants";

const props = withDefaults(defineProps<{ landingNav?: boolean }>(), { landingNav: false });

const { t } = useLocale();
const { navigateTo } = useAppRouter();

const landingSections = [
  { id: "features", labelKey: "site.nav.features" },
  { id: "audience", labelKey: "site.nav.audience" },
  { id: "how", labelKey: "site.nav.how" },
  { id: "pricing", labelKey: "site.nav.pricing" },
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
  <header class="site-header">
    <button class="site-header__brand" type="button" @click="navigateTo('landing')">
      <span class="site-header__logo">{{ APP_META.name }}</span>
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
        <button class="btn btn-ghost" type="button" @click="navigateTo('login')">
          {{ t("site.landingCtaLogin") }}
        </button>
        <button class="btn btn-ghost" type="button" @click="navigateTo('app')">
          {{ t("site.landingCtaDemo") }}
        </button>
        <button class="btn btn-primary" type="button" @click="navigateTo('register')">
          {{ t("site.landingCtaTryFree") }}
        </button>
      </template>
      <template v-else>
        <button class="btn btn-ghost" type="button" @click="navigateTo('login')">
          {{ t("site.landingCtaLogin") }}
        </button>
        <button class="btn btn-primary" type="button" @click="navigateTo('app')">
          {{ t("site.landingCtaApp") }}
        </button>
      </template>
    </nav>
  </header>
</template>
