<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import DiagramPreview from "@/components/DiagramPreview.vue";
import TooltipProvider from "@/components/ui/TooltipProvider.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useDiagramExport } from "@/composables/useDiagramExport";
import { useDiagramRender } from "@/composables/useDiagramRender";
import {
  useDualScreenPreview,
  type DualScreenPreviewSettings,
  type DualScreenState,
} from "@/composables/useDualScreenSession";
import { useLocale } from "@/composables/useLocale";
import { useUiTheme } from "@/composables/useUiTheme";
import { LAYOUT_ENGINES, type LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  DEFAULT_DIAGRAM_FONT_FAMILY,
  DEFAULT_DIAGRAM_FONT_STYLE,
  DEFAULT_DIAGRAM_FONT_WEIGHT,
  DEFAULT_PREVIEW_BG,
} from "@/constants/editor-settings";
import { DEFAULT_RENDER_MODE, type RenderMode } from "@/constants/render-settings";

useUiTheme();

const { t, locale } = useLocale();
const { route } = useAppRouter();
const sessionId = computed(() =>
  route.value.name === "preview" ? route.value.diagramSlug : null,
);
const { editorGone, remoteState, publishSettings, stop } = useDualScreenPreview(sessionId);

const source = ref("");
const diagramFormat = ref<DiagramFormat>("plantuml");
const layout = ref<LayoutEngine>(LAYOUT_ENGINES.smetana);
const renderMode = ref<RenderMode>(DEFAULT_RENDER_MODE);
const diagramDarkMode = ref(false);
const previewBackground = ref<string>(DEFAULT_PREVIEW_BG.light);
const diagramTextColor = ref("");
const diagramFontFamily = ref(DEFAULT_DIAGRAM_FONT_FAMILY);
const diagramFontWeight = ref(DEFAULT_DIAGRAM_FONT_WEIGHT);
const diagramFontStyle = ref(DEFAULT_DIAGRAM_FONT_STYLE);
const applyingRemote = ref(false);
const booted = ref(false);

const { svg, error, isRendering, renderDiagram, bootEngine } = useDiagramRender({
  source,
  diagramFormat,
  layout,
  diagramDarkMode,
  renderMode,
  diagramBackground: previewBackground,
  diagramTextColor,
  diagramFontFamily,
  diagramFontWeight,
  diagramFontStyle,
  locale,
  t,
});

const { canExport, exportSvg, exportPng, copyPng } = useDiagramExport({
  svg,
  error,
  isRendering,
  previewBackground,
  source,
  diagramFormat,
});

function currentSettings(): DualScreenPreviewSettings {
  return {
    renderMode: renderMode.value,
    diagramDarkMode: diagramDarkMode.value,
    previewBackground: previewBackground.value,
    diagramTextColor: diagramTextColor.value,
    diagramFontFamily: diagramFontFamily.value,
    diagramFontWeight: diagramFontWeight.value,
    diagramFontStyle: diagramFontStyle.value,
  };
}

async function applyRemoteState(state: DualScreenState): Promise<void> {
  applyingRemote.value = true;
  source.value = state.source;
  diagramFormat.value = state.diagramFormat;
  layout.value = state.layout;
  renderMode.value = state.renderMode;
  diagramDarkMode.value = state.diagramDarkMode;
  previewBackground.value = state.previewBackground;
  diagramTextColor.value = state.diagramTextColor;
  diagramFontFamily.value = state.diagramFontFamily;
  diagramFontWeight.value = state.diagramFontWeight;
  diagramFontStyle.value = state.diagramFontStyle;
  await nextTick();
  applyingRemote.value = false;
  if (!booted.value) {
    booted.value = true;
    void bootEngine();
  }
}

watch(remoteState, (state) => {
  if (state) {
    void applyRemoteState(state);
  }
});

watch(
  [
    renderMode,
    diagramDarkMode,
    previewBackground,
    diagramTextColor,
    diagramFontFamily,
    diagramFontWeight,
    diagramFontStyle,
  ],
  () => {
    if (applyingRemote.value || !remoteState.value) {
      return;
    }
    publishSettings(currentSettings());
  },
);

const blockedMessage = computed(() =>
  editorGone.value ? t("preview.dualScreen.editorGone") : "",
);
</script>

<template>
  <div class="preview-window">
    <DiagramPreview
      class="preview-window__panel"
      :svg="svg"
      :error="error"
      :is-rendering="isRendering && !editorGone"
      :can-export="canExport"
      :copy-png="copyPng"
      :blocked-message="blockedMessage"
      :source="source"
      :diagram-format="diagramFormat"
      v-model:preview-background="previewBackground"
      v-model:text-color="diagramTextColor"
      v-model:diagram-font-family="diagramFontFamily"
      v-model:diagram-font-weight="diagramFontWeight"
      v-model:diagram-font-style="diagramFontStyle"
      v-model:diagram-dark-mode="diagramDarkMode"
      v-model:render-mode="renderMode"
      show-dual-screen
      :dual-screen-active="!editorGone"
      @toggle-dual-screen="stop"
      @render-now="renderDiagram"
      @export-svg="exportSvg"
      @export-png="exportPng"
    />
    <AppDialogHost />
    <TooltipProvider />
  </div>
</template>
