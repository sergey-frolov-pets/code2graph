<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { useAppRouter } from "@/composables/useAppRouter";
import { APP_META } from "@/constants";

const { t } = useLocale();
const { navigateTo } = useAppRouter();
</script>

<template>
  <header class="site-header">
    <button class="site-header__brand" type="button" @click="navigateTo('landing')">
      <span class="site-header__logo">{{ APP_META.name }}</span>
    </button>
    <nav class="site-header__nav">
      <button class="btn btn-ghost" type="button" @click="navigateTo('login')">
        {{ t("site.landingCtaLogin") }}
      </button>
      <button class="btn btn-primary" type="button" @click="navigateTo('app')">
        {{ t("site.landingCtaApp") }}
      </button>
    </nav>
  </header>
</template>
