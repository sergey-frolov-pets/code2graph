<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import EditorFoldRegionsList from "@/components/editor/EditorFoldRegionsList.vue";
import { useLocale } from "@/composables/useLocale";
import {
  canAddRegion,
  hasRegionStartingAtLine,
  normalizeLineRange,
  parseLineNumberInput,
  type CodeFoldRegion,
} from "@/utils/code-folds";

const props = defineProps<{
  open: boolean;
  anchorEl: HTMLElement | null;
  regions: CodeFoldRegion[];
  lineCount: number;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: { fromLine: number; toLine: number | null; label?: string }];
  remove: [regionId: string];
  navigate: [line: number];
}>();

const { t } = useLocale();

const panelRef = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});
const fromInput = ref("");
const toInput = ref("");
const labelInput = ref("");

const canSubmit = computed(() => {
  const fromLine = parseLineNumberInput(fromInput.value);
  if (fromLine === null) {
    return false;
  }

  const toRaw = toInput.value.trim();
  const toLine = toRaw ? parseLineNumberInput(toInput.value) : null;
  if (toRaw && toLine === null) {
    return false;
  }

  return canAddRegion(props.regions, fromLine, toLine, props.lineCount);
});

const duplicateStartError = computed(() => {
  const fromLine = parseLineNumberInput(fromInput.value);
  if (fromLine === null) {
    return "";
  }

  const toRaw = toInput.value.trim();
  const toLine = toRaw ? parseLineNumberInput(toInput.value) : null;
  if (toRaw && toLine === null) {
    return "";
  }

  const startLine =
    toLine === null
      ? fromLine
      : normalizeLineRange(fromLine, toLine).startLine;

  if (!hasRegionStartingAtLine(props.regions, startLine)) {
    return "";
  }

  return t("editor.regions.duplicateStart", { line: startLine });
});

function resetForm(): void {
  fromInput.value = "";
  toInput.value = "";
  labelInput.value = "";
}

function updatePanelPosition(): void {
  const anchor = props.anchorEl;
  const panel = panelRef.value;
  if (!anchor || !panel) {
    return;
  }

  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const margin = 8;
  const viewportPadding = 12;

  let left = anchorRect.left;
  let top = anchorRect.top - panelRect.height - margin;

  if (top < viewportPadding) {
    top = anchorRect.bottom + margin;
  }

  if (left + panelRect.width > window.innerWidth - viewportPadding) {
    left = window.innerWidth - panelRect.width - viewportPadding;
  }

  if (left < viewportPadding) {
    left = viewportPadding;
  }

  panelStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  };
}

function handleLineTap(line: number): void {
  if (!props.open) {
    return;
  }

  if (fromInput.value === "" || toInput.value !== "") {
    fromInput.value = String(line);
    toInput.value = "";
    return;
  }

  const fromLine = parseLineNumberInput(fromInput.value);
  if (fromLine === null) {
    fromInput.value = String(line);
    return;
  }

  if (line < fromLine) {
    toInput.value = fromInput.value;
    fromInput.value = String(line);
    return;
  }

  toInput.value = String(line);
}

function submitForm(): void {
  if (!canSubmit.value) {
    return;
  }

  const fromLine = parseLineNumberInput(fromInput.value);
  if (fromLine === null) {
    return;
  }

  const toRaw = toInput.value.trim();
  const toLine = toRaw ? parseLineNumberInput(toInput.value) : null;

  emit("submit", {
    fromLine,
    toLine,
    label: labelInput.value.trim() || undefined,
  });
  resetForm();
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      resetForm();
      return;
    }

    void nextTick(() => {
      updatePanelPosition();
    });
  },
);

watch(
  () => [props.anchorEl, props.regions.length, props.lineCount] as const,
  () => {
    if (props.open) {
      void nextTick(updatePanelPosition);
    }
  },
);

onMounted(() => {
  window.addEventListener("resize", updatePanelPosition);
});

onUnmounted(() => {
  window.removeEventListener("resize", updatePanelPosition);
});

defineExpose({
  handleLineTap,
});
</script>

<template>
  <Teleport to="body">
    <section
      v-if="open"
      ref="panelRef"
      class="fold-regions-panel"
      role="dialog"
      :aria-label="t('editor.regions.title')"
      :style="panelStyle"
    >
      <header class="fold-regions-panel__header">
        <h3 class="fold-regions-panel__title">{{ t("editor.regions.title") }}</h3>
        <button
          type="button"
          class="fold-regions-panel__close"
          :aria-label="t('modal.closeAria')"
          @click="emit('close')"
        >
          ×
        </button>
      </header>

      <div class="fold-regions-panel__body">
        <p class="fold-regions-panel__hint">{{ t("editor.regions.tapHint") }}</p>

        <label class="fold-regions-panel__field">
          <span>{{ t("editor.regions.label") }}</span>
          <input
            v-model="labelInput"
            type="text"
            class="fold-regions-panel__input"
            :placeholder="t('editor.regions.labelPlaceholder')"
            autocomplete="off"
          />
        </label>

        <div class="fold-regions-panel__range">
          <label class="fold-regions-panel__field">
            <span>{{ t("editor.regions.from") }}</span>
            <input
              v-model="fromInput"
              type="text"
              inputmode="numeric"
              class="fold-regions-panel__input"
              autocomplete="off"
            />
          </label>

          <label class="fold-regions-panel__field">
            <span>{{ t("editor.regions.to") }}</span>
            <input
              v-model="toInput"
              type="text"
              inputmode="numeric"
              class="fold-regions-panel__input"
              :placeholder="t('editor.regions.toPlaceholder')"
              autocomplete="off"
            />
          </label>
        </div>

        <p
          v-if="duplicateStartError"
          class="fold-regions-panel__error"
          role="alert"
        >
          {{ duplicateStartError }}
        </p>

        <button
          type="button"
          class="btn btn-primary fold-regions-panel__submit"
          :disabled="!canSubmit"
          @click="submitForm"
        >
          {{ t("editor.regions.ok") }}
        </button>

        <EditorFoldRegionsList
          :regions="regions"
          @navigate="emit('navigate', $event)"
          @remove="emit('remove', $event)"
        />
      </div>
    </section>
  </Teleport>
</template>

<style scoped>
.fold-regions-panel {
  position: fixed;
  z-index: 1100;
  width: min(280px, calc(100vw - 24px));
  max-height: min(70vh, 420px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.fold-regions-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}

.fold-regions-panel__title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.fold-regions-panel__close {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.35rem;
  line-height: 1;
  min-height: auto;
  padding: 0 4px;
}

.fold-regions-panel__body {
  padding: 12px;
  overflow: auto;
}

.fold-regions-panel__hint {
  margin: 0 0 10px;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.35;
}

.fold-regions-panel__error {
  margin: 0 0 10px;
  color: var(--danger);
  font-size: 0.78rem;
  line-height: 1.35;
}

.fold-regions-panel__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.fold-regions-panel__range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.fold-regions-panel__input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  min-height: 36px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.fold-regions-panel__submit {
  width: 100%;
  margin-top: 2px;
}
</style>
