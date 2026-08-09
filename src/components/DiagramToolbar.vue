<script setup lang="ts">
import { computed } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import FileBadgeIcon from "@/components/icons/FileBadgeIcon.vue";
import IconButton from "@/components/IconButton.vue";
import TooltipWrap from "@/components/TooltipWrap.vue";
import ToolbarOverflowMenu, {
  type ToolbarMenuGroup,
} from "@/components/ui/ToolbarOverflowMenu.vue";
import { useMediaQuery } from "@/composables/useMediaQuery";
import {
  RENDER_MODES,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { useLocale } from "@/composables/useLocale";

const COMPACT_TOOLBAR_MEDIA_QUERY = "(max-width: 900px)";

const props = defineProps<{
  isRendering: boolean;
  canExport: boolean;
  previewBackground: string;
  diagramDarkMode: boolean;
  renderMode: RenderMode;
  zoomPercent?: number;
}>();

const emit = defineEmits<{
  exportSvg: [];
  exportPng: [];
  renderNow: [];
  zoomIn: [];
  zoomOut: [];
  "update:previewBackground": [value: string];
  "update:diagramDarkMode": [value: boolean];
  "update:renderMode": [value: RenderMode];
}>();

const { t } = useLocale();
const isCompactToolbar = useMediaQuery(COMPACT_TOOLBAR_MEDIA_QUERY);

const isOnlineMode = computed(() => isOnlineRenderMode(props.renderMode));

const themeToggleLabel = computed(() =>
  props.diagramDarkMode ? t("toolbar.themeToLight") : t("toolbar.themeToDark"),
);

const renderModeToggleLabel = computed(() =>
  isOnlineMode.value
    ? t("toolbar.renderModeToOffline")
    : t("toolbar.renderModeToOnline"),
);

const overflowGroups = computed((): ToolbarMenuGroup[] => [
  {
    id: "view",
    label: t("toolbar.group.view"),
    actions: [
      {
        id: "toggleTheme",
        label: themeToggleLabel.value,
        icon: props.diagramDarkMode ? "sun" : "moon",
        pressed: props.diagramDarkMode,
      },
      {
        id: "toggleRenderMode",
        label: renderModeToggleLabel.value,
        icon: isOnlineMode.value ? "globe" : "unlink",
        pressed: isOnlineMode.value,
      },
      {
        id: "renderNow",
        label: t("toolbar.refresh"),
        icon: "refresh",
        disabled: props.isRendering,
      },
    ],
  },
  {
    id: "export",
    label: t("toolbar.group.export"),
    actions: [
      {
        id: "exportSvg",
        label: t("toolbar.exportSvg"),
        disabled: !props.canExport,
      },
      {
        id: "exportPng",
        label: t("toolbar.exportPng"),
        disabled: !props.canExport,
      },
    ],
  },
]);

function toggleDiagramTheme(): void {
  emit("update:diagramDarkMode", !props.diagramDarkMode);
}

function toggleRenderMode(): void {
  emit(
    "update:renderMode",
    isOnlineMode.value ? RENDER_MODES.offline : RENDER_MODES.online,
  );
}

function onOverflowAction(actionId: string): void {
  switch (actionId) {
    case "toggleTheme":
      toggleDiagramTheme();
      break;
    case "toggleRenderMode":
      toggleRenderMode();
      break;
    case "renderNow":
      emit("renderNow");
      break;
    case "exportSvg":
      emit("exportSvg");
      break;
    case "exportPng":
      emit("exportPng");
      break;
    default:
      break;
  }
}
</script>

<template>
  <div
    class="preview-toolbar"
    :class="{ 'preview-toolbar--compact': isCompactToolbar }"
  >
    <template v-if="isCompactToolbar">
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

      <span
        v-if="zoomPercent !== undefined"
        class="preview-toolbar__zoom-level"
        :aria-label="t('toolbar.zoomLevel', { percent: zoomPercent })"
      >
        {{ zoomPercent }}%
      </span>

      <IconButton :label="t('toolbar.zoomIn')" @click="emit('zoomIn')">
        <ActionIcon name="zoom-in" />
      </IconButton>

      <ToolbarOverflowMenu
        :label="t('toolbar.overflow')"
        :groups="overflowGroups"
        @action="onOverflowAction"
      />
    </template>

    <template v-else>
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

      <span
        v-if="zoomPercent !== undefined"
        class="preview-toolbar__zoom-level"
        :aria-label="t('toolbar.zoomLevel', { percent: zoomPercent })"
      >
        {{ zoomPercent }}%
      </span>

      <IconButton :label="t('toolbar.zoomIn')" @click="emit('zoomIn')">
        <ActionIcon name="zoom-in" />
      </IconButton>

      <IconButton
        :label="themeToggleLabel"
        :pressed="diagramDarkMode"
        @click="toggleDiagramTheme"
      >
        <ActionIcon :name="diagramDarkMode ? 'sun' : 'moon'" size="large" />
      </IconButton>

      <IconButton
        :label="renderModeToggleLabel"
        :pressed="isOnlineMode"
        @click="toggleRenderMode"
      >
        <ActionIcon :name="isOnlineMode ? 'globe' : 'unlink'" size="large" />
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
    </template>
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

.preview-toolbar--compact {
  justify-content: flex-end;
}

.preview-toolbar__color-field {
  display: inline-flex;
  margin: 0;
  flex-shrink: 0;
}

.preview-toolbar__zoom-level {
  min-width: 3.2rem;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
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
