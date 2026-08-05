<script setup lang="ts">
import { computed } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  isRendering: boolean;
  canExport: boolean;
  previewBackground: string;
  diagramDarkMode: boolean;
}>();

const emit = defineEmits<{
  exportSvg: [];
  exportPng: [];
  renderNow: [];
  zoomIn: [];
  zoomOut: [];
  "update:previewBackground": [value: string];
  "update:diagramDarkMode": [value: boolean];
}>();

const { t } = useLocale();

const themeToggleLabel = computed(() =>
  props.diagramDarkMode ? t("toolbar.themeToLight") : t("toolbar.themeToDark"),
);

function toggleDiagramTheme(): void {
  emit("update:diagramDarkMode", !props.diagramDarkMode);
}
</script>

<template>
  <div class="preview-toolbar">
    <TooltipWrap :label="t('toolbar.previewBackground')">
      <label class="preview-toolbar__color-field">
        <span class="sr-only">{{ t("toolbar.previewBackground") }}</span>
        <input
          class="preview-toolbar__color"
          type="color"
          :value="previewBackground"
          @input="
            emit(
              'update:previewBackground',
              ($event.target as HTMLInputElement).value,
            )
          "
        />
      </label>
    </TooltipWrap>

    <IconButton :label="t('toolbar.zoomOut')" @click="emit('zoomOut')">
      <ActionIcon name="zoom-out" />
    </IconButton>

    <IconButton :label="t('toolbar.zoomIn')" @click="emit('zoomIn')">
      <ActionIcon name="zoom-in" />
    </IconButton>

    <IconButton
      :label="themeToggleLabel"
      :pressed="diagramDarkMode"
      @click="toggleDiagramTheme"
    >
      <ActionIcon
        :name="diagramDarkMode ? 'sun' : 'moon'"
        size="large"
      />
    </IconButton>

    <IconButton
      :label="t('toolbar.refresh')"
      :disabled="isRendering"
      @click="emit('renderNow')"
    >
      <ActionIcon name="refresh" />
    </IconButton>

    <IconButton
      :label="t('toolbar.exportSvg')"
      primary
      format
      :disabled="!canExport"
      @click="emit('exportSvg')"
    >
      <FileBadgeIcon format="SVG" />
    </IconButton>

    <IconButton
      :label="t('toolbar.exportPng')"
      primary
      format
      :disabled="!canExport"
      @click="emit('exportPng')"
    >
      <FileBadgeIcon format="PNG" />
    </IconButton>
  </div>
</template>

<style scoped>
.preview-toolbar {
  display: flex;
  flex: 1;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.preview-toolbar__color-field {
  display: inline-flex;
  margin: 0;
  flex-shrink: 0;
}

.preview-toolbar__color {
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  cursor: pointer;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
