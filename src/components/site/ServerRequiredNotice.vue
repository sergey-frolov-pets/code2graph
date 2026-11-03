<script setup lang="ts">
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";

const { t } = useLocale();
const { navigateTo } = useAppRouter();
</script>

<template>
  <div class="site-page auth-page">
    <SiteHeader />

    <main class="auth-card">
      <h1>{{ t("site.staticModeTitle") }}</h1>
      <p class="auth-card__subtitle">
        {{ t("site.staticModeText") }}
      </p>

      <div class="auth-card__actions">
        <button
          class="btn btn-primary"
          type="button"
          @click="navigateTo('app')"
        >
          {{ t("site.openEditor") }}
        </button>
        <button
          class="btn"
          type="button"
          @click="navigateTo('landing')"
        >
          {{ t("site.backHome") }}
        </button>
      </div>
    </main>
  </div>
</template>
