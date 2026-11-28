import { computed, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import { checkSvgQuality } from "@/services/export/quality/svg-quality";
import type { QualityReport } from "@/services/export/quality/types";

/**
 * Отчёт качества для превью.
 *
 * Проверка разбирает SVG в DOM и обходит элементы — на большой диаграмме это
 * заметно дороже рендера. Поэтому запускаем её с задержкой: серия правок
 * даёт один прогон, а не по одному на каждое изменение.
 */
export const SVG_QUALITY_DEBOUNCE_MS = 250;

export function useSvgQuality(
  source: MaybeRefOrGetter<string | undefined>,
  debounceMs = SVG_QUALITY_DEBOUNCE_MS,
) {
  const report = ref<QualityReport | null>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  watch(
    () => toValue(source),
    (svg) => {
      cancel();
      if (!svg || !svg.trim()) {
        report.value = null;
        return;
      }
      timer = setTimeout(() => {
        timer = null;
        report.value = checkSvgQuality(svg);
      }, debounceMs);
    },
    { immediate: true },
  );

  onUnmounted(cancel);

  /**
   * Блокирует только то, что ломает картинку: неразобранный SVG и проверки
   * из `FAILING_CHECKS`. Предупреждения геометрии и отсутствие DOM — нет.
   */
  const blocked = computed(() => {
    const value = report.value;
    if (!value) {
      return false;
    }
    if (value.error) {
      return value.error === "invalid-svg";
    }
    return value.checks.some((check) => check.status === "fail");
  });

  return { report, blocked };
}
