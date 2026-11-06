<script setup lang="ts">
import { computed } from "vue";
import { useLocale } from "@/composables/useLocale";
import { PREVIEW_BG_PRESETS } from "@/constants/editor-settings";
import {
  ASPECT_RATIO_OPTIONS,
  getDiagramBuilderSchema,
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

function notifyChange(): void {
  emit("change");
}

function setPresetBackground(hex: string): void {
  builderState.value.canvas.background = hex;
  notifyChange();
}
</script>

<template>
  <div class="builder-step builder-cards" data-testid="builder-canvas-axes-step">
    <!-- SECTION 1: CANVAS & LAYOUT -->
    <section class="builder-card">
      <h3 class="builder-card__title">{{ t("builder.section.canvas") }}</h3>

      <div class="builder-form-grid">
        <label class="builder-field builder-field--wide">
          <span class="builder-field__label">{{ t("builder.canvas.title") }}</span>
          <input
            v-model="builderState.canvas.title"
            type="text"
            class="builder-input"
            :placeholder="t('builder.canvas.titlePlaceholder')"
            data-testid="builder-title-input"
            @input="notifyChange"
          />
        </label>

        <label
          v-if="cap.supportsDirection"
          class="builder-field"
        >
          <span class="builder-field__label">{{ t("builder.canvas.direction") }}</span>
          <select
            v-model="builderState.canvas.direction"
            class="select builder-input"
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
            />
            <span>×</span>
            <input
              v-model="builderState.canvas.customAspectHeight"
              type="number"
              min="1"
              max="32"
              class="builder-input builder-input--short"
              @input="notifyChange"
            />
          </div>
        </div>

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
            />
            <input
              v-model.number="builderState.canvas.fontSize"
              type="number"
              min="6"
              max="28"
              class="builder-input builder-input--short"
              @input="notifyChange"
            />
          </div>
        </label>
      </div>

      <!-- Canvas Background & Text Color (for waterfall / supported types) -->
      <div
        v-if="cap.supportsCanvasColors"
        class="builder-subsection"
      >
        <div class="builder-form-grid">
          <div class="builder-field">
            <span class="builder-field__label">{{ t("appearance.background") }}</span>
            <div class="builder-color-cell">
              <input
                type="color"
                class="builder-color-picker"
                :value="builderState.canvas.background || '#ffffff'"
                @input="
                  builderState.canvas.background = ($event.target as HTMLInputElement).value;
                  notifyChange();
                "
              />
              <input
                v-model="builderState.canvas.background"
                type="text"
                class="builder-input builder-input--short"
                placeholder="#ffffff"
                @input="notifyChange"
              />
              <button
                v-if="builderState.canvas.background"
                type="button"
                class="builder-icon-mini"
                @click="
                  builderState.canvas.background = '';
                  notifyChange();
                "
              >
                ×
              </button>
            </div>
            <div class="builder-swatches">
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
          </div>

          <div class="builder-field">
            <span class="builder-field__label">{{ t("appearance.textColor") }}</span>
            <div class="builder-color-cell">
              <label class="builder-inline-check">
                <input
                  v-model="builderState.canvas.autoTextColor"
                  type="checkbox"
                  @change="notifyChange"
                />
                <span>{{ t("appearance.textAuto") }}</span>
              </label>
              <template v-if="!builderState.canvas.autoTextColor">
                <input
                  type="color"
                  class="builder-color-picker"
                  :value="builderState.canvas.textColor || '#1f2328'"
                  @input="
                    builderState.canvas.textColor = ($event.target as HTMLInputElement).value;
                    notifyChange();
                  "
                />
                <input
                  v-model="builderState.canvas.textColor"
                  type="text"
                  class="builder-input builder-input--short"
                  placeholder="#1f2328"
                  @input="notifyChange"
                />
              </template>
            </div>
          </div>
        </div>
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
      <h3 class="builder-card__title">{{ t("builder.section.axes") }}</h3>

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
            />
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
                />
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
                />
                <span>→</span>
                <input
                  v-model="builderState.canvas.yAxis.max"
                  type="number"
                  step="any"
                  class="builder-input builder-input--short"
                  placeholder="max"
                  @input="notifyChange"
                />
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
            />
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
              />
              <span>→</span>
              <input
                v-model="builderState.canvas.xAxis.max"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                placeholder="max"
                @input="notifyChange"
              />
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
              <option
                v-if="builderState.diagramType !== 'waterfall'"
                value="off"
              >
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
            />
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
              />
              <span>→</span>
              <input
                v-model="builderState.canvas.radarMax"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                @input="notifyChange"
              />
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
            />
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
              />
              <span>Y:</span>
              <input
                v-model="builderState.canvas.midY"
                type="number"
                step="any"
                class="builder-input builder-input--short"
                @input="notifyChange"
              />
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
              />
            </label>
            <label class="builder-field">
              <span class="builder-field__label">{{ t("builder.axis.yLabel") }} (A --> B)</span>
              <input
                v-model="builderState.canvas.yAxis.label"
                type="text"
                class="builder-input"
                placeholder="Low --> High"
                @input="notifyChange"
              />
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
              />
              <input
                v-model="builderState.canvas.quadrants[1]"
                type="text"
                class="builder-input"
                placeholder="Q2 (↗)"
                @input="notifyChange"
              />
              <input
                v-model="builderState.canvas.quadrants[2]"
                type="text"
                class="builder-input"
                placeholder="Q3 (↙)"
                @input="notifyChange"
              />
              <input
                v-model="builderState.canvas.quadrants[3]"
                type="text"
                class="builder-input"
                placeholder="Q4 (↘)"
                @input="notifyChange"
              />
            </div>
          </div>
        </template>

        <!-- Gantt options -->
        <template v-if="cap.supportsGanttDateOptions">
          <label class="builder-field">
            <span class="builder-field__label">{{ t("builder.gantt.dateFormat") }}</span>
            <select
              v-model="builderState.canvas.ganttDateFormat"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY</option>
              <option value="YYYY-MM-DD HH:mm">YYYY-MM-DD HH:mm</option>
            </select>
          </label>

          <label
            v-if="builderState.format === 'mermaid'"
            class="builder-field"
          >
            <span class="builder-field__label">{{ t("builder.gantt.excludes") }}</span>
            <select
              v-model="builderState.canvas.ganttExcludes"
              class="select builder-input"
              @change="notifyChange"
            >
              <option value="">{{ t("builder.option.none") }}</option>
              <option value="weekends">{{ t("builder.gantt.excludesWeekends") }}</option>
            </select>
          </label>
        </template>
      </div>
    </section>
  </div>
</template>
