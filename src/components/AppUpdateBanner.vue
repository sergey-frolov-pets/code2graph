<script setup lang="ts">
import { useAppUpdate } from "@/composables/useAppUpdate";
import { useLocale } from "@/composables/useLocale";

const { t } = useLocale();
const { updateAvailable, applyUpdate, dismissUpdate } = useAppUpdate();
</script>

<template>
  <div v-if="updateAvailable" class="app-update-banner" role="status" aria-live="polite">
    <p class="app-update-banner__text">
      {{ t("pwa.updateAvailable") }}
    </p>
    <div class="app-update-banner__actions">
      <button class="btn btn-primary btn-sm" type="button" @click="applyUpdate">
        {{ t("pwa.updateReload") }}
      </button>
      <button class="btn btn-ghost btn-sm" type="button" @click="dismissUpdate">
        {{ t("pwa.updateDismiss") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.app-update-banner {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: calc(var(--z-dialog) + 1);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border));
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: var(--shadow);
  backdrop-filter: blur(8px);
}

.app-update-banner__text {
  margin: 0;
  font-size: 0.92rem;
}

.app-update-banner__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-sm {
  min-height: 36px;
  padding: 6px 12px;
  font-size: 0.9rem;
}
</style>
