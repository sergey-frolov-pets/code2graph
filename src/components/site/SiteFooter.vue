<script setup lang="ts">
import DeveloperBrand from "@/components/DeveloperBrand.vue";
import { useLocale } from "@/composables/useLocale";
import { APP_LINKS, APP_META } from "@/constants";

const { t } = useLocale();
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__brand">
      <span class="site-footer__year">© 2026</span>
      <DeveloperBrand size="sm" />
    </div>
    <nav class="site-footer__links" :aria-label="t('site.footer.links')">
      <a
        :href="APP_LINKS.github"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t("site.nav.github") }}
      </a>
      <a
        :href="APP_LINKS.discussions"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ t("site.nav.discussions") }}
      </a>
    </nav>
    <p class="site-footer__license">
      {{ t("site.license.summary") }}
      <a
        :href="APP_LINKS.prosperityLicense"
        target="_blank"
        rel="noopener noreferrer"
      >{{ t("site.license.read") }}</a>
      ·
      <a :href="APP_LINKS.commercialContact">{{ t("site.license.commercialLink") }}</a>
    </p>
    <div class="site-footer__meta">
      <span class="site-footer__version" :title="t('site.versionHint')">
        v{{ APP_META.version }}
      </span>
      <a
        class="site-footer__donate"
        href="https://boosty.to/fsvibe/donate"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Support the project"
        title="Support the project"
      >
        <svg viewBox="0 0 576 512" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M163.9 136.9c-29.4-29.8-29.4-78.2 0-108s77-29.8 106.4 0l17.7 18 17.7-18c29.4-29.8 77-29.8 106.4 0s29.4 78.2 0 108L310.5 240.1c-6.2 6.3-14.3 9.4-22.5 9.4s-16.3-3.1-22.5-9.4L163.9 136.9zM568.2 336.3c13.1 17.8 9.3 42.8-8.5 55.9L433.1 485.5c-23.4 17.2-51.6 26.5-80.7 26.5H192 32c-17.7 0-32-14.3-32-32V416c0-17.7 14.3-32 32-32H68.8l44.9-36c22.7-18.2 50.9-28 80-28H272h16 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H288 272c-8.8 0-16 7.2-16 16s7.2 16 16 16H392.6l119.7-88.2c17.8-13.1 42.8-9.3 55.9 8.5zM193.6 384l0 0-.9 0c.3 0 .6 0 .9 0z" />
        </svg>
      </a>
    </div>
  </footer>
</template>
