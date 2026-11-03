import { computed, ref, watch, type Ref } from "vue";
import {
  MAX_IMAGE_SIDE,
  MIN_IMAGE_SIDE,
  applyPreviewBackground,
  applySvgSize,
  parseSvgSize,
  type ImageSize,
} from "@/utils/export";

export const STORAGE_KEY_IMAGE_SIZE = "code2graph-image-size";

/** `null` — «натуральный» размер SVG, заданный рендером. */
export type ImageSizeOverride = ImageSize | null;

function clampSide(value: number): number {
  if (!Number.isFinite(value)) return MIN_IMAGE_SIDE;
  return Math.min(MAX_IMAGE_SIDE, Math.max(MIN_IMAGE_SIDE, Math.round(value)));
}

function readStoredSize(): ImageSizeOverride {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_IMAGE_SIZE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ImageSize>;
    if (typeof parsed.width !== "number" || typeof parsed.height !== "number") return null;
    return { width: clampSide(parsed.width), height: clampSide(parsed.height) };
  } catch {
    return null;
  }
}

/**
 * Размер генерируемого изображения.
 * Хранит «ручной» размер (или null — натуральный) и отдаёт SVG,
 * растянутый до этого размера. Пропорции не навязываются: пользователь
 * задаёт и ширину, и высоту явно.
 *
 * @param svgMarkup исходный SVG
 * @param previewBackground текущий фон предпросмотра — им закрашиваются
 *   вырезы под подписи, чтобы они совпадали с фоном диаграммы
 */
export function useImageSize(
  svgMarkup: Ref<string>,
  previewBackground?: Ref<string>,
) {
  const override = ref<ImageSizeOverride>(readStoredSize());

  /** Натуральный размер текущего SVG — для кнопки «сбросить». */
  const naturalSize = computed<ImageSize>(() => {
    if (!svgMarkup.value) return { width: 800, height: 600 };
    return parseSvgSize(svgMarkup.value);
  });

  const activeSize = computed<ImageSize>(() => override.value ?? naturalSize.value);

  const isCustom = computed(() => override.value !== null);

  const sizedMarkup = computed(() => {
    if (!svgMarkup.value) return svgMarkup.value;
    // Фон диаграммы применяется всегда (и при натуральном размере): вырезы
    // под подписи в SVG нарисованы цветом темы, а не выбранным фоном.
    const markup = applyPreviewBackground(
      svgMarkup.value,
      previewBackground?.value ?? "",
    );
    if (!override.value) return markup;
    return applySvgSize(markup, override.value);
  });

  function setSize(width: number, height: number): void {
    override.value = { width: clampSide(width), height: clampSide(height) };
  }

  /** Меняет только ширину, высоту пересчитывает по текущим пропорциям. */
  function setWidth(width: number): void {
    const base = activeSize.value;
    const ratio = base.width > 0 ? base.height / base.width : 1;
    const next = clampSide(width);
    setSize(next, clampSide(next * ratio));
  }

  function setHeight(height: number): void {
    const base = activeSize.value;
    const ratio = base.height > 0 ? base.width / base.height : 1;
    const next = clampSide(height);
    setSize(clampSide(next * ratio), next);
  }

  function resetSize(): void {
    override.value = null;
  }

  watch(
    override,
    (value) => {
      try {
        if (value) {
          localStorage.setItem(STORAGE_KEY_IMAGE_SIZE, JSON.stringify(value));
        } else {
          localStorage.removeItem(STORAGE_KEY_IMAGE_SIZE);
        }
      } catch {
        // приватный режим / нет storage — размер просто не запомнится
      }
    },
    { deep: true },
  );

  return {
    naturalSize,
    activeSize,
    isCustom,
    sizedMarkup,
    setSize,
    setWidth,
    setHeight,
    resetSize,
  };
}
