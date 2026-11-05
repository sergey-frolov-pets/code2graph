/**
 * Пропорции кадра для графиков расширения Mermaid.
 * Ключевое слово: `ratio 16x9` (также `aspect 4:3`, `16/9`, кириллическая «х»).
 * Поле графика растягивается, чтобы всё изображение заняло эти пропорции.
 */

export interface ChartAspect {
  /** Доли ширины, например 16. */
  width: number;
  /** Доли высоты, например 9. */
  height: number;
}

/** Слишком вытянутый кадр превращает бары и области в полоску. */
const MAX_CHART_ASPECT = 8;

const ASPECT_LINE = /^(?:ratio|aspect)\b\s*(.*)$/i;
const ASPECT_VALUE = /^(\d+(?:[.,]\d+)?)\s*[xх×:/]\s*(\d+(?:[.,]\d+)?)$/i;

export function parseAspectDirective(
  line: string,
): { aspect: ChartAspect } | { error: string } | null {
  const match = ASPECT_LINE.exec(line.trim());
  if (!match) return null;

  const body = match[1].trim();
  const value = ASPECT_VALUE.exec(body);
  if (!value) {
    return {
      error: `ожидается «ratio 16x9» или «ratio 4:3», получено «${body || line.trim()}»`,
    };
  }

  const width = Number(value[1].replace(",", "."));
  const height = Number(value[2].replace(",", "."));
  if (!(width > 0) || !(height > 0)) {
    return { error: `ожидается «ratio 16x9» или «ratio 4:3», получено «${body}»` };
  }

  const aspect = width / height;
  if (aspect > MAX_CHART_ASPECT || 1 / aspect > MAX_CHART_ASPECT) {
    return { error: `пропорции «${body}» слишком вытянутые` };
  }

  return { aspect: { width, height } };
}

export interface PlotFrame {
  plotWidth: number;
  plotHeight: number;
  totalWidth: number;
  totalHeight: number;
}

/**
 * Увеличивает поле графика так, чтобы весь холст совпал с пропорциями.
 * Короткая сторона растёт, содержимое не сжимается.
 */
export function growPlotToAspect(
  frame: PlotFrame,
  aspect: ChartAspect,
): { plotWidth: number; plotHeight: number } {
  const target = aspect.width / aspect.height;
  const chromeX = Math.max(0, frame.totalWidth - frame.plotWidth);
  const chromeY = Math.max(0, frame.totalHeight - frame.plotHeight);
  const currentW = chromeX + frame.plotWidth;
  const currentH = chromeY + frame.plotHeight;
  if (!(currentW > 0) || !(currentH > 0)) {
    return { plotWidth: frame.plotWidth, plotHeight: frame.plotHeight };
  }

  const current = currentW / currentH;
  let plotWidth = frame.plotWidth;
  let plotHeight = frame.plotHeight;
  if (current < target) {
    plotWidth = Math.max(plotWidth, currentH * target - chromeX);
  } else if (current > target) {
    plotHeight = Math.max(plotHeight, currentW / target - chromeY);
  }

  return { plotWidth, plotHeight };
}
