<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import type { BuilderHistogramCurve, DiagramBuilderState } from "@/services/diagram-builder";

const builderState = defineModel<DiagramBuilderState>("builderState", { required: true });
const emit = defineEmits<{ change: [] }>();
const { t } = useLocale();

const DISTRIBUTIONS = ["normal", "lognormal", "exponential", "uniform", "gamma", "weibull"] as const;

function notify(): void {
  emit("change");
}

function addCurve(): void {
  const curve: BuilderHistogramCurve = {
    kind: "fit",
    distribution: "normal",
    seriesName: "",
    label: "",
    color: "",
    params: "mu=0 sigma=1",
  };
  builderState.value.options.histogram.curves.push(curve);
  notify();
}

function removeCurve(index: number): void {
  builderState.value.options.histogram.curves.splice(index, 1);
  notify();
}
</script>

<template>
  <section class="builder-card" data-testid="builder-histogram-panel">
    <h3 class="builder-card__title">{{ t("builder.histogram.title") }}</h3>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.bins") }}</span>
      <select v-model="builderState.options.histogram.binMode" class="select builder-input" @change="notify">
        <option value="auto">{{ t("builder.histogram.binMode.auto") }}</option>
        <option value="count">{{ t("builder.histogram.binMode.count") }}</option>
        <option value="width">{{ t("builder.histogram.binMode.width") }}</option>
        <option value="edges">{{ t("builder.histogram.binMode.edges") }}</option>
      </select>
    </label>
    <label v-if="builderState.options.histogram.binMode === 'count'" class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.binCount") }}</span>
      <input v-model="builderState.options.histogram.binCount" class="builder-input" @input="notify">
    </label>
    <label v-if="builderState.options.histogram.binMode === 'width'" class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.binWidth") }}</span>
      <input v-model="builderState.options.histogram.binWidth" class="builder-input" @input="notify">
    </label>
    <label v-if="builderState.options.histogram.binMode === 'edges'" class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.binEdges") }}</span>
      <input v-model="builderState.options.histogram.binEdges" class="builder-input" @input="notify">
    </label>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.scale") }}</span>
      <select v-model="builderState.options.histogram.scale" class="select builder-input" @change="notify">
        <option value="count">{{ t("builder.histogram.scale.count") }}</option>
        <option value="density">{{ t("builder.histogram.scale.density") }}</option>
      </select>
    </label>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.missing") }}</span>
      <select v-model="builderState.options.histogram.missing" class="select builder-input" @change="notify">
        <option value="drop">drop</option>
        <option value="mean">mean</option>
        <option value="median">median</option>
        <option value="zero">zero</option>
      </select>
    </label>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.errors") }}</span>
      <select v-model="builderState.options.histogram.errors" class="select builder-input" @change="notify">
        <option value="drop">drop</option>
        <option value="fail">fail</option>
      </select>
    </label>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.outliers") }}</span>
      <select v-model="builderState.options.histogram.outlierMethod" class="select builder-input" @change="notify">
        <option value="none">none</option>
        <option value="iqr">iqr</option>
        <option value="z">z</option>
        <option value="mad">mad</option>
      </select>
    </label>
    <label v-if="builderState.options.histogram.outlierMethod !== 'none'" class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.outlierK") }}</span>
      <input v-model="builderState.options.histogram.outlierK" class="builder-input" @input="notify">
    </label>
    <label v-if="builderState.options.histogram.outlierMethod !== 'none'" class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.outlierAction") }}</span>
      <select v-model="builderState.options.histogram.outlierAction" class="select builder-input" @change="notify">
        <option value="drop">drop</option>
        <option value="winsor">winsor</option>
        <option value="mark">mark</option>
      </select>
    </label>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.ci") }}</span>
      <input v-model="builderState.options.histogram.ci" class="builder-input" @input="notify">
    </label>
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.stats") }}</span>
      <input v-model="builderState.options.histogram.stats" class="builder-input" @input="notify">
    </label>
    <div class="builder-field">
      <span class="builder-field__label">{{ t("builder.histogram.curves") }}</span>
      <div v-for="(curve, index) in builderState.options.histogram.curves" :key="index" class="builder-inline-inputs">
        <select v-model="curve.kind" class="select builder-input" @change="notify">
          <option value="fit">{{ t("builder.histogram.curveKind.fit") }}</option>
          <option value="curve">{{ t("builder.histogram.curveKind.curve") }}</option>
        </select>
        <select v-model="curve.distribution" class="select builder-input" @change="notify">
          <option v-for="name in DISTRIBUTIONS" :key="name" :value="name">{{ name }}</option>
        </select>
        <input v-model="curve.seriesName" class="builder-input" :placeholder="t('builder.col.series')" @input="notify">
        <input
          v-if="curve.kind === 'curve'"
          v-model="curve.params"
          class="builder-input"
          :placeholder="t('builder.histogram.params')"
          @input="notify"
        >
        <input v-model="curve.label" class="builder-input" :placeholder="t('builder.col.label')" @input="notify">
        <input v-model="curve.color" class="builder-input builder-input--short" placeholder="#0969da" @input="notify">
        <button type="button" class="builder-icon-button" @click="removeCurve(index)">×</button>
      </div>
      <button type="button" class="builder-text-button" @click="addCurve">{{ t("builder.histogram.addCurve") }}</button>
    </div>
  </section>
</template>
