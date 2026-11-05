import {
  clamp,
  createSvg,
  drawLabelLines,
  fixedTicks,
  fmt,
  hasLabelBreak,
  labelLineCount,
  labelLineStep,
  measureLabelWidth,
  measureText,
  niceTicks,
  resolvePalette,
  splitLabelLines,
  truncateLabel,
  usesInvertedMono,
} from "../../common";
import type { ExtRenderOptions } from "../../types";
import {
  BAR_GAP,
  createScale,
  defaultLineColor,
  FONT_BASE,
  FONT_MAX,
  FONT_MIN,
  INSIDE_MIN_HEIGHT,
  INSIDE_TEXT,
  LINE_DASH,
  MAX_BAR_WIDTH,
  MIN_BAR_WIDTH,
  PADDING,
  PLOT_HEIGHT,
  resolveColors,
  seriesBarColor,
  seriesColor,
  ZIGZAG_HEIGHT,
} from "./scale-and-colors";
import type { WaterfallModel } from "./types";

/** «transparent» / «none» из окна оформления — фон диаграммы не залит. */
function isTransparentChartBackground(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized === "transparent" || normalized === "none";
}

export function renderWaterfall(model: WaterfallModel, options: ExtRenderOptions): string {
  const chartBackground = model.background ?? options.background;
  const themeDark = Boolean(options.dark) || usesInvertedMono(model.mono, model.monoInvert, false);
  const palette = resolvePalette(
    themeDark,
    chartBackground,
    model.textColor ?? options.textColor,
  );
  // Вырезы под числа и подпись разрыва повторяют фон диаграммы.
  // Прозрачный фон — прозрачная плашка, иначе на шахматке остаётся цвет темы.
  const breakTextFill = isTransparentChartBackground(chartBackground) ? "transparent" : palette.bg;
  const { axis, series, labels, title } = model;
  const breaks = model.breaks ?? [];
  const lines = model.lines ?? [];
  const valueLabels = model.valueLabels ?? { above: true, inside: false };
  const axisHidden = Boolean(axis.hidden);
  const colors = resolveColors(model, themeDark);

  const groups = Math.max(1, series.length);
  const columns = Math.max(1, labels.length);

  // --- Размеры, зависящие от шрифта ----------------------------------------
  // fontsize масштабирует все тексты; ширина колонок, высота графика и отступы
  // растут вместе с ним — иначе при крупном шрифте подписи налезают друг на друга.
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const scale = fontSize / FONT_BASE;
  const labelFontSize = fontSize;
  const valueFontSize = Math.round(fontSize * 0.91);
  const breakFontSize = Math.round(fontSize * 0.91);
  const titleFontSize = clamp(Math.round(fontSize * 1.36), 15, 26);
  // При базовом шрифте отступы остаются прежними (44 / 52 / 64) — эталоны
  // рендера не должны меняться от одной только правки масштабирования.
  const titleExtra = (labelLineCount(title) - 1) * labelLineStep(titleFontSize);
  let maxValueLines = 1;
  for (const group of series) {
    for (const step of group.steps) {
      maxValueLines = Math.max(
        maxValueLines,
        labelLineCount(step.valueText),
        labelLineCount(step.insideText),
        labelLineCount(step.aboveText),
      );
    }
  }
  const valueLabelExtra = (maxValueLines - 1) * labelLineStep(valueFontSize);
  const colLabelExtra = (Math.max(1, ...labels.map((label) => labelLineCount(label))) - 1) * labelLineStep(labelFontSize);
  const seriesExtra =
    (groups > 1
      ? Math.max(1, ...series.map((item) => labelLineCount(item.name))) - 1
      : 0) * labelLineStep(labelFontSize);

  const padTop = Math.round((PADDING.top * fontSize) / FONT_BASE) + titleExtra + valueLabelExtra;
  const padBottom = Math.round((PADDING.bottom * fontSize) / FONT_BASE) + colLabelExtra + seriesExtra;
  const padLeft = Math.round((PADDING.left * fontSize) / FONT_BASE);
  const plotHeight = Math.round(PLOT_HEIGHT * scale);

  const longestLabel = labels.reduce((acc, l) => Math.max(acc, measureLabelWidth(l, labelFontSize)), 0);
  // Запас по 2.5em с каждой стороны давал зазор между барами всего ~12 px:
  // соединительные линии были неразличимы. 3.2em оставляет читаемый просвет.
  const columnWidth = clamp(longestLabel + Math.round(fontSize * 3.2), 64, Math.round(150 * scale));
  const plotWidth = columnWidth * columns;

  const ticks =
    axis.gridStep !== undefined
      ? fixedTicks(axis.min, axis.max, axis.gridStep)
      : niceTicks(axis.min, axis.max, 5);

  // Левый отступ должен вмещать САМОЕ ДЛИННОЕ число шкалы: и обычные деления,
  // и границы разрыва стоят справа налево от линии графика. Иначе левый край
  // SVG обрезает цифры (300/800 уходили за viewBox).
  const tickTextWidth = ticks.reduce((acc, t) => Math.max(acc, measureText(fmt(t), labelFontSize)), 0);
  const edgeTextWidth = breaks.reduce(
    (acc, b) => Math.max(acc, measureText(fmt(b.after), labelFontSize), measureText(fmt(b.before), labelFontSize)),
    0,
  );
  const tickRoom = Math.round((10 * fontSize) / FONT_BASE) + Math.max(tickTextWidth, edgeTextWidth);
  const axisExtra =
    !axisHidden && axis.label ? (labelLineCount(axis.label) - 1) * labelLineStep(labelFontSize) : 0;
  const leftPad = (axisHidden ? 16 : Math.max(padLeft, tickRoom)) + axisExtra;
  // Подпись разрыва живёт справа от самого правого бара — под неё нужен запас
  // по ширине, иначе она обрезается краем SVG.
  const breakLabels = breaks.filter((b) => Boolean(b.label));
  // Подписи горизонтальных линий живут в том же правом поле, что и подпись
  // разрыва, поэтому запас по ширине считаем по самой длинной из всех.
  const lineLabels = lines.filter((l) => Boolean(l.label));
  const rightLabelRoom = Math.max(
    breakLabels.length
      ? Math.max(
          ...breakLabels.map(
            (b) => measureLabelWidth(b.label ?? "", Math.round(fontSize * 0.91)) + Math.round(fontSize * 1.2),
          ),
        )
      : 0,
    lineLabels.length
      ? Math.max(
          ...lineLabels.map(
            (l) =>
              measureLabelWidth(`${fmt(l.value)} ${l.label ?? ""}`.trim(), Math.round(fontSize * 0.91)) +
              Math.round(fontSize * 1.2),
          ),
        )
      : 0,
  );
  const breakLabelRoom = rightLabelRoom;  // Раскладка бара — ДО расчёта ширины SVG: подпись разрыва должна знать,
  // где кончается последний бар, чтобы встать в свободном поле справа от него.
  const barWidth = clamp((columnWidth * (1 - BAR_GAP)) / groups, MIN_BAR_WIDTH, MAX_BAR_WIDTH);
  const groupSpan = barWidth * groups + (groups - 1) * 4;
  const rightBarEdge = leftPad + (columns - 1) * columnWidth + (columnWidth + groupSpan) / 2;
  // Свободное поле справа от последнего бара: PADDING.right + запас на зазор.
  const breakLabelGap = Math.round((6 * fontSize) / FONT_BASE);
  const rightRoomForBreak = Math.max(
    PADDING.right,
    breakLabelRoom ? breakLabelRoom + breakLabelGap + PADDING.right : PADDING.right,
  );
  const width = leftPad + plotWidth + rightRoomForBreak;
  const height = padTop + plotHeight + padBottom;

  const svg = createSvg({ width, height, palette, title, debugFrames: options.debugFrames });

  const plotLeft = leftPad;
  const plotTop = padTop;
  const plotBottom = plotTop + plotHeight;

  const { yOf, yClamped, inGap } = createScale(axis, breaks, plotTop, plotBottom);

  if (title) {
    const titleLines = hasLabelBreak(title) ? splitLabelLines(title) : [title];
    const titleY = Math.round((24 * fontSize) / FONT_BASE);
    const titleStep = labelLineStep(titleFontSize);
    titleLines.forEach((line, idx) => {
      svg.text(width / 2, titleY + idx * titleStep, line, {
        "font-size": titleFontSize,
        "font-weight": 600,
        fill: palette.fg,
      });
    });
  }

  // Деления на границах разрыва схлопываются в одну линию (300 и 800 лежат
  // на той же высоте) — рисуем только первое из них.
  const drawnTickYs = new Set<number>();
  if (!axisHidden) {
    for (const tick of ticks) {
      if (breaks.some((b) => tick > b.after && tick < b.before)) continue;
      const y = yOf(tick);
      const yKey = Math.round(y * 100) / 100;
      if (drawnTickYs.has(yKey)) continue;
      drawnTickYs.add(yKey);
      svg.line(plotLeft, y, plotLeft + plotWidth, y, { stroke: palette.grid, "stroke-width": 1 });
      svg.text(plotLeft - Math.round((8 * fontSize) / FONT_BASE), y + Math.round((4 * fontSize) / FONT_BASE), fmt(tick), {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fgDim,
      });
    }

    // Границы разрыва подписываем всегда, но только когда шкала показана:
    // минимум вырезанного участка — НИЖЕ линии разрыва, максимум — ВЫШЕ.
    // Числа стоят целиком по свою сторону линии, поэтому линия их не
    // перечёркивает. Границы разрыва заменяют собой деления сетки, попавшие
    // на стык (300 и 800 лежат на одной высоте), поэтому подписи идут тем же
    // кеглем и с тем же отступом от линии графика, что и обычные деления —
    // иначе они «плавают» относительно шкалы.
    // Отступ от линии графика тот же, что у обычных делений, иначе границы
    // разрыва стоят не в колонке чисел.
    const edgeLabelX = plotLeft - Math.round((8 * fontSize) / FONT_BASE);
    const edgeGap = Math.round((3 * fontSize) / FONT_BASE);
    const edgeTextW = edgeTextWidth;
    for (const b of breaks) {
      const y = yOf(b.after);
      // Базлайны: низ верхнего числа ровно на зазоре над линией, верх нижнего —
      // на зазоре под линией.
      const lowerBaseline = y + edgeGap + labelFontSize;
      const upperBaseline = y - edgeGap;
      // Вырез под оба числа: от верха верхнего до низа нижнего (+ запас на
      // выносные элементы). Иначе цифры лежат на линии разрыва.
      const boxTop = upperBaseline - labelFontSize;
      const boxBottom = lowerBaseline + Math.round(labelFontSize * 0.25);
      svg.rect(edgeLabelX - edgeTextW - 3, boxTop - 1, edgeTextW + 7, boxBottom - boxTop + 2, {
        fill: breakTextFill,
        "data-break-text-bg": "1",
      });
      // Нижнее число — минимум вырезанного участка: базлайн ниже линии.
      svg.text(edgeLabelX, lowerBaseline, fmt(b.after), {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fgDim,
        "data-break-edge": "after",
      });
      // Верхнее число — максимум вырезанного участка: базлайн выше линии.
      svg.text(edgeLabelX, upperBaseline, fmt(b.before), {
        "text-anchor": "end",
        "font-size": labelFontSize,
        fill: palette.fgDim,
        "data-break-edge": "before",
      });
    }

    if (axis.label) {
      const cx = Math.round((16 * fontSize) / FONT_BASE) + axisExtra;
      const cy = plotTop + plotHeight / 2;
      const axisLines = hasLabelBreak(axis.label) ? splitLabelLines(axis.label) : [axis.label];
      const axisStep = labelLineStep(labelFontSize);
      // Поворот −90°: локальный сдвиг вверх становится сдвигом влево,
      // и следующая строка уходит от графика, а не в столбики.
      axisLines.forEach((line, idx) => {
        svg.text(cx, cy - idx * axisStep, line, {
          "text-anchor": "middle",
          "font-size": labelFontSize,
          fill: palette.fgDim,
          transform: `rotate(-90 ${cx} ${cy})`,
        });
      });
    }

    svg.line(plotLeft, plotBottom, plotLeft + plotWidth, plotBottom, {
      stroke: palette.axis,
      "stroke-width": 1,
    });
  } else {
    // Ось скрыта — оставляем только линию нуля, если ноль в шкале.
    if (axis.min < 0 && axis.max > 0) {
      const zeroY = yOf(0);
      svg.line(plotLeft, zeroY, plotLeft + plotWidth, zeroY, {
        stroke: palette.axis,
        "stroke-width": 1,
        "stroke-dasharray": "4 3",
      });
    }
  }

  // Линии разрыва: две параллельные черты поперёк области графика.
  // Разрыв места не занимает, поэтому черты лежат на стыке видимых участков.
  // Подпись разрыва — справа от самого правого бара (в свободном поле между
  // баром и правым краем SVG), на высоте линии.
  const lastBarRight = rightBarEdge;
  for (const b of breaks) {
    const y = yOf(b.after);
    const gap = 3;
    for (const dy of [-gap / 2, gap / 2]) {
      svg.line(plotLeft, y + dy, plotLeft + plotWidth, y + dy, {
        stroke: palette.axis,
        "stroke-width": 1,
        "stroke-dasharray": "6 4",
      });
    }
    if (b.label) {
      const breakFs = breakFontSize;
      // Текст прижат к правому краю SVG (а не к бару): слева от него остаётся
      // зазор от последнего бара, справа — PADDING.right. Длинный текст
      // обрезается по фактически свободному месту.
      const rightEdge = width - PADDING.right;
      const freeWidth = Math.max(24, rightEdge - lastBarRight - Math.round((6 * fontSize) / FONT_BASE));
      const text = truncateLabel(b.label, freeWidth, breakFs);
      const textWidth = measureLabelWidth(text, breakFs);
      const textX = Math.max(lastBarRight + Math.round((6 * fontSize) / FONT_BASE), rightEdge - textWidth);
      const breakLines = labelLineCount(text);
      const breakStep = labelLineStep(breakFs);
      const breakBlock = (breakLines - 1) * breakStep;
      // Вырез под подпись: иначе текст лежит на линии разрыва и не читается.
      svg.rect(
        textX - 2,
        y - breakFs * 0.75 - breakBlock / 2,
        textWidth + 4,
        breakFs * 1.5 + breakBlock,
        {
          fill: breakTextFill,
          "data-break-text-bg": "1",
        },
      );
      drawLabelLines(svg, textX, y + Math.round((4 * fontSize) / FONT_BASE), text, breakFs, {
        "text-anchor": "start",
        "font-size": breakFs,
        fill: palette.fgDim,
        "data-break-label": "1",
      }, "center");
    }
  }

  /** Накопленный уровень после колонки `col` (включительно). */
  const levelAfter = (g: number, col: number): number => {
    const group = series[g];
    if (!group) return 0;
    let running = 0;
    for (let k = 0; k <= col; k += 1) {
      const st = group.steps[k];
      if (!st) continue;
      running = st.kind === "absolute" ? (st.value ?? running) : running + (st.value ?? 0);
    }
    return running;
  };

  /** Уровень, с которого начинается бар колонки `col` (до её значения). */
  const levelBefore = (g: number, col: number): number => (col === 0 ? 0 : levelAfter(g, col - 1));

  /**
   * Уровень, от которого соединитель уходит к следующей колонке.
   *
   * Правило (как в Excel / Plotly): линия всегда идёт по уровню накопленного
   * итога, то есть по «стартовому» краю СЛЕДУЮЩЕГО бара:
   *   • рост (+):    бар растёт ВВЕРХ от итога → линия идёт по НИЗУ (низ бара);
   *   • падение (−): бар идёт ВНИЗ от итога → линия идёт по ВЕРХУ (верх бара);
   *   • абсолютная:  бар стоит от нуля → линия идёт по значению (верх бара).
   * Для текущей колонки это тот же уровень, что и накопленный итог ПОСЛЕ неё
   * (`levelAfter`), т.к. итог — это край бара, от которого растёт следующий.
   */
  const connectorFromLevel = (g: number, col: number): number => levelAfter(g, col);

  /**
   * Уровень, в который соединитель приходит на колонке `col` — «стартовый»
   * край бара (тот, от которого он растёт/падает):
   *   • рост (+):    приходит в НИЗ бара (bottom);
   *   • падение (−): приходит в ВЕРХ бара (top);
   *   • абсолютная:  приходит на уровень САМОГО значения (верх бара).
   * Для приращений это накопленный итог ПЕРЕД колонкой; для абсолютной
   * колонки — её собственное значение (иначе ступенька не рисуется и линия
   * ложно ложится на уровень предыдущего бара).
   */
  const connectorToLevel = (g: number, col: number): number => {
    const st = series[g]?.steps[col];
    if (st?.kind === "absolute" && st.value !== null) return st.value;
    return levelBefore(g, col);
  };

  // Соединители рисуются ДО баров, чтобы не перекрывать заливку.
  // x1 — правый край бара колонки `col`, x2 — левый край того же по счёту
  // бара следующей колонки (группа та же, поэтому смещения совпадают).
  if (model.connectors !== false) {
    for (let g = 0; g < groups; g += 1) {
      for (let col = 0; col < columns - 1; col += 1) {
        const group = series[g];
        if (!group?.steps[col] || !group.steps[col + 1]) continue;
        const from = connectorFromLevel(g, col);
        const to = connectorToLevel(g, col + 1);
        const x1 =
          plotLeft + col * columnWidth + (columnWidth - groupSpan) / 2 + g * (barWidth + 4) + barWidth;
        const x2 = x1 + columnWidth - barWidth;
        // Зазор между барами почти съедался: линия была длиной ~12 px и терялась
        // на фоне сетки. Делаем её контрастнее и толще — как в Excel/McKinsey.
        const stroke = themeDark ? palette.fgDim : palette.axis;
        const dash = "4 3";
        const y1 = yClamped(from);
        const y2 = yClamped(to);
        if (Math.abs(y2 - y1) < 0.5) {
          // Один уровень — горизонтальный пунктир от бара к бару.
          svg.line(x1, y1, x2, y2, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
        } else {
          // Разные уровни — ступенька: до середины зазора, вертикально, дальше.
          const midX = (x1 + x2) / 2;
          svg.line(x1, y1, midX, y1, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
          svg.line(midX, y1, midX, y2, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
          svg.line(midX, y2, x2, y2, {
            stroke,
            "stroke-width": 1.25,
            "stroke-dasharray": dash,
            "data-connector": "1",
          });
        }
      }
    }
  }

  /**
   * Бар, пересекающий разрыв шкалы, рисуется полосами: участок, попавший в
   * вырезанный диапазон (after, before), не закрашивается, а на линиях
   * разрыва рисуется «зигзаг» — общепринятый знак обрыва.
   */
  const drawBar = (x: number, from: number, to: number, color: string, barId: string) => {
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const cuts = breaks
      .filter((b) => b.after < hi && b.before > lo)
      .sort((a, b) => a.after - b.after);

    // Непрерывные куски [lo..hi] минус вырезанные участки.
    const segments: Array<[number, number]> = [];
    let cursor = lo;
    for (const b of cuts) {
      const segEnd = Math.min(hi, b.after);
      if (segEnd > cursor) segments.push([cursor, segEnd]);
      cursor = Math.max(cursor, Math.min(hi, b.before));
    }
    if (cursor < hi) segments.push([cursor, hi]);
    if (!segments.length) segments.push([lo, hi]);

    for (const [sLo, sHi] of segments) {
      const top = yOf(sHi);
      const bottom = yOf(sLo);
      const h = Math.max(1.5, bottom - top);
      svg.rect(x, top, barWidth, h, { fill: color, rx: 2, "data-bar": barId });
    }

    // Зигзаг на каждой линии разрыва, которую бар пересёк. Разрыв места не
    // занимает, поэтому полоса-вырез рисуется ПОВЕРХ бара: без неё куски бара
    // сливаются и обрыв не читается.
    for (const b of cuts) {
      const y = yOf(b.after);
      const mid = x + barWidth / 2;
      svg.rect(x, y - ZIGZAG_HEIGHT / 2, barWidth, ZIGZAG_HEIGHT, {
        fill: palette.bg,
        "data-break-gap": "1",
      });
      const zig = `M${x} ${y - 2} L${mid} ${y + 2} L${x + barWidth} ${y - 2}`;
      svg.path(zig, {
        fill: "none",
        stroke: color,
        "stroke-width": 1.2,
        "data-break-zigzag": "1",
      });
    }
  };

  for (let col = 0; col < columns; col += 1) {
    const columnLeft = plotLeft + col * columnWidth;
    const startX = columnLeft + (columnWidth - groupSpan) / 2;

    for (let g = 0; g < groups; g += 1) {
      const group = series[g];
      const step = group.steps[col];
      if (!step) continue;

      let running = 0;
      for (let k = 0; k < col; k += 1) {
        const prev = group.steps[k];
        if (!prev) continue;
        running = prev.kind === "absolute" ? (prev.value ?? running) : running + (prev.value ?? 0);
      }

      // null здесь уже раскрыт парсером; страховка для рендера «сырой» модели.
      const stepValue = step.value ?? running;

      let from: number;
      let to: number;
      let color: string;
      // В мульти-серии у каждой группы свой базовый цвет, а внутри группы
      // тип шага различается светлотой (итог / рост / падение) — так все бары
      // различимы. В одиночной серии цвет задаёт ТИП шага (total/increase/decrease).
      const ownSeries = groups > 1 ? seriesColor(model, g, colors, themeDark) : undefined;
      if (step.kind === "absolute") {
        // Абсолютная колонка рисуется от нуля; если ноль вне шкалы — от её края.
        const zero = clamp(0, axis.min, axis.max);
        from = Math.min(zero, stepValue);
        to = Math.max(zero, stepValue);
        color = ownSeries ? seriesBarColor(ownSeries, "total") : colors.total;
      } else {
        from = running;
        to = running + stepValue;
        const kind = stepValue >= 0 ? "increase" : "decrease";
        color = ownSeries
          ? seriesBarColor(ownSeries, kind)
          : kind === "increase"
            ? colors.increase
            : colors.decrease;
      }

      const x = startX + g * (barWidth + 4);
      // Бар, проходящий через разрыв шкалы, рисуется кусками с зигзагом.
      drawBar(x, from, to, color, `${g}-${col}`);

      // Геометрия для подписи: видимая (не вырезанная) часть бара.
      const visLo = inGap(from) ? (from < to ? breaks.find((b) => from > b.after && from < b.before)!.before : from) : from;
      const visHi = inGap(to) ? (to > from ? breaks.find((b) => to > b.after && to < b.before)!.after : to) : to;
      const top = yOf(Math.max(visLo, visHi));
      const bottom = yOf(Math.min(visLo, visHi));
      const barHeight = Math.max(1.5, bottom - top);

      const formatted =
        step.kind === "absolute" ? fmt(stepValue) : `${stepValue > 0 ? "+" : ""}${fmt(stepValue)}`;
      // У inside и above свои тексты. `label=` — запасной, если у позиции
      // своего нет. Поэтому на одном баре можно показать разные подписи.
      const insideText = step.insideText ?? step.valueText ?? formatted;
      const aboveText = step.aboveText ?? step.valueText ?? formatted;

      // Флаги строки задают позиции целиком и не наследуют вторую
      // из общего режима. Только `inside` — над баром ничего не дублируем.
      const explicitPlacement = step.labelInside !== undefined || step.labelAbove !== undefined;
      const wantInside = explicitPlacement ? step.labelInside === true : valueLabels.inside;
      const wantAbove = explicitPlacement ? step.labelAbove === true : valueLabels.above;

      const fittedInside = truncateLabel(insideText, barWidth - 4, valueFontSize);
      const insideLines = hasLabelBreak(fittedInside) ? splitLabelLines(fittedInside) : [fittedInside];
      const insideNeeds =
        insideLines.length > 1
          ? insideLines.length * labelLineStep(valueFontSize) + 2
          : valueFontSize + 2;
      const fitsInside =
        barHeight >= Math.max(INSIDE_MIN_HEIGHT, insideNeeds) &&
        insideLines.every((line) => measureText(line, valueFontSize) <= barWidth - 4);

      // Подпись ВНУТРИ бара. При включённом `above` она не «съедает» надпись
      // над баром: обе рисуются независимо (это и есть режим `labels both`).
      const drewInside = wantInside && fitsInside;
      if (drewInside) {
        drawLabelLines(
          svg,
          x + barWidth / 2,
          top + barHeight / 2 + valueFontSize * 0.35,
          fittedInside,
          valueFontSize,
          {
            "font-size": valueFontSize,
            fill: INSIDE_TEXT,
            "font-weight": 600,
          },
          "center",
        );
      }

      // Подпись НАД баром — только если её просили. Если просили лишь inside
      // и текст не влез в бар, та же подпись переносится сюда одной копией.
      const liftInside = wantInside && !fitsInside && !wantAbove;
      const needAbove = wantAbove || liftInside;
      if (needAbove) {
        const drawnAbove = liftInside ? insideText : aboveText;
        const aboveY = top - Math.round((5 * fontSize) / FONT_BASE);
        // Сдвиг вверх, если подпись налезает на соседнюю колонку слева:
        // иначе «+80» наезжает на бар Q1, а «−40» — на «+80».
        const halfW = measureLabelWidth(drawnAbove, valueFontSize) / 2;
        const leftBound = col === 0 ? plotLeft : columnLeft;
        const shiftUp =
          halfW > barWidth / 2 + Math.round((6 * fontSize) / FONT_BASE) &&
          x + barWidth / 2 - halfW < leftBound
            ? Math.round(valueFontSize * 1.15)
            : 0;
        drawLabelLines(
          svg,
          x + barWidth / 2,
          aboveY - shiftUp,
          drawnAbove,
          valueFontSize,
          {
            "font-size": valueFontSize,
            fill: palette.fgDim,
            "data-value-label": "1",
          },
          "up",
        );
      }
    }

    const label = truncateLabel(labels[col] ?? "", columnWidth - 6, labelFontSize);
    drawLabelLines(
      svg,
      columnLeft + columnWidth / 2,
      plotBottom + Math.round((18 * fontSize) / FONT_BASE),
      label,
      labelFontSize,
      {
        "font-size": labelFontSize,
        fill: palette.fg,
      },
    );
  }

  // Легенда: при мульти-серии у каждой группы свой цвет — цвета всех групп
  // обязаны различаться, поэтому свой цвет серии уважается, а безымянные
  // группы получают цвета по кругу из общей палитры.
  if (groups > 1) {
    let legendX = plotLeft;
    const legendY = plotBottom + Math.round((40 * fontSize) / FONT_BASE) + colLabelExtra;
    for (let g = 0; g < groups; g += 1) {
      const name = series[g].name ?? `Группа ${g + 1}`;
      const swatch = Math.round(fontSize * 0.91);
      svg.rect(legendX, legendY - swatch + 2, swatch, swatch, {
        fill: seriesColor(model, g, colors, themeDark) ?? colors.total,
        rx: 2,
      });
      drawLabelLines(svg, legendX + swatch + 6, legendY, name, labelFontSize, {
        "text-anchor": "start",
        "font-size": labelFontSize,
        fill: palette.fgDim,
      });
      legendX += swatch + Math.round(fontSize * 1.1) + measureLabelWidth(name, labelFontSize) + Math.round(fontSize * 1.45);
    }
  }

  // Горизонтальные линии — ПОВЕРХ всей диаграммы (бары, соединители,
  // подписи значений, линии разрыва): это уровни, по которым сравнивают
  // столбцы. Рисуются последними, чтобы ничего их не перекрывало.
  // Линия, попавшая внутрь вырезанного разрыва, прижимается к его границе —
  // иначе она «не существует» на шкале и рисовалась бы не там.
  const lineFontSize = Math.round(fontSize * 0.91);
  const lineLabelX = leftPad + plotWidth + Math.round((6 * fontSize) / FONT_BASE);
  for (const item of lines) {
    if (item.value < axis.min || item.value > axis.max) continue;
    const y = yClamped(item.value);
    const stroke = item.color ?? defaultLineColor(palette, options.dark);
    const dash = LINE_DASH[item.style ?? "dash"];
    svg.line(plotLeft, y, plotLeft + plotWidth, y, {
      stroke,
      "stroke-width": item.width ?? 1.5,
      ...(dash ? { "stroke-dasharray": dash } : {}),
      "stroke-linecap": "butt",
      "data-threshold-line": "1",
    });

    if (item.label) {
      const text = hasLabelBreak(item.label)
        ? splitLabelLines(item.label)
            .map((line, idx) => (idx === 0 ? `${fmt(item.value)} ${line}` : line))
            .join("\n")
        : `${fmt(item.value)} ${item.label}`;
      const textWidth = measureLabelWidth(text, lineFontSize);
      const lineCount = labelLineCount(text);
      const lineStep = labelLineStep(lineFontSize);
      const lineBlock = (lineCount - 1) * lineStep;
      // Вырез под подпись — цветом плашки холста: иначе текст лежит на линии.
      svg.rect(
        lineLabelX - 2,
        y - lineFontSize * 0.8 - lineBlock / 2,
        textWidth + 4,
        lineFontSize * 1.6 + lineBlock,
        {
          fill: palette.bg,
          "data-line-gap": "1",
        },
      );
      drawLabelLines(svg, lineLabelX, y + Math.round((4 * fontSize) / FONT_BASE), text, lineFontSize, {
        "text-anchor": "start",
        "font-size": lineFontSize,
        fill: stroke,
        "data-threshold-label": "1",
      }, "center");
    }
  }


  return svg.toString();
}
