<script setup lang="ts">
import DeveloperBrand from "@/components/DeveloperBrand.vue";
import { useLocale } from "@/composables/useLocale";
import { APP_META } from "@/constants";

const { t } = useLocale();
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__brand">
      <span class="site-footer__year">© 2026</span>
      <DeveloperBrand size="sm" />
    </div>
    <span class="site-footer__version" :title="t('site.versionHint')">
      v{{ APP_META.version }}
    </span>
  </footer>
</template>
