<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import { usePwaInstall } from "@/composables/usePwaInstall";
import { STORAGE_KEY_PWA_BANNER_DISMISSED } from "@/constants/pwa-settings";
import { readStorageBoolean, writeStorageItem } from "@/utils/safe-storage";

const { t } = useLocale();
const {
  canShowInstallButton,
  isAlreadyInstalled,
  isInstalling,
  installApp,
} = usePwaInstall();

const dismissed = ref(false);
const ready = ref(false);

const visible = computed(
  () =>
    ready.value &&
    !dismissed.value &&
    canShowInstallButton.value &&
    !isAlreadyInstalled.value,
);

onMounted(() => {
  dismissed.value = readStorageBoolean(STORAGE_KEY_PWA_BANNER_DISMISSED) ?? false;
  ready.value = true;
});

function dismissBanner(): void {
  dismissed.value = true;
  writeStorageItem(STORAGE_KEY_PWA_BANNER_DISMISSED, "true");
}

async function onInstallClick(): Promise<void> {
  await installApp();
  if (isAlreadyInstalled.value) {
    dismissBanner();
  }
}
</script>

<template>
  <div v-if="visible" class="pwa-install-banner" role="dialog" aria-labelledby="pwa-banner-title">
    <div class="pwa-install-banner__content">
      <p id="pwa-banner-title" class="pwa-install-banner__title">
        {{ t("pwa.bannerTitle") }}
      </p>
      <p class="pwa-install-banner__description">
        {{ t("pwa.bannerDescription") }}
      </p>
      <div class="pwa-install-banner__actions">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="isInstalling"
          @click="onInstallClick"
        >
          {{ isInstalling ? t("app.loading") : t("install.label") }}
        </button>
        <button class="btn" type="button" @click="dismissBanner">
          {{ t("pwa.bannerDismiss") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pwa-install-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 130;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(
    to top,
    color-mix(in srgb, var(--surface) 96%, transparent),
    transparent
  );
  pointer-events: none;
}

.pwa-install-banner__content {
  pointer-events: auto;
  max-width: 560px;
  margin: 0 auto;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.pwa-install-banner__title {
  margin: 0 0 6px;
  font-size: 0.95rem;
  font-weight: 600;
}

.pwa-install-banner__description {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.pwa-install-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
