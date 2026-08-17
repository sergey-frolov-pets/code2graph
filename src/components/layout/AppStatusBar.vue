<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import DeveloperBrand from "@/components/DeveloperBrand.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { type LayoutEngine } from "@/constants";
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
      <ActionIcon
        :name="isOnlineMode ? 'globe' : 'unlink'"
        class="status-bar__mode-icon"
        :class="isOnlineMode ? 'is-online' : 'is-offline'"
      />
    </span>
    <span class="status-bar__copyright">
      <span class="status-bar__copyright-year">© 2026</span>
      <DeveloperBrand size="sm" />
    </span>
  </footer>
</template>
