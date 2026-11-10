<script setup lang="ts">
import { computed } from "vue";
import { useLocale } from "@/composables/useLocale";
import {
  MERMAID_GANTT_AXIS_PRESET_OPTIONS,
  MERMAID_GANTT_TICK_PRESET_OPTIONS,
  PLANTUML_GANTT_LANGUAGE_OPTIONS,
  PLANTUML_GANTT_SCALE_OPTIONS,
  type DiagramBuilderCapability,
  type DiagramBuilderState,
} from "@/services/diagram-builder";

const builderState = defineModel<DiagramBuilderState>("builderState", {
  required: true,
});

defineProps<{
  cap: DiagramBuilderCapability;
}>();

const emit = defineEmits<{
  change: [];
}>();

const { t } = useLocale();

function notifyChange(): void {
  emit("change");
}

const axisPresetValue = computed(() => {
  const current = builderState.value.canvas.ganttAxisFormat.trim();
  const known = MERMAID_GANTT_AXIS_PRESET_OPTIONS.some((o) => o.value === current);
  return known ? current : "__custom__";
});

function onAxisPresetChange(value: string): void {
  if (value === "__custom__") {
    return;
  }
  builderState.value.canvas.ganttAxisFormat = value;
  notifyChange();
}

const tickPresetValue = computed(() => {
  const current = builderState.value.appearance.gantt.tickInterval.trim();
  const known = MERMAID_GANTT_TICK_PRESET_OPTIONS.some((o) => o.value === current);
  return known ? current : "__custom__";
});

function onTickPresetChange(value: string): void {
  if (value === "__custom__") {
    return;
  }
  builderState.value.appearance.gantt.tickInterval = value;
  notifyChange();
}
</script>

<template>
  <!-- PlantUML Gantt calendar & scale options -->
  <template v-if="builderState.format === 'plantuml'">
    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.language") }}</span>
      <select
        v-model="builderState.canvas.ganttLanguage"
        class="select builder-input"
        data-testid="builder-gantt-language"
        @change="notifyChange"
      >
        <option
          v-for="opt in PLANTUML_GANTT_LANGUAGE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ t(opt.labelKey) }}
        </option>
      </select>
    </label>

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.projectStarts") }}</span>
      <input
        v-model="builderState.canvas.ganttProjectStarts"
        type="date"
        class="builder-input"
        data-testid="builder-gantt-project-starts"
        @input="notifyChange"
      >
    </label>

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.scale") }}</span>
      <select
        v-model="builderState.canvas.ganttScale"
        class="select builder-input"
        data-testid="builder-gantt-scale"
        @change="notifyChange"
      >
        <option
          v-for="opt in PLANTUML_GANTT_SCALE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ t(opt.labelKey) }}
        </option>
      </select>
    </label>

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.zoom") }}</span>
      <input
        v-model="builderState.canvas.ganttZoom"
        type="number"
        min="0.5"
        max="5"
        step="0.5"
        class="builder-input"
        :placeholder="t('builder.option.auto')"
        @input="notifyChange"
      >
    </label>

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.closedWeekends") }}</span>
      <select
        :value="builderState.canvas.ganttClosedWeekends ? 'on' : 'off'"
        class="select builder-input"
        data-testid="builder-gantt-closed-weekends"
        @change="
          builderState.canvas.ganttClosedWeekends =
            ($event.target as HTMLSelectElement).value === 'on';
          notifyChange();
        "
      >
        <option value="off">{{ t("builder.option.off") }}</option>
        <option value="on">{{ t("builder.option.on") }}</option>
      </select>
    </label>
  </template>

  <!-- Mermaid Gantt calendar, format & layout options -->
  <template v-else>
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

    <label class="builder-field">
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

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.axisPreset") }}</span>
      <select
        :value="axisPresetValue"
        class="select builder-input"
        data-testid="builder-gantt-axis-preset"
        @change="onAxisPresetChange(($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="opt in MERMAID_GANTT_AXIS_PRESET_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ t(opt.labelKey) }}
        </option>
        <option
          v-if="axisPresetValue === '__custom__'"
          value="__custom__"
        >
          {{ builderState.canvas.ganttAxisFormat }}
        </option>
      </select>
    </label>

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.axisFormat") }}</span>
      <input
        v-model="builderState.canvas.ganttAxisFormat"
        type="text"
        class="builder-input"
        placeholder="%d.%m"
        data-testid="builder-gantt-axis-format"
        @input="notifyChange"
      >
    </label>

    <label class="builder-field">
      <span class="builder-field__label">{{ t("builder.gantt.todayMarker") }}</span>
      <select
        :value="builderState.canvas.ganttTodayMarker === 'off' ? 'off' : 'on'"
        class="select builder-input"
        @change="
          builderState.canvas.ganttTodayMarker =
            ($event.target as HTMLSelectElement).value === 'off' ? 'off' : '';
          notifyChange();
        "
      >
        <option value="on">{{ t("builder.option.show") }}</option>
        <option value="off">{{ t("builder.option.hide") }}</option>
      </select>
    </label>

    <template v-if="cap.supportsGanttStyle">
      <label class="builder-field">
        <span class="builder-field__label">{{ t("builder.gantt.weekday") }}</span>
        <select
          v-model="builderState.appearance.gantt.weekday"
          class="select builder-input"
          data-testid="builder-gantt-weekday"
          @change="notifyChange"
        >
          <option value="">{{ t("builder.option.auto") }}</option>
          <option value="monday">{{ t("builder.gantt.weekday.monday") }}</option>
          <option value="sunday">{{ t("builder.gantt.weekday.sunday") }}</option>
        </select>
      </label>

      <label class="builder-field">
        <span class="builder-field__label">{{ t("builder.gantt.tickInterval") }}</span>
        <select
          :value="tickPresetValue"
          class="select builder-input"
          data-testid="builder-gantt-tick-preset"
          @change="onTickPresetChange(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="opt in MERMAID_GANTT_TICK_PRESET_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ t(opt.labelKey) }}
          </option>
          <option
            v-if="tickPresetValue === '__custom__'"
            value="__custom__"
          >
            {{ builderState.appearance.gantt.tickInterval }}
          </option>
        </select>
      </label>

      <label class="builder-field">
        <span class="builder-field__label">{{ t("builder.gantt.topAxis") }}</span>
        <select
          :value="builderState.appearance.gantt.topAxis ? 'on' : 'off'"
          class="select builder-input"
          @change="
            builderState.appearance.gantt.topAxis =
              ($event.target as HTMLSelectElement).value === 'on';
            notifyChange();
          "
        >
          <option value="off">{{ t("builder.option.off") }}</option>
          <option value="on">{{ t("builder.option.on") }}</option>
        </select>
      </label>

      <label class="builder-field">
        <span class="builder-field__label">{{ t("builder.gantt.displayMode") }}</span>
        <select
          v-model="builderState.appearance.gantt.displayMode"
          class="select builder-input"
          @change="notifyChange"
        >
          <option value="">{{ t("builder.option.auto") }}</option>
          <option value="compact">{{ t("builder.gantt.displayMode.compact") }}</option>
        </select>
      </label>
    </template>
  </template>
</template>
