<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { APP_META } from "@/constants";
import type { LayoutEngine } from "@/constants";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  loadedFileName: string;
  layout: LayoutEngine;
  engineReady: boolean;
  engineStatus: string;
}>();

const { t } = useLocale();
const statusBarRef = ref<HTMLElement | null>(null);
let statusBarObserver: ResizeObserver | null = null;

onMounted(() => {
  const updateStatusBarHeight = (): void => {
    const height = statusBarRef.value?.offsetHeight ?? 42;
    document.documentElement.style.setProperty(
      "--status-bar-height",
      `${height}px`,
    );
  };

  updateStatusBarHeight();

  if (statusBarRef.value) {
    statusBarObserver = new ResizeObserver(updateStatusBarHeight);
    statusBarObserver.observe(statusBarRef.value);
  }
});

onUnmounted(() => {
  statusBarObserver?.disconnect();
  statusBarObserver = null;
});
</script>

<template>
  <footer ref="statusBarRef" class="status-bar">
    <span>{{ t("app.file") }}: {{ loadedFileName }}</span>
    <span class="status-bar__engine">
      <span>{{ t("app.engine") }}: {{ layout }}</span>
      <span
        v-if="engineReady"
        class="status-bar__engine-ok"
        :aria-label="t('app.engineReady')"
        :title="t('app.engineReady')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 12.5 10 16.5 18 7.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span v-else class="status-pill is-error status-pill--inline">{{
        engineStatus
      }}</span>
    </span>
    <span class="status-bar__copyright">{{ APP_META.copyright }}</span>
  </footer>
</template>
