<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useLocale } from "@/composables/useLocale";
import type { LocaleKey } from "@/locales/types";
import type { QualityReport, QualityStatus } from "@/services/export/quality/types";

const props = defineProps<{
  report: QualityReport | null;
}>();

const { t } = useLocale();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

type Tone = QualityStatus | "idle";

const tone = computed<Tone>(() => {
  const report = props.report;
  if (!report) {
    return "idle";
  }
  if (report.error) {
    return report.error === "dom-unavailable" ? "idle" : "fail";
  }
  if (report.checks.some((check) => check.status === "fail")) {
    return "fail";
  }
  return report.warnings > 0 ? "warn" : "pass";
});

const GLYPHS: Record<Tone, string> = { idle: "…", pass: "✓", warn: "!", fail: "✕" };

const score = computed(() => props.report?.score ?? "");

const label = computed(() => t("toolbar.qualityScore", { score: score.value }));

/** В панель идут только нарушения: пройденные проверки не засоряют список. */
const rows = computed(() =>
  (props.report?.checks ?? [])
    .filter((check) => check.status !== "pass")
    .map((check) => ({
      id: check.id,
      status: check.status,
      text: t(check.messageKey as LocaleKey, { count: check.count }),
    })),
);

const errorText = computed(() => {
  const error = props.report?.error;
  if (!error) {
    return "";
  }
  return t(error === "invalid-svg" ? "export.quality.invalidSvg" : "export.quality.domUnavailable");
});

const summary = computed(() => {
  const report = props.report;
  if (!report || report.error) {
    return "";
  }
  return report.warnings > 0
    ? t("export.quality.warnings", { count: report.warnings })
    : t("export.quality.allGood");
});

function toggle(): void {
  open.value = !open.value;
}

function close(): void {
  open.value = false;
}

function onPointerDown(event: PointerEvent): void {
  if (!open.value) {
    return;
  }
  const root = rootRef.value;
  if (root && event.target instanceof Node && !root.contains(event.target)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onPointerDown, true);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onPointerDown, true);
});
</script>

<template>
  <div
    ref="rootRef"
    class="quality-badge"
    :class="`quality-badge--${tone}`"
    @keydown.escape.stop="close"
  >
    <button
      type="button"
      class="quality-badge__button"
      :aria-label="label"
      :aria-expanded="open"
      :title="summary || errorText"
      data-testid="preview-quality-badge"
      @click="toggle"
    >
      <span
        class="quality-badge__glyph"
        aria-hidden="true"
      >{{ GLYPHS[tone] }}</span>
      <span class="quality-badge__score">{{ score }}</span>
    </button>

    <div
      v-if="open"
      class="quality-badge__panel"
      role="dialog"
      :aria-label="t('export.quality.title')"
    >
      <p class="quality-badge__summary">
        {{ report?.error ? errorText : summary }}
      </p>
      <ul
        v-if="rows.length"
        class="quality-badge__list"
      >
        <li
          v-for="row in rows"
          :key="row.id"
          class="quality-badge__row"
          :class="`quality-badge__row--${row.status}`"
        >
          <span
            class="quality-badge__row-glyph"
            aria-hidden="true"
          >{{ GLYPHS[row.status] }}</span>
          <span>{{ row.text }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.quality-badge {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.quality-badge__button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  cursor: pointer;
}

.quality-badge__button:hover,
.quality-badge__button:focus-visible,
.quality-badge__button[aria-expanded="true"] {
  border-color: var(--border);
  background: var(--surface);
  color: var(--text);
}

.quality-badge__glyph {
  font-weight: 700;
}

.quality-badge--pass .quality-badge__glyph {
  color: var(--success, #1a7f37);
}

.quality-badge--warn .quality-badge__glyph {
  color: var(--warning, #9a6700);
}

.quality-badge--fail .quality-badge__glyph {
  color: var(--danger, #cf222e);
}

.quality-badge__panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 20;
  width: max-content;
  max-width: 320px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  color: var(--text);
  font-size: 0.78rem;
  line-height: 1.35;
}

.quality-badge__summary {
  margin: 0;
  font-weight: 600;
}

.quality-badge__list {
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.quality-badge__row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.quality-badge__row + .quality-badge__row {
  margin-top: 2px;
}

.quality-badge__row-glyph {
  font-weight: 700;
}

.quality-badge__row--pass .quality-badge__row-glyph {
  color: var(--success, #1a7f37);
}

.quality-badge__row--warn .quality-badge__row-glyph {
  color: var(--warning, #9a6700);
}

.quality-badge__row--fail .quality-badge__row-glyph {
  color: var(--danger, #cf222e);
}
</style>
