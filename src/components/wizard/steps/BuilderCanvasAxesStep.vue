<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import BuilderGanttCalendarPanel from "@/components/wizard/steps/panels/BuilderGanttCalendarPanel.vue";
import { useLocale } from "@/composables/useLocale";
import { PREVIEW_BG_PRESETS } from "@/constants/editor-settings";
import {
  ASPECT_RATIO_OPTIONS,
  CAGR_FORMAT_OPTIONS,
  getDiagramBuilderSchema,
  LINE_STYLE_OPTIONS,
  MONO_MODE_OPTIONS,
  type DiagramBuilderState,
} from "@/services/diagram-builder";

const builderState = defineModel<DiagramBuilderState>("builderState", {
  required: true,
});

const emit = defineEmits<{
  change: [];
}>();

const { t } = useLocale();

const schema = computed(() =>
  getDiagramBuilderSchema(
    builderState.value.format,
    builderState.value.diagramType,
  ),
);

const cap = computed(() => schema.value.capabilities);

const seriesCount = computed(() => {
  const dt = builderState.value.diagramType;
  if (dt === "series") {
    return Math.max(
      1,
      builderState.value.matrixHeaders.filter((h) => !/^line:/i.test(h.trim()))
        .length,
    );
  }
  if (dt === "radar") {
    return Math.max(1, builderState.value.matrixRows.length);
  }
  if (dt === "treemap") {
    const groups = new Set(
      builderState.value.rows.map((r) => (r[0] ?? "").trim()).filter(Boolean),
    );
    return Math.max(1, groups.size || builderState.value.rows.length);
  }
  if (dt === "boxplot" || dt === "voronoi") {
    return Math.max(1, Math.min(8, builderState.value.rows.length));
  }
  if (dt === "waterfall") {
    const seriesNames = new Set(
      builderState.value.rows.map((r) => (r[4] ?? "").trim()).filter(Boolean),
    );
    return seriesNames.size;
  }
  return 0;
});

const cagrSeriesOptions = computed(() => {
  const options: { index: number; label: string }[] = [];
  let barIndex = 0;
  for (const header of builderState.value.matrixHeaders) {
    if (/^line:/i.test(header.trim())) {
      continue;
    }
    options.push({
      index: barIndex,
      label: header.trim() || `${t("builder.col.series")} ${barIndex + 1}`,
    });
    barIndex += 1;
  }
  if (options.length === 0) {
    options.push({
      index: 0,
      label: `${t("builder.col.series")} 1`,
    });
  }
  return options;
});

const hasAdvancedCapabilities = computed(() =>
  Boolean(
    cap.value.supportsFontSize ||
      cap.value.supportsCanvasColors ||
      cap.value.supportsWaterfallColors ||
      cap.value.supportsBoxplotColors ||
      (cap.value.supportsSeriesColors && seriesCount.value > 0) ||
      cap.value.supportsHeatmapScale ||
      cap.value.supportsBreaks ||
      cap.value.supportsThresholds ||
      cap.value.supportsCagr,
  ),
);

function hasActiveAdvancedValues(state: DiagramBuilderState): boolean {
  const { canvas, options } = state;
  return Boolean(
    canvas.background ||
      !canvas.autoTextColor ||
      Object.values(options.namedColors).some(Boolean) ||
      options.seriesColors.some(Boolean) ||
      !options.heatmapAutoScale ||
      options.breaks.length > 0 ||
      options.thresholds.length > 0 ||
      options.cagrs.length > 0,
  );
}

const isAdvancedOpen = ref(hasActiveAdvancedValues(builderState.value));

watch(
  () => [builderState.value.format, builderState.value.diagramType] as const,
  () => {
    isAdvancedOpen.value = hasActiveAdvancedValues(builderState.value);
  },
);

function notifyChange(): void {
  emit("change");
}

const sankeyNodes = computed(() => {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of builderState.value.rows) {
    for (const index of [0, 1]) {
      const name = (row[index] ?? "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
    }
  }
  return names;
});

const sankeyLinkMode = computed(() => {
  const value = builderState.value.appearance.sankey.linkColor;
  if (value === "source" || value === "target" || value === "gradient") {
    return value;
  }
  return "custom";
});

function setSankeyLinkMode(mode: string): void {
  const sankey = builderState.value.appearance.sankey;
  if (mode === "custom") {
    sankey.linkColor = sankey.linkColor.startsWith("#") ? sankey.linkColor : "#6699cc";
  } else {
    sankey.linkColor = mode;
  }
  notifyChange();
}

function sankeyNodeColor(node: string): string {
  return (
    builderState.value.appearance.sankey.nodeColors.find((item) => item.node === node)?.color ??
    ""
  );
}

function setSankeyNodeColor(node: string, color: string): void {
  const list = builderState.value.appearance.sankey.nodeColors;
  const index = list.findIndex((item) => item.node === node);
  if (!color) {
    if (index >= 0) list.splice(index, 1);
  } else if (index >= 0) {
    list[index] = { node, color };
  } else {
    list.push({ node, color });
  }
  notifyChange();
}

const hasPrimaryCanvasControls = computed(() => {
  const flags = cap.value;
  return Boolean(
    flags.supportsTitle ||
      flags.supportsDirection ||
      flags.supportsRotate90 ||
      flags.supportsStacked ||
      flags.supportsAspectRatio ||
      flags.supportsLabelsMode ||
      flags.supportsConnectors ||
      flags.supportsPieShowData ||
      flags.supportsVoronoiToggles ||
      flags.supportsRadarVisuals ||
      flags.supportsMono ||
      flags.supportsXAxis ||
      flags.supportsYAxis ||
      flags.supportsGrid ||
      flags.supportsRadarScale ||
      flags.supportsBubbleExtras ||
      flags.supportsQuadrantExtras ||
      flags.supportsGanttDateOptions ||
      flags.supportsSankeyStyle ||
      flags.supportsPacketStyle ||
      flags.supportsPieStyle ||
      flags.supportsXyStyle ||
      flags.supportsMindmapStyle ||
      flags.supportsTimelineStyle ||
      flags.supportsJourneyStyle ||
      flags.supportsGanttStyle ||
      flags.supportsBlockStyle ||
      flags.supportsSequenceAutonumber,
  );
});

function setPresetBackground(hex: string): void {
  builderState.value.canvas.background = hex;
  notifyChange();
}

function setSeriesColor(idx: number, value: string): void {
  while (builderState.value.options.seriesColors.length <= idx) {
    builderState.value.options.seriesColors.push("");
  }
  builderState.value.options.seriesColors[idx] = value;
  notifyChange();
}

function addBreak(): void {
  builderState.value.options.breaks.push({
    after: "100",
    before: "300",
    label: "",
  });
  notifyChange();
}

function removeBreak(idx: number): void {
  builderState.value.options.breaks.splice(idx, 1);
  notifyChange();
}

function addThreshold(): void {
  builderState.value.options.thresholds.push({
    value: "150",
    label: "Target",
    color: "#cf222e",
    width: "1.5",
    style: "dash",
  });
  notifyChange();
}

function removeThreshold(idx: number): void {
  builderState.value.options.thresholds.splice(idx, 1);
  notifyChange();
}

function addCagr(): void {
  const maxCat = Math.max(2, builderState.value.matrixRows.length);
  builderState.value.options.cagrs.push({
    seriesIndex: 0,
    from: 1,
    to: maxCat,
    format: "0%",
    prefix: "",
    label: "",
  });
  notifyChange();
}

function removeCagr(idx: number): void {
  builderState.value.options.cagrs.splice(idx, 1);
  notifyChange();
}

function addHeatmapBand(): void {
  builderState.value.options.heatmapBands.push({
    from: "50",
    to: "100",
    openEnded: false,
    color: "#ffcdd2",
  });
  notifyChange();
}

function removeHeatmapBand(idx: number): void {
  if (builderState.value.options.heatmapBands.length <= 1) return;
  builderState.value.options.heatmapBands.splice(idx, 1);
  notifyChange();
}
</script>

<template>
  <div class="builder-step builder-cards" data-testid="builder-canvas-axes-step">
    <!-- SECTION 1: MAIN SETTINGS (CANVAS, LAYOUT & DISPLAY) -->
    <section class="builder-card">
      <h3 class="builder-card__title">
        {{ t("builder.section.canvas") }}
      </h3>

      <div class="builder-form-grid">
        <p
          v-if="!hasPrimaryCanvasControls"
          class="builder-hint"
        >
          {{ t("builder.canvas.noAppearance") }}
        </p>

        <label
          v-if="cap.supportsTitle"
          class="builder-field builder-field--wide"
        >
          <span class="builder-field__label">{{ t("builder.canvas.title") }}</span>
          <input
            v-model="builderState.canvas.title"
            type="text"
            class="builder-input"
            :placeholder="t('builder.canvas.titlePlaceholder')"
            data-testid="builder-title-input"
            @input="notifyChange"
          >
        </label>

        <template v-if="cap.supportsSankeyStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.showValues") }}</span>
            <select
              :value="builderState.appearance.sankey.showValues ? 'on' : 'off'"
              class="select builder-input"
              data-testid="builder-sankey-show-values"
              @change="
                builderState.appearance.sankey.showValues =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="on">{{ t("builder.option.show") }}</option>
              <option value="off">{{ t("builder.option.hide") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.prefix") }}</span>
            <input
              v-model="builderState.appearance.sankey.prefix"
              type="text"
              class="builder-input"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.suffix") }}</span>
            <input
              v-model="builderState.appearance.sankey.suffix"
              type="text"
              class="builder-input"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.linkColor") }}</span>
            <select
              :value="sankeyLinkMode"
              class="select builder-input"
              data-testid="builder-sankey-link-color"
              @change="setSankeyLinkMode(($event.target as HTMLSelectElement).value)"
            >
              <option value="gradient">{{ t("builder.sankey.link.gradient") }}</option>
              <option value="source">{{ t("builder.sankey.link.source") }}</option>
              <option value="target">{{ t("builder.sankey.link.target") }}</option>
              <option value="custom">{{ t("builder.sankey.link.custom") }}</option>
            </select>
          </label>
          <label
            v-if="sankeyLinkMode === 'custom'"
            class="builder-field"
          >
            <span class="builder-field__label">{{ t("builder.sankey.link.custom") }}</span>
            <input
              v-model="builderState.appearance.sankey.linkColor"
              type="color"
              class="builder-input"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.alignment") }}</span>
            <select
              v-model="builderState.appearance.sankey.nodeAlignment"
              class="select builder-input"
              data-testid="builder-sankey-alignment"
              @change="notifyChange"
            >
              <option value="justify">{{ t("builder.sankey.align.justify") }}</option>
              <option value="left">{{ t("builder.sankey.align.left") }}</option>
              <option value="right">{{ t("builder.sankey.align.right") }}</option>
              <option value="center">{{ t("builder.sankey.align.center") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.labelStyle") }}</span>
            <select
              v-model="builderState.appearance.sankey.labelStyle"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="legacy">{{ t("builder.sankey.label.legacy") }}</option>
              <option value="outlined">{{ t("builder.sankey.label.outlined") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.width") }}</span>
            <input
              v-model="builderState.appearance.sankey.width"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.height") }}</span>
            <input
              v-model="builderState.appearance.sankey.height"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.nodeWidth") }}</span>
            <input
              v-model="builderState.appearance.sankey.nodeWidth"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.nodePadding") }}</span>
            <input
              v-model="builderState.appearance.sankey.nodePadding"
              type="number"
              min="0"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.sankey.useMaxWidth") }}</span>
            <select
              :value="builderState.appearance.sankey.useMaxWidth ? 'on' : 'off'"
              class="select builder-input"
              @change="
                builderState.appearance.sankey.useMaxWidth =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="off">{{ t("builder.option.off") }}</option>
              <option value="on">{{ t("builder.option.on") }}</option>
            </select>
          </label>
          <div
            v-if="sankeyNodes.length > 0"
            class="builder-field builder-field--wide"
          >
            <span class="builder-field__label">{{ t("builder.sankey.nodeColors") }}</span>
            <div class="builder-form-grid">
              <label
                v-for="node in sankeyNodes"
                :key="node"
                class="builder-field"
              >
                <span class="builder-field__label">{{ node }}</span>
                <input
                  :value="sankeyNodeColor(node)"
                  type="color"
                  class="builder-input"
                  @input="setSankeyNodeColor(node, ($event.target as HTMLInputElement).value)"
                >
              </label>
            </div>
          </div>
        </template>

        <template v-if="cap.supportsPacketStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.showBits") }}</span>
            <select
              :value="builderState.appearance.packet.showBits ? 'on' : 'off'"
              class="select builder-input"
              @change="
                builderState.appearance.packet.showBits =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="on">{{ t("builder.option.show") }}</option>
              <option value="off">{{ t("builder.option.hide") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.bitOrder") }}</span>
            <select
              v-model="builderState.appearance.packet.bitOrder"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="ascending">{{ t("builder.packet.order.ascending") }}</option>
              <option value="descending">{{ t("builder.packet.order.descending") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.bitsPerRow") }}</span>
            <input
              v-model="builderState.appearance.packet.bitsPerRow"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.bitWidth") }}</span>
            <input
              v-model="builderState.appearance.packet.bitWidth"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.rowHeight") }}</span>
            <input
              v-model="builderState.appearance.packet.rowHeight"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.paddingX") }}</span>
            <input
              v-model="builderState.appearance.packet.paddingX"
              type="number"
              min="0"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.packet.paddingY") }}</span>
            <input
              v-model="builderState.appearance.packet.paddingY"
              type="number"
              min="0"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
        </template>

        <template v-if="cap.supportsPieStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.pie.textPosition") }}</span>
            <input
              v-model="builderState.appearance.pie.textPosition"
              type="number"
              min="0"
              max="1"
              step="0.05"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.pie.donutHole") }}</span>
            <input
              v-model="builderState.appearance.pie.donutHole"
              type="number"
              min="0"
              max="0.9"
              step="0.05"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.pie.legend") }}</span>
            <select
              v-model="builderState.appearance.pie.legendPosition"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="">{{ t("builder.option.auto") }}</option>
              <option value="right">{{ t("builder.pie.legend.right") }}</option>
              <option value="left">{{ t("builder.pie.legend.left") }}</option>
              <option value="top">{{ t("builder.pie.legend.top") }}</option>
              <option value="bottom">{{ t("builder.pie.legend.bottom") }}</option>
              <option value="center">{{ t("builder.pie.legend.center") }}</option>
            </select>
          </label>
        </template>

        <template v-if="cap.supportsXyStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.xy.orientation") }}</span>
            <select
              v-model="builderState.appearance.xyChart.orientation"
              class="select builder-input"
              data-testid="builder-xy-orientation"
              @change="notifyChange"
            >
              <option value="">{{ t("builder.xy.orientation.vertical") }}</option>
              <option value="vertical">{{ t("builder.xy.orientation.vertical") }}</option>
              <option value="horizontal">{{ t("builder.xy.orientation.horizontal") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.xy.showDataLabel") }}</span>
            <select
              :value="builderState.appearance.xyChart.showDataLabel ? 'on' : 'off'"
              class="select builder-input"
              @change="
                builderState.appearance.xyChart.showDataLabel =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="off">{{ t("builder.option.off") }}</option>
              <option value="on">{{ t("builder.option.on") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.xy.width") }}</span>
            <input
              v-model="builderState.appearance.xyChart.width"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.xy.height") }}</span>
            <input
              v-model="builderState.appearance.xyChart.height"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
        </template>

        <template v-if="cap.supportsMindmapStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.mindmap.colorBy") }}</span>
            <select
              v-model="builderState.appearance.mindmap.colorBy"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="">{{ t("builder.mindmap.color.branch") }}</option>
              <option value="branch">{{ t("builder.mindmap.color.branch") }}</option>
              <option value="depth">{{ t("builder.mindmap.color.depth") }}</option>
            </select>
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.mindmap.padding") }}</span>
            <input
              v-model="builderState.appearance.mindmap.padding"
              type="number"
              min="0"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.mindmap.maxNodeWidth") }}</span>
            <input
              v-model="builderState.appearance.mindmap.maxNodeWidth"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
        </template>

        <template v-if="cap.supportsTimelineStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.timeline.colors") }}</span>
            <select
              :value="builderState.appearance.timeline.disableMulticolor ? 'off' : 'on'"
              class="select builder-input"
              @change="
                builderState.appearance.timeline.disableMulticolor =
                  ($event.target as HTMLSelectElement).value === 'off';
                notifyChange();
              "
            >
              <option value="on">{{ t("builder.timeline.colors.multi") }}</option>
              <option value="off">{{ t("builder.timeline.colors.single") }}</option>
            </select>
          </label>
        </template>

        <template v-if="cap.supportsJourneyStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.journey.taskMargin") }}</span>
            <input
              v-model="builderState.appearance.journey.taskMargin"
              type="number"
              min="0"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.journey.actorWidth") }}</span>
            <input
              v-model="builderState.appearance.journey.width"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.journey.actorHeight") }}</span>
            <input
              v-model="builderState.appearance.journey.height"
              type="number"
              min="1"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
        </template>

        <template v-if="cap.supportsBlockStyle">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.block.columns") }}</span>
            <input
              v-model.number="builderState.canvas.blockColumns"
              type="number"
              min="1"
              max="12"
              class="builder-input"
              data-testid="builder-block-columns"
              @input="notifyChange"
            >
          </label>
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.block.padding") }}</span>
            <input
              v-model="builderState.appearance.block.padding"
              type="number"
              min="0"
              class="builder-input"
              :placeholder="t('builder.option.auto')"
              @input="notifyChange"
            >
          </label>
        </template>

        <label
          v-if="cap.supportsSequenceAutonumber"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.sequence.autonumber") }}</span>
          <select
            :value="builderState.appearance.sequenceAutonumber ? 'on' : 'off'"
            class="select builder-input"
            data-testid="builder-sequence-autonumber"
            @change="
              builderState.appearance.sequenceAutonumber =
                ($event.target as HTMLSelectElement).value === 'on';
              notifyChange();
            "
          >
            <option value="off">{{ t("builder.option.off") }}</option>
            <option value="on">{{ t("builder.option.on") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsDirection"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.canvas.direction") }}</span>
          <select
            v-model="builderState.canvas.direction"
            class="select builder-input"
            data-testid="builder-direction-select"
            @change="notifyChange"
          >
            <option value="TB">{{ t("llm.wizard.direction.TB") }}</option>
            <option value="LR">{{ t("llm.wizard.direction.LR") }}</option>
            <option value="BT">{{ t("builder.direction.BT") }}</option>
            <option value="RL">{{ t("builder.direction.RL") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsRotate90"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.canvas.orientation") }}</span>
          <select
            :value="builderState.canvas.rotate90 ? 'horizontal' : 'vertical'"
            class="select builder-input"
            data-testid="builder-orientation-select"
            @change="
              builderState.canvas.rotate90 =
                ($event.target as HTMLSelectElement).value === 'horizontal';
              notifyChange();
            "
          >
            <option value="vertical">{{ t("builder.orientation.vertical") }}</option>
            <option value="horizontal">{{ t("builder.orientation.horizontal") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsRotate90 && builderState.canvas.rotate90"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.canvas.invertY") }}</span>
          <select
            :value="builderState.canvas.invertY ? 'invert' : 'normal'"
            class="select builder-input"
            data-testid="builder-invert-y-select"
            @change="
              builderState.canvas.invertY =
                ($event.target as HTMLSelectElement).value === 'invert';
              notifyChange();
            "
          >
            <option value="normal">{{ t("builder.invertY.top") }}</option>
            <option value="invert">{{ t("builder.invertY.bottom") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsStacked"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.barLayout") }}</span>
          <select
            :value="builderState.options.stackArea ? 'area' : builderState.options.stacked ? 'stacked' : 'grouped'"
            class="select builder-input"
            data-testid="builder-bar-layout-select"
            @change="
              builderState.options.stackArea = ($event.target as HTMLSelectElement).value === 'area';
              builderState.options.stacked = ($event.target as HTMLSelectElement).value === 'stacked';
              notifyChange();
            "
          >
            <option value="grouped">{{ t("builder.option.grouped") }}</option>
            <option value="stacked">{{ t("builder.option.stacked") }}</option>
            <option value="area">{{ t("builder.option.stackedArea") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsStacked"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.showSum") }}</span>
          <select
            :value="builderState.options.showSum ? 'on' : 'off'"
            class="select builder-input"
            @change="
              builderState.options.showSum = ($event.target as HTMLSelectElement).value === 'on';
              notifyChange();
            "
          >
            <option value="off">{{ t("builder.option.hide") }}</option>
            <option value="on">{{ t("builder.option.show") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsStacked || builderState.diagramType === 'waterfall'"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.barGap") }}</span>
          <input
            v-model="builderState.options.barGap"
            type="text"
            class="builder-input"
            :placeholder="t('builder.option.barGapPlaceholder')"
            @input="notifyChange"
          >
        </label>

        <label
          v-if="cap.supportsAspectRatio"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.canvas.aspectRatio") }}</span>
          <select
            v-model="builderState.canvas.aspectRatio"
            class="select builder-input"
            data-testid="builder-aspect-select"
            @change="notifyChange"
          >
            <option
              v-for="opt in ASPECT_RATIO_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ t(opt.labelKey) }}
            </option>
          </select>
        </label>

        <div
          v-if="cap.supportsAspectRatio && builderState.canvas.aspectRatio === 'custom'"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.aspect.custom") }}</span>
          <div class="builder-inline-inputs">
            <input
              v-model="builderState.canvas.customAspectWidth"
              type="number"
              min="1"
              max="32"
              class="builder-input builder-input--short"
              @input="notifyChange"
            >
            <span>×</span>
            <input
              v-model="builderState.canvas.customAspectHeight"
              type="number"
              min="1"
              max="32"
              class="builder-input builder-input--short"
              @input="notifyChange"
            >
          </div>
        </div>

        <label
          v-if="cap.supportsLabelsMode"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.valueLabels") }}</span>
          <select
            v-model="builderState.options.labelsMode"
            class="select builder-input"
            data-testid="builder-labels-mode-select"
            @change="notifyChange"
          >
            <option
              v-for="opt in cap.labelsModeOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ t(opt.labelKey) }}
            </option>
          </select>
        </label>

        <label
          v-if="builderState.diagramType === 'series' || builderState.diagramType === 'waterfall'"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.labelAuto") }}</span>
          <select
            :value="builderState.options.labelAuto ? 'auto' : 'theme'"
            class="select builder-input"
            @change="
              builderState.options.labelAuto =
                ($event.target as HTMLSelectElement).value === 'auto';
              notifyChange();
            "
          >
            <option value="theme">{{ t("builder.option.labelColor.theme") }}</option>
            <option value="auto">{{ t("builder.option.labelColor.auto") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsConnectors"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.connectors") }}</span>
          <select
            :value="builderState.options.connectors ? 'on' : 'off'"
            class="select builder-input"
            @change="
              builderState.options.connectors =
                ($event.target as HTMLSelectElement).value === 'on';
              notifyChange();
            "
          >
            <option value="on">{{ t("builder.option.show") }}</option>
            <option value="off">{{ t("builder.option.hide") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsPieShowData"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.pieShowData") }}</span>
          <select
            :value="builderState.options.showData ? 'on' : 'off'"
            class="select builder-input"
            @change="
              builderState.options.showData =
                ($event.target as HTMLSelectElement).value === 'on';
              notifyChange();
            "
          >
            <option value="on">{{ t("builder.option.show") }}</option>
            <option value="off">{{ t("builder.option.hide") }}</option>
          </select>
        </label>

        <template v-if="cap.supportsVoronoiToggles">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.voronoi.sites") }}</span>
            <select
              :value="builderState.options.showSites ? 'on' : 'off'"
              class="select builder-input"
              @change="
                builderState.options.showSites =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="on">{{ t("builder.option.show") }}</option>
              <option value="off">{{ t("builder.option.hide") }}</option>
            </select>
          </label>

          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.option.valueLabels") }}</span>
            <select
              :value="builderState.options.showLabels ? 'on' : 'off'"
              class="select builder-input"
              @change="
                builderState.options.showLabels =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="on">{{ t("builder.option.show") }}</option>
              <option value="off">{{ t("builder.option.hide") }}</option>
            </select>
          </label>
        </template>

        <template v-if="cap.supportsRadarVisuals">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.radar.dots") }}</span>
            <select
              :value="builderState.options.radarDots ? 'on' : 'off'"
              class="select builder-input"
              @change="
                builderState.options.radarDots =
                  ($event.target as HTMLSelectElement).value === 'on';
                notifyChange();
              "
            >
              <option value="on">{{ t("builder.option.show") }}</option>
              <option value="off">{{ t("builder.option.hide") }}</option>
            </select>
          </label>

          <label class="builder-field">
            <span class="builder-field__label">
              {{ t("builder.radar.fill") }} ({{ builderState.options.radarFillOpacity }})
            </span>
            <input
              v-model.number="builderState.options.radarFillOpacity"
              type="range"
              min="0"
              max="1"
              step="0.05"
              @input="notifyChange"
            >
          </label>
        </template>

        <label
          v-if="cap.supportsMono"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.color.monoMode") }}</span>
          <select
            v-model="builderState.options.monoMode"
            class="select builder-input"
            data-testid="builder-mono-select"
            @change="notifyChange"
          >
            <option
              v-for="opt in MONO_MODE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ t(opt.labelKey) }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <!-- SECTION 2: AXES, SCALE & GRID -->
    <section
      v-if="
        cap.supportsXAxis ||
        cap.supportsYAxis ||
        cap.supportsGrid ||
        cap.supportsRadarScale ||
        cap.supportsBubbleExtras ||
        cap.supportsQuadrantExtras ||
        cap.supportsGanttDateOptions
      "
      class="builder-card"
    >
      <h3 class="builder-card__title">
        {{ t("builder.section.axes") }}
      </h3>

      <div class="builder-form-grid">
        <!-- Y Axis -->
        <template v-if="cap.supportsYAxis">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.axis.yLabel") }}</span>
            <input
              v-model="builderState.canvas.yAxis.label"
              type="text"
              class="builder-input"
              @input="notifyChange"
            >
          </label>

          <div class="builder-field">
            <span class="builder-field__label">{{ t("builder.axis.yRange") }}</span>
            <div class="builder-inline-inputs">
              <label
                v-if="builderState.diagramType !== 'bubble' && builderState.diagramType !== 'voronoi'"
                class="builder-inline-check"
              >
                <input
                  v-model="builderState.canvas.yAxis.autoRange"
                  type="checkbox"
                  @change="notifyChange"
                >
                <span>{{ t("builder.option.auto") }}</span>
              </label>
              <template
                v-if="
                  !builderState.canvas.yAxis.autoRange ||
                  builderState.diagramType === 'bubble' ||
                  builderState.diagramType === 'voronoi'
                "
              >
                <input
                  v-model="builderState.canvas.yAxis.min"
                  type="number"
                  step="any"
                  class="builder-input builder-input--short"
                  placeholder="min"
                  @input="notifyChange"
                >
                <span>→</span>
                <input
                  v-model="builderState.canvas.yAxis.max"
                  type="number"
                  step="any"
                  class="builder-input builder-input--short"
                  placeholder="max"
                  @input="notifyChange"
                >
              </template>
            </div>
          </div>
        </template>

        <!-- X Axis -->
        <template v-if="cap.supportsXAxis">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.axis.xLabel") }}</span>
            <input
              v-model="builderState.canvas.xAxis.label"
              type="text"
              class="builder-input"
              @input="notifyChange"
            >
          </label>

          <div class="builder-field">
            <span class="builder-field__label">{{ t("builder.axis.xRange") }}</span>
            <div class="builder-inline-inputs">
              <input
                v-model="builderState.canvas.xAxis.min"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="min"
                @input="notifyChange"
              >
              <span>→</span>
              <input
                v-model="builderState.canvas.xAxis.max"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="max"
                @input="notifyChange"
              >
            </div>
          </div>
        </template>

        <!-- Axis visibility -->
        <label
          v-if="cap.supportsAxisToggle"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.axis.visibility") }}</span>
          <select
            :value="builderState.canvas.yAxis.hidden ? 'off' : 'on'"
            class="select builder-input"
            @change="
              builderState.canvas.yAxis.hidden =
                ($event.target as HTMLSelectElement).value === 'off';
              notifyChange();
            "
          >
            <option value="on">{{ t("builder.option.show") }}</option>
            <option value="off">{{ t("builder.option.hide") }}</option>
          </select>
        </label>

        <label
          v-if="cap.supportsAxisToggle && (builderState.diagramType === 'series' || builderState.diagramType === 'waterfall')"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.axis.category") }}</span>
          <select
            :value="builderState.canvas.xAxis.hidden ? 'off' : 'on'"
            class="select builder-input"
            @change="
              builderState.canvas.xAxis.hidden = ($event.target as HTMLSelectElement).value === 'off';
              notifyChange();
            "
          >
            <option value="on">{{ t("builder.option.show") }}</option>
            <option value="off">{{ t("builder.option.hide") }}</option>
          </select>
        </label>

        <label
          v-if="builderState.diagramType === 'series'"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.axis.y2") }}</span>
          <select
            :value="builderState.options.y2Hidden ? 'off' : 'on'"
            class="select builder-input"
            @change="
              builderState.options.y2Hidden = ($event.target as HTMLSelectElement).value === 'off';
              notifyChange();
            "
          >
            <option value="on">{{ t("builder.option.show") }}</option>
            <option value="off">{{ t("builder.option.hide") }}</option>
          </select>
        </label>

        <!-- Grid -->
        <div
          v-if="cap.supportsGrid"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.axis.grid") }}</span>
          <div class="builder-inline-inputs">
            <select
              v-model="builderState.canvas.yAxis.gridMode"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="auto">{{ t("builder.option.auto") }}</option>
              <option
                v-if="builderState.diagramType !== 'ev'"
                value="fixed"
              >
                {{ t("builder.axis.gridStep") }}
              </option>
              <option value="off">
                {{ t("builder.option.hide") }}
              </option>
            </select>
            <input
              v-if="builderState.canvas.yAxis.gridMode === 'fixed'"
              v-model="builderState.canvas.yAxis.gridStep"
              type="number"
              min="0.1"
              step="any"
              class="builder-input builder-input--short"
              placeholder="50"
              @input="notifyChange"
            >
          </div>
        </div>

        <div
          v-if="builderState.diagramType === 'series'"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.axis.y2Grid") }}</span>
          <div class="builder-inline-inputs">
            <select
              v-model="builderState.options.y2GridMode"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="off">{{ t("builder.option.hide") }}</option>
              <option value="auto">{{ t("builder.option.auto") }}</option>
              <option value="fixed">{{ t("builder.axis.gridStep") }}</option>
            </select>
            <input
              v-if="builderState.options.y2GridMode === 'fixed'"
              v-model="builderState.options.y2GridStep"
              type="number"
              min="0.1"
              step="any"
              class="builder-input builder-input--short"
              placeholder="10"
              @input="notifyChange"
            >
          </div>
        </div>

        <!-- Radar scale & rings -->
        <template v-if="cap.supportsRadarScale">
          <div class="builder-field">
            <span class="builder-field__label">{{ t("builder.radar.scale") }}</span>
            <div class="builder-inline-inputs">
              <input
                v-model="builderState.canvas.radarMin"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                @input="notifyChange"
              >
              <span>→</span>
              <input
                v-model="builderState.canvas.radarMax"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                @input="notifyChange"
              >
            </div>
          </div>

          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.radar.rings") }}</span>
            <select
              v-model.number="builderState.canvas.radarRings"
              class="select builder-input"
              @change="notifyChange"
            >
              <option
                v-for="r in [2, 3, 4, 5, 6, 8, 10]"
                :key="r"
                :value="r"
              >
                {{ r }}
              </option>
            </select>
          </label>
        </template>

        <!-- Bubble extras -->
        <template v-if="cap.supportsBubbleExtras">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.bubble.sizeLabel") }}</span>
            <input
              v-model="builderState.canvas.sizeLabel"
              type="text"
              class="builder-input"
              @input="notifyChange"
            >
          </label>

          <div class="builder-field">
            <span class="builder-field__label">{{ t("builder.bubble.midPoint") }}</span>
            <div class="builder-inline-inputs">
              <span>X:</span>
              <input
                v-model="builderState.canvas.midX"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                @input="notifyChange"
              >
              <span>Y:</span>
              <input
                v-model="builderState.canvas.midY"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                @input="notifyChange"
              >
            </div>
          </div>
        </template>

        <!-- Quadrant labels (for Bubble & Quadrant) -->
        <template v-if="cap.supportsBubbleExtras || cap.supportsQuadrantExtras">
          <template v-if="cap.supportsQuadrantExtras">
            <label class="builder-field">
              <span class="builder-field__label">{{ t("builder.axis.xLabel") }} (A --> B)</span>
              <input
                v-model="builderState.canvas.xAxis.label"
                type="text"
                class="builder-input"
                placeholder="Low --> High"
                @input="notifyChange"
              >
            </label>
            <label class="builder-field">
              <span class="builder-field__label">{{ t("builder.axis.yLabel") }} (A --> B)</span>
              <input
                v-model="builderState.canvas.yAxis.label"
                type="text"
                class="builder-input"
                placeholder="Low --> High"
                @input="notifyChange"
              >
            </label>
          </template>

          <div class="builder-field builder-field--wide">
            <span class="builder-field__label">{{ t("builder.quadrants.labels") }}</span>
            <div class="builder-quadrant-grid">
              <input
                v-model="builderState.canvas.quadrants[0]"
                type="text"
                class="builder-input"
                placeholder="Q1 (↖)"
                @input="notifyChange"
              >
              <input
                v-model="builderState.canvas.quadrants[1]"
                type="text"
                class="builder-input"
                placeholder="Q2 (↗)"
                @input="notifyChange"
              >
              <input
                v-model="builderState.canvas.quadrants[2]"
                type="text"
                class="builder-input"
                placeholder="Q3 (↙)"
                @input="notifyChange"
              >
              <input
                v-model="builderState.canvas.quadrants[3]"
                type="text"
                class="builder-input"
                placeholder="Q4 (↘)"
                @input="notifyChange"
              >
            </div>
          </div>
        </template>

        <!-- Gantt options -->
        <BuilderGanttCalendarPanel
          v-if="cap.supportsGanttDateOptions"
          v-model:builder-state="builderState"
          :cap="cap"
          @change="notifyChange"
        />
      </div>
    </section>

    <!-- SECTION 3: COLLAPSIBLE ADVANCED PARAMETERS -->
    <section
      v-if="hasAdvancedCapabilities"
      class="builder-card builder-card--collapsible"
    >
      <button
        type="button"
        class="builder-card__toggle"
        :aria-expanded="isAdvancedOpen"
        data-testid="builder-advanced-toggle"
        @click="isAdvancedOpen = !isAdvancedOpen"
      >
        <span class="builder-card__title">{{ t("builder.section.advanced") }}</span>
        <span class="builder-card__chevron" aria-hidden="true">
          {{ isAdvancedOpen ? "▾" : "▸" }}
        </span>
      </button>

      <div
        v-if="isAdvancedOpen"
        class="builder-advanced-body"
      >
        <div class="builder-form-grid">
          <label
            v-if="cap.supportsFontSize"
            class="builder-field"
          >
            <span class="builder-field__label">
              {{ t("builder.canvas.fontSize") }} ({{ builderState.canvas.fontSize }} px)
            </span>
            <div class="builder-inline-inputs">
              <input
                v-model.number="builderState.canvas.fontSize"
                type="range"
                min="6"
                max="28"
                step="1"
                @input="notifyChange"
              >
              <input
                v-model.number="builderState.canvas.fontSize"
                type="number"
                min="6"
                max="28"
                class="builder-input builder-input--short"
                @input="notifyChange"
              >
            </div>
          </label>

          <!-- Canvas Background & Text Color -->
          <template v-if="cap.supportsCanvasColors">
            <div class="builder-field">
              <span class="builder-field__label">{{ t("appearance.background") }}</span>
              <div class="builder-color-cell">
                <input
                  type="color"
                  class="builder-color-picker"
                  :value="builderState.canvas.background || '#ffffff'"
                  :title="builderState.canvas.background || t('builder.option.auto')"
                  @input="
                    builderState.canvas.background = ($event.target as HTMLInputElement).value;
                    notifyChange();
                  "
                >
                <div class="builder-swatches builder-swatches--inline">
                  <button
                    v-for="preset in PREVIEW_BG_PRESETS"
                    :key="preset.id"
                    type="button"
                    class="builder-swatch"
                    :style="{ backgroundColor: preset.value }"
                    :title="t(`toolbar.previewBackgroundPreset.${preset.id}`)"
                    @click="setPresetBackground(preset.value)"
                  />
                </div>
                <button
                  v-if="builderState.canvas.background"
                  type="button"
                  class="builder-icon-mini"
                  :title="t('builder.option.reset')"
                  @click="
                    builderState.canvas.background = '';
                    notifyChange();
                  "
                >
                  ×
                </button>
              </div>
            </div>

            <div class="builder-field">
              <span class="builder-field__label">{{ t("appearance.textColor") }}</span>
              <div class="builder-color-cell">
                <label class="builder-inline-check">
                  <input
                    v-model="builderState.canvas.autoTextColor"
                    type="checkbox"
                    @change="notifyChange"
                  >
                  <span>{{ t("appearance.textAuto") }}</span>
                </label>
                <input
                  v-if="!builderState.canvas.autoTextColor"
                  type="color"
                  class="builder-color-picker"
                  :value="builderState.canvas.textColor || '#1f2328'"
                  :title="builderState.canvas.textColor || '#1f2328'"
                  @input="
                    builderState.canvas.textColor = ($event.target as HTMLInputElement).value;
                    notifyChange();
                  "
                >
              </div>
            </div>
          </template>

          <!-- Waterfall semantic colors (compact picker + reset) -->
          <template v-if="cap.supportsWaterfallColors">
            <div
              v-for="key in (['total', 'increase', 'decrease'] as const)"
              :key="key"
              class="builder-field"
            >
              <span class="builder-field__label">
                {{ t(`builder.color.waterfall.${key}`) }}
              </span>
              <div class="builder-color-cell">
                <input
                  type="color"
                  class="builder-color-picker"
                  :value="
                    builderState.options.namedColors[key] ||
                    (key === 'total' ? '#0969da' : key === 'increase' ? '#2da44e' : '#cf222e')
                  "
                  :title="builderState.options.namedColors[key] || t('builder.option.auto')"
                  @input="
                    builderState.options.namedColors[key] = ($event.target as HTMLInputElement).value;
                    notifyChange();
                  "
                >
                <button
                  v-if="builderState.options.namedColors[key]"
                  type="button"
                  class="builder-icon-mini"
                  :title="t('builder.option.reset')"
                  @click="
                    builderState.options.namedColors[key] = '';
                    notifyChange();
                  "
                >
                  ×
                </button>
              </div>
            </div>
          </template>

          <!-- Boxplot semantic colors (compact picker + reset) -->
          <template v-if="cap.supportsBoxplotColors">
            <div
              v-for="key in (['box', 'median', 'whisker', 'outlier'] as const)"
              :key="key"
              class="builder-field"
            >
              <span class="builder-field__label">
                {{ t(`builder.color.boxplot.${key}`) }}
              </span>
              <div class="builder-color-cell">
                <input
                  type="color"
                  class="builder-color-picker"
                  :value="builderState.options.namedColors[key] || '#0969da'"
                  :title="builderState.options.namedColors[key] || t('builder.option.auto')"
                  @input="
                    builderState.options.namedColors[key] = ($event.target as HTMLInputElement).value;
                    notifyChange();
                  "
                >
                <button
                  v-if="builderState.options.namedColors[key]"
                  type="button"
                  class="builder-icon-mini"
                  :title="t('builder.option.reset')"
                  @click="
                    builderState.options.namedColors[key] = '';
                    notifyChange();
                  "
                >
                  ×
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Series colors s1..sN (compact picker + reset) -->
        <div
          v-if="cap.supportsSeriesColors && seriesCount > 0"
          class="builder-subsection"
        >
          <p class="builder-subsection__label">
            {{ t("builder.color.seriesPalette") }}
          </p>
          <div class="builder-series-colors">
            <div
              v-for="idx in seriesCount"
              :key="idx"
              class="builder-color-cell"
            >
              <span class="builder-series-badge">s{{ idx }}</span>
              <input
                type="color"
                class="builder-color-picker"
                :value="builderState.options.seriesColors[idx - 1] || '#0969da'"
                :title="builderState.options.seriesColors[idx - 1] || t('builder.option.auto')"
                @input="setSeriesColor(idx - 1, ($event.target as HTMLInputElement).value)"
              >
              <button
                v-if="builderState.options.seriesColors[idx - 1]"
                type="button"
                class="builder-icon-mini"
                :title="t('builder.option.reset')"
                @click="setSeriesColor(idx - 1, '')"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- Heatmap Scale Editor -->
        <div
          v-if="cap.supportsHeatmapScale"
          class="builder-subsection"
        >
          <div class="builder-list-header">
            <label class="builder-inline-check">
              <input
                v-model="builderState.options.heatmapAutoScale"
                type="checkbox"
                @change="notifyChange"
              >
              <span>{{ t("builder.heatmap.autoScale") }}</span>
            </label>
            <button
              v-if="!builderState.options.heatmapAutoScale"
              type="button"
              class="btn builder-btn"
              @click="addHeatmapBand"
            >
              <ActionIcon name="plus" />
              <span>{{ t("builder.heatmap.addBand") }}</span>
            </button>
          </div>

          <div
            v-if="!builderState.options.heatmapAutoScale"
            class="builder-list"
          >
            <div
              v-for="(band, idx) in builderState.options.heatmapBands"
              :key="idx"
              class="builder-list-row"
            >
              <input
                v-model="band.from"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="from"
                @input="notifyChange"
              >
              <span>—</span>
              <input
                v-if="!band.openEnded"
                v-model="band.to"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="to"
                @input="notifyChange"
              >
              <label class="builder-inline-check">
                <input
                  v-model="band.openEnded"
                  type="checkbox"
                  @change="notifyChange"
                >
                <span>+ (∞)</span>
              </label>
              <input
                type="color"
                class="builder-color-picker"
                :value="band.color || '#e8f5e9'"
                :title="band.color || '#e8f5e9'"
                @input="
                  band.color = ($event.target as HTMLInputElement).value;
                  notifyChange();
                "
              >
              <button
                type="button"
                class="builder-icon-mini builder-icon-mini--danger"
                :disabled="builderState.options.heatmapBands.length <= 1"
                @click="removeHeatmapBand(idx)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- Axis breaks -->
        <div
          v-if="cap.supportsBreaks"
          class="builder-subsection"
        >
          <div class="builder-list-header">
            <span class="builder-subsection__label">{{ t("builder.annotations.breaks") }}</span>
            <button
              type="button"
              class="btn builder-btn"
              data-testid="builder-add-break-btn"
              @click="addBreak"
            >
              <ActionIcon name="plus" />
              <span>{{ t("builder.annotations.addBreak") }}</span>
            </button>
          </div>

          <div
            v-if="builderState.options.breaks.length > 0"
            class="builder-list"
          >
            <div
              v-for="(brk, idx) in builderState.options.breaks"
              :key="idx"
              class="builder-list-row"
            >
              <input
                v-model="brk.after"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="from"
                @input="notifyChange"
              >
              <span>→</span>
              <input
                v-model="brk.before"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="to"
                @input="notifyChange"
              >
              <input
                v-model="brk.label"
                type="text"
                class="builder-input"
                :placeholder="t('builder.col.label')"
                @input="notifyChange"
              >
              <button
                type="button"
                class="builder-icon-mini builder-icon-mini--danger"
                @click="removeBreak(idx)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- Threshold lines -->
        <div
          v-if="cap.supportsThresholds"
          class="builder-subsection"
        >
          <div class="builder-list-header">
            <span class="builder-subsection__label">{{ t("builder.annotations.thresholds") }}</span>
            <button
              type="button"
              class="btn builder-btn"
              data-testid="builder-add-threshold-btn"
              @click="addThreshold"
            >
              <ActionIcon name="plus" />
              <span>{{ t("builder.annotations.addThreshold") }}</span>
            </button>
          </div>

          <div
            v-if="builderState.options.thresholds.length > 0"
            class="builder-list"
          >
            <div
              v-for="(th, idx) in builderState.options.thresholds"
              :key="idx"
              class="builder-list-row"
            >
              <input
                v-model="th.value"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="value"
                @input="notifyChange"
              >
              <input
                v-model="th.label"
                type="text"
                class="builder-input"
                :placeholder="t('builder.col.label')"
                @input="notifyChange"
              >
              <select
                v-model="th.style"
                class="select builder-input builder-input--short"
                @change="notifyChange"
              >
                <option
                  v-for="opt in LINE_STYLE_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ t(opt.labelKey) }}
                </option>
              </select>
              <input
                type="color"
                class="builder-color-picker"
                :value="th.color || '#cf222e'"
                :title="th.color || '#cf222e'"
                @input="
                  th.color = ($event.target as HTMLInputElement).value;
                  notifyChange();
                "
              >
              <button
                type="button"
                class="builder-icon-mini builder-icon-mini--danger"
                @click="removeThreshold(idx)"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        <!-- CAGR arrows -->
        <div
          v-if="cap.supportsCagr"
          class="builder-subsection"
        >
          <div class="builder-list-header">
            <span class="builder-subsection__label">{{ t("builder.annotations.cagr") }}</span>
            <button
              type="button"
              class="btn builder-btn"
              data-testid="builder-add-cagr-btn"
              @click="addCagr"
            >
              <ActionIcon name="plus" />
              <span>{{ t("builder.annotations.addCagr") }}</span>
            </button>
          </div>

          <div
            v-if="builderState.options.cagrs.length > 0"
            class="builder-list"
          >
            <div
              v-for="(cagr, idx) in builderState.options.cagrs"
              :key="idx"
              class="builder-list-row"
            >
              <select
                v-model.number="cagr.seriesIndex"
                class="select builder-input"
                data-testid="builder-cagr-series"
                :aria-label="t('builder.cagr.series')"
                :title="t('builder.cagr.series')"
                @change="notifyChange"
              >
                <option
                  v-for="series in cagrSeriesOptions"
                  :key="series.index"
                  :value="series.index"
                >
                  {{ series.label }}
                </option>
              </select>
              <input
                v-model.number="cagr.from"
                type="number"
                min="1"
                class="builder-input builder-input--short"
                title="From bar #"
                @input="notifyChange"
              >
              <span>→</span>
              <input
                v-model.number="cagr.to"
                type="number"
                min="2"
                class="builder-input builder-input--short"
                title="To bar #"
                @input="notifyChange"
              >
              <select
                v-model="cagr.format"
                class="select builder-input builder-input--short"
                @change="notifyChange"
              >
                <option
                  v-for="opt in CAGR_FORMAT_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ t(opt.labelKey) }}
                </option>
              </select>
              <input
                v-model="cagr.prefix"
                type="text"
                class="builder-input builder-input--short"
                placeholder="prefix"
                @input="notifyChange"
              >
              <input
                v-model="cagr.label"
                type="text"
                class="builder-input"
                :placeholder="t('builder.col.label')"
                @input="notifyChange"
              >
              <button
                type="button"
                class="builder-icon-mini builder-icon-mini--danger"
                @click="removeCagr(idx)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
