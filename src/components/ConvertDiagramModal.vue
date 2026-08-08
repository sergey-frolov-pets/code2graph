<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import {
  DIAGRAM_FORMATS,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import {
  convertDiagram,
  type ConversionMode,
} from "@/services/conversion/pipeline/convert-diagram";

const props = defineProps<{
  open: boolean;
  source: string;
  sourceFormat: DiagramFormat;
  previewSvg: string;
}>();

const emit = defineEmits<{
  close: [];
  apply: [payload: { source: string; format: DiagramFormat }];
}>();

const { t, locale } = useLocale();

const targetFormat = ref<DiagramFormat>("mermaid");
const mode = ref<ConversionMode>("auto");
const acceptedLosses = ref(false);

const conversionResult = computed(() =>
  convertDiagram({
    source: props.source,
    sourceFormat: props.sourceFormat,
    targetFormat: targetFormat.value,
    mode: mode.value,
    previewSvg: props.previewSvg,
    locale: locale.value,
  }),
);

const availableTargets = computed(() =>
  DIAGRAM_FORMATS.filter((format) => format !== props.sourceFormat),
);

const lossItems = computed(() =>
  conversionResult.value.report.lossIds.map((lossId) => ({
    id: lossId,
    label: t(`conversion.${lossId}`),
  })),
);

const canApply = computed(
  () =>
    conversionResult.value.ok &&
    !conversionResult.value.blocked &&
    acceptedLosses.value &&
    Boolean(conversionResult.value.targetSource),
);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      return;
    }
    targetFormat.value =
      availableTargets.value[0] ?? ("mermaid" as DiagramFormat);
    mode.value = "auto";
    acceptedLosses.value = false;
  },
);

function onApply(): void {
  if (!conversionResult.value.targetSource || !canApply.value) {
    return;
  }

  emit("apply", {
    source: conversionResult.value.targetSource,
    format: targetFormat.value,
  });
  emit("close");
}
</script>

<template>
  <AppModal
    :open="open"
    wide
    :title="t('conversion.title')"
    @close="emit('close')"
  >
    <div class="convert-form" data-testid="convert-diagram-modal">
      <label class="convert-field">
        <span class="convert-field__label">{{ t("conversion.targetFormat") }}</span>
        <select v-model="targetFormat" class="select">
          <option
            v-for="format in availableTargets"
            :key="format"
            :value="format"
          >
            {{ format }}
          </option>
        </select>
      </label>

      <label class="convert-field">
        <span class="convert-field__label">{{ t("conversion.mode") }}</span>
        <select v-model="mode" class="select">
          <option value="auto">{{ t("conversion.mode.auto") }}</option>
          <option value="combo">{{ t("conversion.mode.combo") }}</option>
          <option value="source">{{ t("conversion.mode.source") }}</option>
          <option value="visual">{{ t("conversion.mode.visual") }}</option>
        </select>
      </label>

      <p class="convert-level">
        {{ t(`conversion.level.${conversionResult.report.level}`) }}
      </p>

      <div v-if="conversionResult.blocked" class="convert-error">
        {{ t("conversion.blocked") }}
      </div>

      <div v-else class="convert-losses">
        <h3 class="convert-losses__title">{{ t("conversion.lossesTitle") }}</h3>
        <ul class="convert-losses__list">
          <li v-for="item in lossItems" :key="item.id">{{ item.label }}</li>
        </ul>
      </div>

      <label class="convert-accept">
        <input
          v-model="acceptedLosses"
          type="checkbox"
          data-testid="convert-accept-losses"
        />
        <span>{{ t("conversion.acceptLosses") }}</span>
      </label>

      <label v-if="conversionResult.targetSource" class="convert-field">
        <span class="convert-field__label">{{ t("conversion.preview") }}</span>
        <textarea
          class="convert-preview"
          readonly
          :value="conversionResult.targetSource"
          rows="12"
        />
      </label>
    </div>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.cancel") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        data-testid="convert-apply"
        :disabled="!canApply"
        @click="onApply"
      >
        {{ t("conversion.apply") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.convert-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.convert-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.convert-field__label {
  font-size: 0.86rem;
  color: var(--text-muted);
}

.convert-level {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--accent);
}

.convert-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.86rem;
}

.convert-losses__title {
  margin: 0 0 8px;
  font-size: 0.9rem;
}

.convert-losses__list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-muted);
  font-size: 0.84rem;
}

.convert-accept {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
}

.convert-preview {
  width: 100%;
  min-height: 180px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  line-height: 1.45;
  resize: vertical;
}
</style>
