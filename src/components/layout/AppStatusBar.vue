<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { APP_META } from "@/constants";
import {
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  loadedFileName: string;
  renderMode: RenderMode;
}>();

const { t } = useLocale();
const statusBarRef = ref<HTMLElement | null>(null);
let statusBarObserver: ResizeObserver | null = null;

const renderModeLabel = computed(() =>
  isOnlineRenderMode(props.renderMode)
    ? t("app.online")
    : t("app.offline"),
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
      class="status-pill status-pill--inline"
      :class="isOnlineRenderMode(renderMode) ? 'is-ready' : 'is-error'"
    >
      {{ renderModeLabel }}
    </span>
    <span class="status-bar__copyright">{{ APP_META.copyright }}</span>
  </footer>
</template>
