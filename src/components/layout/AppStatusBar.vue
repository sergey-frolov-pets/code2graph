<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import DeveloperBrand from "@/components/DeveloperBrand.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  loadedFileName: string;
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
    <span class="status-bar__copyright">
      <span class="status-bar__copyright-year">© 2026</span>
      <DeveloperBrand size="sm" />
    </span>
  </footer>
</template>
