<script setup lang="ts">
import { computed } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import BuilderHistogramPanel from "@/components/wizard/steps/panels/BuilderHistogramPanel.vue";
import { useLocale } from "@/composables/useLocale";
import {
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

const seriesCount = computed(() => {
  const dt = builderState.value.diagramType;
  if (dt === "series" || dt === "histogram") {
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

function notifyChange(): void {
  emit("change");
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
  <div class="builder-step builder-cards" data-testid="builder-options-step">
    <BuilderHistogramPanel
      v-if="builderState.diagramType === 'histogram'"
      v-model:builder-state="builderState"
      @change="notifyChange"
    />
    <!-- SECTION 1: VISUAL OPTIONS & LABELS -->
    <section
      v-if="
        cap.supportsLabelsMode ||
        cap.supportsConnectors ||
        cap.supportsStacked ||
        cap.supportsPieShowData ||
        cap.supportsVoronoiToggles ||
        cap.supportsRadarVisuals
      "
      class="builder-card"
    >
      <h3 class="builder-card__title">{{ t("builder.section.visualOptions") }}</h3>

      <div class="builder-form-grid">
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
          v-if="builderState.diagramType === 'series' || builderState.diagramType === 'waterfall' || builderState.diagramType === 'histogram'"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.option.labelAuto") }}</span>
          <select
            :value="
              builderState.options.labelFontColor === 'auto'
                ? 'auto'
                : builderState.options.labelFontColor
                  ? 'custom'
                  : 'theme'
            "
            class="select builder-input"
            @change="
              builderState.options.labelFontColor =
                ($event.target as HTMLSelectElement).value === 'auto'
                  ? 'auto'
                  : ($event.target as HTMLSelectElement).value === 'custom'
                    ? builderState.options.labelFontColor &&
                      builderState.options.labelFontColor !== 'auto'
                      ? builderState.options.labelFontColor
                      : '#1f2328'
                    : '';
              notifyChange();
            "
          >
            <option value="theme">{{ t("builder.option.labelColor.theme") }}</option>
            <option value="auto">{{ t("builder.option.labelColor.auto") }}</option>
            <option value="custom">{{ t("builder.option.labelColor.custom") }}</option>
          </select>
          <input
            v-if="builderState.options.labelFontColor && builderState.options.labelFontColor !== 'auto'"
            type="color"
            class="builder-color-picker"
            :value="builderState.options.labelFontColor"
            @input="
              builderState.options.labelFontColor = ($event.target as HTMLInputElement).value;
              notifyChange();
            "
          />
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
          v-if="cap.supportsStacked || builderState.diagramType === 'waterfall' || builderState.diagramType === 'histogram'"
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
            />
          </label>
        </template>
      </div>
    </section>

    <!-- SECTION 2: COLORS & PALETTE -->
    <section
      v-if="
        cap.supportsMono ||
        cap.supportsWaterfallColors ||
        cap.supportsBoxplotColors ||
        cap.supportsSeriesColors ||
        cap.supportsHeatmapScale
      "
      class="builder-card"
    >
      <h3 class="builder-card__title">{{ t("builder.section.colors") }}</h3>

      <div class="builder-form-grid">
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

        <!-- Waterfall semantic colors -->
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
                @input="
                  builderState.options.namedColors[key] = ($event.target as HTMLInputElement).value;
                  notifyChange();
                "
              />
              <input
                v-model="builderState.options.namedColors[key]"
                type="text"
                class="builder-input builder-input--short"
                placeholder="auto"
                @input="notifyChange"
              />
              <button
                v-if="builderState.options.namedColors[key]"
                type="button"
                class="builder-icon-mini"
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

        <!-- Boxplot semantic colors -->
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
                @input="
                  builderState.options.namedColors[key] = ($event.target as HTMLInputElement).value;
                  notifyChange();
                "
              />
              <input
                v-model="builderState.options.namedColors[key]"
                type="text"
                class="builder-input builder-input--short"
                placeholder="auto"
                @input="notifyChange"
              />
              <button
                v-if="builderState.options.namedColors[key]"
                type="button"
                class="builder-icon-mini"
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

      <!-- Series colors s1..sN -->
      <div
        v-if="cap.supportsSeriesColors && seriesCount > 0"
        class="builder-subsection"
      >
        <p class="builder-subsection__label">{{ t("builder.color.seriesPalette") }}</p>
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
              @input="setSeriesColor(idx - 1, ($event.target as HTMLInputElement).value)"
            />
            <input
              :value="builderState.options.seriesColors[idx - 1] ?? ''"
              type="text"
              class="builder-input builder-input--short"
              placeholder="auto"
              @input="setSeriesColor(idx - 1, ($event.target as HTMLInputElement).value)"
            />
            <button
              v-if="builderState.options.seriesColors[idx - 1]"
              type="button"
              class="builder-icon-mini"
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
            />
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
            />
            <span>—</span>
            <input
              v-if="!band.openEnded"
              v-model="band.to"
              type="number"
              step="any"
              class="builder-input builder-input--short"
              placeholder="to"
              @input="notifyChange"
            />
            <label class="builder-inline-check">
              <input
                v-model="band.openEnded"
                type="checkbox"
                @change="notifyChange"
              />
              <span>+ (∞)</span>
            </label>
            <input
              type="color"
              class="builder-color-picker"
              :value="band.color || '#e8f5e9'"
              @input="
                band.color = ($event.target as HTMLInputElement).value;
                notifyChange();
              "
            />
            <input
              v-model="band.color"
              type="text"
              class="builder-input builder-input--short"
              @input="notifyChange"
            />
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
    </section>

    <!-- SECTION 3: ANNOTATIONS (BREAKS, THRESHOLD LINES, CAGR) -->
    <section
      v-if="cap.supportsBreaks || cap.supportsThresholds || cap.supportsCagr"
      class="builder-card"
    >
      <h3 class="builder-card__title">{{ t("builder.section.annotations") }}</h3>

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
            />
            <span>→</span>
            <input
              v-model="brk.before"
              type="number"
              step="any"
              class="builder-input builder-input--short"
              placeholder="to"
              @input="notifyChange"
            />
            <input
              v-model="brk.label"
              type="text"
              class="builder-input"
              :placeholder="t('builder.col.label')"
              @input="notifyChange"
            />
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
            />
            <input
              v-model="th.label"
              type="text"
              class="builder-input"
              :placeholder="t('builder.col.label')"
              @input="notifyChange"
            />
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
              @input="
                th.color = ($event.target as HTMLInputElement).value;
                notifyChange();
              "
            />
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
            />
            <span>→</span>
            <input
              v-model.number="cagr.to"
              type="number"
              min="2"
              class="builder-input builder-input--short"
              title="To bar #"
              @input="notifyChange"
            />
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
            />
            <input
              v-model="cagr.label"
              type="text"
              class="builder-input"
              :placeholder="t('builder.col.label')"
              @input="notifyChange"
            />
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
    </section>

    <!-- Fallback info if diagram type has all settings in step 1 & 2 -->
    <p
      v-if="
        !cap.supportsLabelsMode &&
        !cap.supportsConnectors &&
        !cap.supportsStacked &&
        !cap.supportsPieShowData &&
        !cap.supportsVoronoiToggles &&
        !cap.supportsRadarVisuals &&
        !cap.supportsMono &&
        !cap.supportsWaterfallColors &&
        !cap.supportsBoxplotColors &&
        !cap.supportsSeriesColors &&
        !cap.supportsHeatmapScale &&
        !cap.supportsBreaks &&
        !cap.supportsThresholds &&
        !cap.supportsCagr
      "
      class="wizard-hint"
    >
      {{ t("builder.options.allConfiguredHint") }}
    </p>
  </div>
</template>
