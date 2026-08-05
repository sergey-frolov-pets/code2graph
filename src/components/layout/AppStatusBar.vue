<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { APP_META, type LayoutEngine } from "@/constants";
import {
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  loadedFileName: string;
  layout: LayoutEngine;
  renderMode: RenderMode;
}>();

const { t } = useLocale();
const statusBarRef = ref<HTMLElement | null>(null);
let statusBarObserver: ResizeObserver | null = null;

const isOnlineMode = computed(() => isOnlineRenderMode(props.renderMode));

const renderModeLabel = computed(() =>
  isOnlineMode.value ? t("app.online") : t("app.offline"),
);

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
    <span
      class="status-bar__engine"
      :title="renderModeLabel"
      :aria-label="`${layout}, ${renderModeLabel}`"
    >
      <span>{{ layout }}</span>
      <span
        class="status-bar__mode-icon"
        :class="isOnlineMode ? 'is-online' : 'is-offline'"
        aria-hidden="true"
      >
        <svg v-if="isOnlineMode" viewBox="0 0 24 24">
          <path
            d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24">
          <path
            d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </span>
    <span class="status-bar__copyright">{{ APP_META.copyright }}</span>
  </footer>
</template>
