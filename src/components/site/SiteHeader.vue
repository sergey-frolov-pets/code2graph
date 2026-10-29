<script setup lang="ts">
import InstallAppButton from "@/components/InstallAppButton.vue";
import HeaderControls from "@/components/layout/HeaderControls.vue";
import GithubStarButton from "@/components/site/GithubStarButton.vue";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLocale } from "@/composables/useLocale";
import { useAppRouter } from "@/composables/useAppRouter";
import { APP_LINKS, APP_META } from "@/constants";

const props = withDefaults(defineProps<{ landingNav?: boolean }>(), { landingNav: false });

const { t } = useLocale();
const { navigateTo } = useAppRouter();
const { isLocalMode } = useLibraryApiUrl();

</script>

<template>
  <header
    class="site-header"
    :class="{ 'site-header--landing': props.landingNav }"
  >
    <div class="site-header__row">
      <button
        class="site-header__brand"
        type="button"
        @click="navigateTo('landing')"
      >
        <span class="site-header__logo">{{ APP_META.name }}</span>
        <span
          v-if="props.landingNav"
          class="site-header__tagline"
        >{{ t("site.tagline") }}</span>
      </button>

      <nav class="site-header__nav">
        <HeaderControls />
        <a
          class="btn btn-ghost"
          :href="APP_LINKS.github"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("site.nav.github") }}
        </a>
        <GithubStarButton v-if="props.landingNav" />
        <template v-if="props.landingNav">
          <button
            class="btn btn-ghost"
            type="button"
            @click="navigateTo('mcp')"
          >
            {{ t("site.nav.mcp") }}
          </button>
          <InstallAppButton landing-label />
          <button
            class="btn btn-primary"
            type="button"
            @click="navigateTo('app')"
          >
            {{ t("site.landingCtaApp") }}
          </button>
        </template>
        <template v-else>
          <button
            v-if="!isLocalMode"
            class="btn btn-ghost"
            type="button"
            @click="navigateTo('account')"
          >
            {{ t("site.accountTitle") }}
          </button>
          <button
            v-if="!isLocalMode"
            class="btn btn-ghost"
            type="button"
            @click="navigateTo('login')"
          >
            {{ t("site.landingCtaLogin") }}
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click="navigateTo('app')"
          >
            {{ t("site.landingCtaApp") }}
          </button>
        </template>
      </nav>
    </div>
  </header>
</template>
