import type { AppLocale } from "@/constants/i18n";

export const HISTOGRAM_GALLERY_IDS = [
  "histogram",
  "histogramBins",
  "histogramCurves",
  "histogramLabels",
  "histogramClean",
  "histogramDensity",
  "histogramMono",
  "histogramRotate",
  "histogramLine",
] as const;

export type HistogramGalleryId = (typeof HISTOGRAM_GALLERY_IDS)[number];

const WITH_GAPS = "12, 18, , 22, na, 30, 25, 28, 35, 40, 16, 21, 27, 33, 19, 24, 38";
const PLAIN = "12, 18, 22, 25, 30, 28, 35, 40, 16, 21, 27, 33, 19, 24, 38, 14";
const EVENING = "8, 14, 18, 20, 26, 24, 31, 36, 12, 17, 23, 29, 15, 21, 34, 11";
const DIRTY = "12, 18, oops, 22, na, 30, 25, 28, 120, 16, 21, 27, 33, 19, 24, 38";

interface HistogramCopy {
  header: string;
  notes: Record<HistogramGalleryId, string>;
  titles: Record<HistogramGalleryId, string>;
  seriesA: string;
  seriesB: string;
  x: string;
  yCount: string;
  yDensity: string;
  plan: string;
  reference: string;
}

function quoteLabel(text: string): string {
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildSamples(copy: HistogramCopy): Record<HistogramGalleryId, string> {
  const seriesA = quoteLabel(copy.seriesA);
  const seriesB = quoteLabel(copy.seriesB);
  const open = (id: HistogramGalleryId): string =>
    `histogram\n${copy.header}\n%% ${copy.notes[id]}\n`;

  return {
    histogram: `${open("histogram")}title ${copy.titles.histogram}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins auto
scale count
gap 0
labels above fontcolor auto
missing drop
errors drop
outliers iqr 1.5 drop
ci 0.95
stats mean median sd var ci
grid
axis y on
colors s1=#0969da mean=#cf222e median=#8250df ci=#d0d7de
series ${seriesA} : ${WITH_GAPS}
fit normal`,
    histogramBins: `${open("histogramBins")}title ${copy.titles.histogramBins}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins 0 --> 10, 10 --> 25, 25 --> 50, 50 --> 80
scale count
labels above fontcolor auto
series ${seriesA} : ${PLAIN}`,
    histogramCurves: `${open("histogramCurves")}title ${copy.titles.histogramCurves}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins 8
labels above fontcolor auto
colors s1=#0969da s2=#2da44e
series ${seriesA} : ${PLAIN}
series ${seriesB} : ${EVENING}
fit normal ${seriesA}
fit weibull ${seriesB}
curve weibull shape=1.8 scale=30 ${quoteLabel(copy.reference)} color=#8250df`,
    histogramLabels: `${open("histogramLabels")}title ${copy.titles.histogramLabels}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins 6
gap 20%
labels inside fontcolor auto
fontsize 13
series ${seriesA} : ${PLAIN}`,
    histogramClean: `${open("histogramClean")}title ${copy.titles.histogramClean}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins auto
missing mean
errors drop
outliers iqr 1.5 winsor
stats mean median sd var
labels above fontcolor auto
series ${seriesA} : ${DIRTY}`,
    histogramDensity: `${open("histogramDensity")}title ${copy.titles.histogramDensity}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yDensity)}
bins 8
scale density
labels none
fit normal
series ${seriesA} : ${PLAIN}`,
    histogramMono: `${open("histogramMono")}title ${copy.titles.histogramMono}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins auto
mono
labels above fontcolor auto
stats mean median
series ${seriesA} : ${PLAIN}
fit normal`,
    histogramRotate: `${open("histogramRotate")}title ${copy.titles.histogramRotate}
rotate 90
ratio 16x9
fontsize 12
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins auto
gap 0
labels above fontcolor auto
stats mean median
series ${seriesA} : ${PLAIN}`,
    histogramLine: `${open("histogramLine")}title ${copy.titles.histogramLine}
x ${quoteLabel(copy.x)} 0 --> 80
y ${quoteLabel(copy.yCount)}
bins 8
grid 1
labels above fontcolor auto
stats mean median ci
line 5 ${quoteLabel(copy.plan)} color=#cf222e width=2 style=dash
series ${seriesA} : ${PLAIN}`,
  };
}

const RU_HEADER = `%% Бины: bins auto — Фридман–Диаконис, при нулевом IQR берётся Стерджес. bins 8 задаёт число равных интервалов, binwidth 10 — ширину. bins 0 --> 10, 10 --> 25 — явные стыкующиеся края. Граница принадлежит правому бину, последний интервал закрыт. bins и binwidth вместе — ошибка.
%% Масштаб: scale count — высота равна числу, кривая равна pdf(x) * n * ширина бина, в котором лежит x. scale density — доля count/(n*ширина), кривая равна pdf. Для неравных бинов честное сравнение — density.
%% Зазор: gap 0 — без просвета, gap 1 и gap 100% — как ширина бара, gap 2 и gap 200% — вдвое шире. Зазор и между бинами, и между сериями внутри бина.
%% Подписи: labels above|inside|none. Ноль не подписывается. labels fontcolor auto подбирает контраст к фону под текстом. labels fontcolor #1f2328 задаёт свой цвет.
%% Оси: axis y off прячет ось значений и её сетку, axis x off — подписи бинов. Следующий grid возвращает линии без подписей. grid off прячет только сетку, grid 2 задаёт шаг.
%% Поворот: rotate 90 (или orientation horizontal) кладёт бины сверху вниз. rotate 0 возвращает столбцы.
%% Цвета: colors s1=#hex mean=#hex median=#hex ci=#hex, либо color=#hex в строке series или curve. mono и mono invert — чёрно-белый режим, явный цвет важнее.
%% Шрифт и пропорции: fontsize 14, ratio 16x9.
%% Уровень: line 4 "план" color=#cf222e width=2 style=dash. Стили: solid, dash, dot, dashdot.
%% Пропуски: missing drop|mean|median|zero. Пусто, na, n/a, null, none, nan, -, —, . — пропуск.
%% Ошибки: errors drop отбрасывает нечисло, errors fail останавливает разбор.
%% Выбросы: outliers none|iqr 1.5|z 3|mad 3 и действие drop|winsor|mark.
%% Показатели: stats mean median sd var ci, также min max q1 q3 iqr skew kurtosis, stats all и stats off. ci 0.95 — доверительный интервал среднего Стьюдента. sd считается с делителем n−1, а sigma нормального подбора — MLE с делителем n.
%% Кривые: fit normal подбирает параметры последней серии или серии в кавычках. curve weibull shape=1.6 scale=28 "эталон" color=#8250df рисует заданные параметры и данные не использует. Семейства: normal, lognormal, exponential, uniform, gamma, weibull.`;

const EN_HEADER = `%% Bins: bins auto uses Freedman–Diaconis, and Sturges when the IQR is 0. bins 8 sets the number of equal intervals, binwidth 10 sets the width. bins 0 --> 10, 10 --> 25 sets abutting edges. A boundary belongs to the bin on the right, and the last interval is closed. bins together with binwidth is an error.
%% Scale: scale count draws the bar height as the count and the curve as pdf(x) * n * width of the bin that contains x. scale density draws count/(n*width) and the curve as the pdf. Density is the honest comparison for unequal bins.
%% Gap: gap 0 has no space, gap 1 and gap 100% match the bar width, gap 2 and gap 200% are twice as wide. The gap applies between bins and between series inside a bin.
%% Labels: labels above|inside|none. Zero is not labeled. labels fontcolor auto picks contrast for the surface under the text. labels fontcolor #1f2328 sets a color.
%% Axes: axis y off hides the value axis and its grid, axis x off hides bin labels. A later grid brings the lines back without labels. grid off hides only the grid, grid 2 sets the step.
%% Rotate: rotate 90 (or orientation horizontal) lays the bins from top to bottom. rotate 0 restores the columns.
%% Colors: colors s1=#hex mean=#hex median=#hex ci=#hex, or color=#hex on a series or curve line. mono and mono invert are black and white, and an explicit color wins.
%% Font and frame: fontsize 14, ratio 16x9.
%% Level: line 4 "plan" color=#cf222e width=2 style=dash. Styles: solid, dash, dot, dashdot.
%% Missing: missing drop|mean|median|zero. Empty, na, n/a, null, none, nan, -, —, . are missing.
%% Errors: errors drop discards a non-number, errors fail stops parsing.
%% Outliers: outliers none|iqr 1.5|z 3|mad 3 with an action drop|winsor|mark.
%% Stats: stats mean median sd var ci, also min max q1 q3 iqr skew kurtosis, stats all and stats off. ci 0.95 is the Student-t interval of the mean. sd uses the divisor n−1, while a fitted normal sigma is the MLE with divisor n.
%% Curves: fit normal fits the last series, or the quoted series name. curve weibull shape=1.6 scale=28 "reference" color=#8250df draws the given parameters and does not use the data. Families: normal, lognormal, exponential, uniform, gamma, weibull.`;

const COPIES: Record<AppLocale, HistogramCopy> = {
  ru: {
    header: RU_HEADER,
    seriesA: "Наблюдения",
    seriesB: "Вечер",
    x: "мс",
    yCount: "число",
    yDensity: "плотность",
    plan: "план",
    reference: "эталон",
    titles: {
      histogram: "Гистограмма задержки",
      histogramBins: "Гистограмма — явные интервалы",
      histogramCurves: "Гистограмма — кривые распределений",
      histogramLabels: "Гистограмма — подписи внутри",
      histogramClean: "Гистограмма — очистка данных",
      histogramDensity: "Гистограмма — плотность",
      histogramMono: "Гистограмма — монохром",
      histogramRotate: "Гистограмма — поворот 90°",
      histogramLine: "Гистограмма — линия уровня",
    },
    notes: {
      histogram:
        "Базовая гистограмма: автобины, шкала числа, среднее, медиана и доверительный интервал, подбор normal по наблюдениям. Пустая ячейка и na отбрасываются.",
      histogramBins:
        "Явные неравные интервалы. Края стыкуются, точка на границе попадает в правый бин, последний интервал включает правый край.",
      histogramCurves:
        "Две серии рядом в каждом бине. fit подбирает normal и weibull по имени серии, curve рисует вейбулла с заданными shape и scale.",
      histogramLabels:
        "Подписи чисел внутри бара, зазор 20% от ширины и свой fontsize. Ноль не подписывается.",
      histogramClean:
        "Предобработка: пропуск na заменяется средним, oops отбрасывается, выброс 120 поджимается к забору Тьюки.",
      histogramDensity:
        "Шкала плотности: высота бара count/(n*ширина), кривая совпадает с pdf. Для неравных бинов сравнивать кривую честно можно только так.",
      histogramMono:
        "Чёрно-белый режим mono. Явный color=#hex на серии или кривой перекрывает монохром. Снять режим: уберите строку mono.",
      histogramRotate:
        "Поворот на 90°: бины идут сверху вниз, столбцы растут вправо. ratio 16x9 задаёт пропорции холста. Вернуть столбцы: rotate 0.",
      histogramLine:
        "Горизонтальный уровень line без двоеточия: значение, подпись, цвет, толщина и стиль. Стили solid, dash, dot, dashdot.",
    },
  },
  en: {
    header: EN_HEADER,
    seriesA: "Observations",
    seriesB: "Evening",
    x: "ms",
    yCount: "count",
    yDensity: "density",
    plan: "plan",
    reference: "reference",
    titles: {
      histogram: "Latency histogram",
      histogramBins: "Histogram — explicit bins",
      histogramCurves: "Histogram — distribution curves",
      histogramLabels: "Histogram — inside labels",
      histogramClean: "Histogram — data cleaning",
      histogramDensity: "Histogram — density",
      histogramMono: "Histogram — mono",
      histogramRotate: "Histogram — rotated 90°",
      histogramLine: "Histogram — level line",
    },
    notes: {
      histogram:
        "Base histogram: automatic bins, a count scale, mean, median and confidence interval, and a normal fit of the observations. An empty cell and na are dropped.",
      histogramBins:
        "Explicit unequal intervals. The edges abut, a boundary point falls in the bin on the right, and the last interval includes its right edge.",
      histogramCurves:
        "Two series sit side by side in each bin. fit estimates normal and weibull for the named series, and curve draws a Weibull with the given shape and scale.",
      histogramLabels:
        "Value labels inside the bar, a gap of 20% of the bar width, and a custom fontsize. Zero is not labeled.",
      histogramClean:
        "Preprocessing: na is replaced by the mean, oops is dropped, and the outlier 120 is winsorized to the Tukey fence.",
      histogramDensity:
        "Density scale: bar height is count/(n*width) and the curve matches the pdf. This is the honest comparison when bins have unequal width.",
      histogramMono:
        "Black-and-white mono mode. An explicit color=#hex on a series or curve overrides mono. Remove the mono line to leave the mode.",
      histogramRotate:
        "A 90° turn: bins run from top to bottom and bars grow to the right. ratio 16x9 sets the canvas. Restore the columns with rotate 0.",
      histogramLine:
        "A horizontal level line has no colon: value, label, color, width and style. Styles are solid, dash, dot and dashdot.",
    },
  },
  es: {
    header: `%% Intervalos: bins auto usa Freedman–Diaconis, y Sturges si el IQR es 0. bins 8 fija el número, binwidth 10 la anchura. bins 0 --> 10, 10 --> 25 son bordes que se tocan. El borde pertenece al intervalo de la derecha y el último intervalo está cerrado. bins junto con binwidth es un error.
%% Escala: scale count dibuja la cuenta y la curva como pdf(x) * n * anchura del intervalo que contiene x. scale density dibuja count/(n*anchura) y la curva es la pdf. Con intervalos desiguales la comparación honesta es density.
%% Hueco: gap 0 no deja espacio, gap 1 y gap 100% igualan la anchura de la barra, gap 2 y gap 200% la duplican. El hueco vale entre intervalos y entre series dentro de un intervalo.
%% Etiquetas: labels above|inside|none. El cero no se etiqueta. labels fontcolor auto elige contraste, labels fontcolor #1f2328 fija un color.
%% Ejes: axis y off oculta el eje de valores y su rejilla, axis x off oculta las etiquetas de los intervalos. grid off oculta solo la rejilla, grid 2 fija el paso.
%% Giro: rotate 90 (u orientation horizontal) pone los intervalos de arriba abajo. rotate 0 devuelve las columnas.
%% Colores: colors s1=#hex mean=#hex median=#hex ci=#hex, o color=#hex en series o curve. mono y mono invert son blanco y negro; un color explícito gana.
%% Letra y marco: fontsize 14, ratio 16x9.
%% Nivel: line 4 "plan" color=#cf222e width=2 style=dash. Estilos: solid, dash, dot, dashdot.
%% Faltantes: missing drop|mean|median|zero. Vacío, na, n/a, null, none, nan, -, —, . son faltantes.
%% Errores: errors drop descarta un no número, errors fail detiene el análisis.
%% Atípicos: outliers none|iqr 1.5|z 3|mad 3 con la acción drop|winsor|mark.
%% Estadísticos: stats mean median sd var ci, también min max q1 q3 iqr skew kurtosis, stats all y stats off. ci 0.95 es el intervalo de Student de la media. sd usa el divisor n−1; la sigma normal ajustada es el MLE con divisor n.
%% Curvas: fit normal ajusta la última serie o el nombre entre comillas. curve weibull shape=1.6 scale=28 "referencia" color=#8250df dibuja los parámetros dados y no usa los datos. Familias: normal, lognormal, exponential, uniform, gamma, weibull.`,
    seriesA: "Observaciones",
    seriesB: "Tarde",
    x: "ms",
    yCount: "cuenta",
    yDensity: "densidad",
    plan: "plan",
    reference: "referencia",
    titles: {
      histogram: "Histograma de latencia",
      histogramBins: "Histograma — intervalos explícitos",
      histogramCurves: "Histograma — curvas de distribución",
      histogramLabels: "Histograma — etiquetas interiores",
      histogramClean: "Histograma — limpieza de datos",
      histogramDensity: "Histograma — densidad",
      histogramMono: "Histograma — monocromo",
      histogramRotate: "Histograma — giro de 90°",
      histogramLine: "Histograma — línea de nivel",
    },
    notes: {
      histogram: "Histograma base: bins automáticos, escala de cuenta, media, mediana e intervalo, y un ajuste normal.",
      histogramBins: "Intervalos desiguales que se tocan. El borde pertenece al bin de la derecha.",
      histogramCurves: "Dos series lado a lado. fit estima normal y weibull; curve dibuja un Weibull con parámetros dados.",
      histogramLabels: "Etiquetas dentro de la barra, hueco del 20% y fontsize propio.",
      histogramClean: "na se sustituye por la media, oops se descarta y 120 se recorta al cercado de Tukey.",
      histogramDensity: "Escala de densidad: la barra es count/(n*ancho) y la curva es la pdf.",
      histogramMono: "Modo blanco y negro. Un color=#hex explícito gana sobre mono.",
      histogramRotate: "Giro de 90°: los bins bajan y las barras crecen a la derecha. ratio 16x9 fija el lienzo.",
      histogramLine: "Línea horizontal sin dos puntos: valor, etiqueta, color, grosor y estilo.",
    },
  },
  zh: {
    header: `%% 分箱：bins auto 用 Freedman–Diaconis，IQR 为 0 时用 Sturges。bins 8 指定个数，binwidth 10 指定宽度。bins 0 --> 10, 10 --> 25 是相接的边界。边界属于右侧分箱，最后一个区间闭合。bins 与 binwidth 不能同时使用。
%% 刻度：scale count 的柱高等于次数，曲线为 pdf(x) * n * 该点所在分箱的宽度。scale density 的柱高为 count/(n*宽度)，曲线等于 pdf。不等宽分箱应使用 density。
%% 间隙：gap 0 没有空隙，gap 1 与 gap 100% 等于柱宽，gap 2 与 gap 200% 是两倍。间隙同时作用于分箱之间和分箱内的序列之间。
%% 标签：labels above|inside|none。零不标注。labels fontcolor auto 按背景取对比色，labels fontcolor #1f2328 指定颜色。
%% 坐标轴：axis y off 隐藏数值轴及其网格，axis x off 隐藏分箱标签。grid off 只隐藏网格，grid 2 指定步长。
%% 旋转：rotate 90（或 orientation horizontal）让分箱自上而下。rotate 0 恢复竖柱。
%% 颜色：colors s1=#hex mean=#hex median=#hex ci=#hex，或在 series、curve 行写 color=#hex。mono 与 mono invert 为黑白，显式颜色优先。
%% 字体与比例：fontsize 14，ratio 16x9。
%% 水平线：line 4 "计划" color=#cf222e width=2 style=dash。样式：solid、dash、dot、dashdot。
%% 缺失：missing drop|mean|median|zero。空白、na、n/a、null、none、nan、-、—、. 都是缺失。
%% 错误：errors drop 丢弃非数字，errors fail 中止解析。
%% 离群：outliers none|iqr 1.5|z 3|mad 3，动作为 drop|winsor|mark。
%% 统计：stats mean median sd var ci，还有 min max q1 q3 iqr skew kurtosis、stats all 与 stats off。ci 0.95 是均值的学生氏区间。sd 的除数是 n−1，正态拟合的 sigma 是除数为 n 的 MLE。
%% 曲线：fit normal 拟合最后一条序列或引号中的名称。curve weibull shape=1.6 scale=28 "参照" color=#8250df 按给定参数绘制，不使用数据。分布：normal、lognormal、exponential、uniform、gamma、weibull。`,
    seriesA: "观测",
    seriesB: "晚间",
    x: "毫秒",
    yCount: "次数",
    yDensity: "密度",
    plan: "计划",
    reference: "参照",
    titles: {
      histogram: "延迟直方图",
      histogramBins: "直方图 — 手动区间",
      histogramCurves: "直方图 — 分布曲线",
      histogramLabels: "直方图 — 柱内标签",
      histogramClean: "直方图 — 数据清洗",
      histogramDensity: "直方图 — 密度",
      histogramMono: "直方图 — 单色",
      histogramRotate: "直方图 — 旋转 90°",
      histogramLine: "直方图 — 水平线",
    },
    notes: {
      histogram: "基础直方图：自动分箱、计数刻度、均值、中位数和置信区间，并按观测拟合正态。空单元格和 na 会被丢弃。",
      histogramBins: "不相等但彼此相接的区间。边界属于右侧分箱，最后一个区间包含右端点。",
      histogramCurves: "每个分箱里两列并排。fit 按名称拟合 normal 与 weibull，curve 用给定 shape 和 scale 画威布尔曲线。",
      histogramLabels: "数字写在柱内，间隙为柱宽的 20%，并单独设置 fontsize。零不标注。",
      histogramClean: "na 用均值填补，oops 丢弃，离群值 120 缩到 Tukey 围栏。",
      histogramDensity: "密度刻度：柱高为 count/(n*宽度)，曲线等于 pdf。不等宽分箱应使用这种比较。",
      histogramMono: "黑白 mono。系列或曲线上的 color=#hex 优先于单色。",
      histogramRotate: "旋转 90°：分箱自上而下，柱向右生长。ratio 16x9 设定画布比例。",
      histogramLine: "水平线没有冒号：数值、标签、颜色、线宽和样式。",
    },
  },
  ja: {
    header: `%% ビン: bins auto は Freedman–Diaconis、IQR が 0 なら Sturges。bins 8 は個数、binwidth 10 は幅。bins 0 --> 10, 10 --> 25 は接した端。境界は右のビン、最後の区間は右端を含む。bins と binwidth の併用はエラー。
%% スケール: scale count は件数、曲線は pdf(x) * n * その点が入るビンの幅。scale density は count/(n*幅)、曲線は pdf。幅の違うビンの比較は density。
%% 隙間: gap 0 はなし、gap 1 と gap 100% はバー幅、gap 2 と gap 200% はその2倍。ビンの間と、ビン内の系列の間に効く。
%% ラベル: labels above|inside|none。ゼロは書かない。labels fontcolor auto は下地に対するコントラスト、labels fontcolor #1f2328 は指定色。
%% 軸: axis y off は値軸とグリッドを隠し、axis x off はビン名を隠す。grid off はグリッドだけ、grid 2 は刻み。
%% 回転: rotate 90（または orientation horizontal）はビンを上から下へ。rotate 0 で縦棒に戻る。
%% 色: colors s1=#hex mean=#hex median=#hex ci=#hex、または series と curve の color=#hex。mono と mono invert は白黒で、明示色が優先。
%% 文字と比率: fontsize 14、ratio 16x9。
%% 水準: line 4 "計画" color=#cf222e width=2 style=dash。スタイルは solid、dash、dot、dashdot。
%% 欠損: missing drop|mean|median|zero。空欄、na、n/a、null、none、nan、-、—、. が欠損。
%% 誤り: errors drop は非数を捨て、errors fail は解析を止める。
%% 外れ値: outliers none|iqr 1.5|z 3|mad 3 と動作 drop|winsor|mark。
%% 統計: stats mean median sd var ci、ほか min max q1 q3 iqr skew kurtosis、stats all と stats off。ci 0.95 は平均のスチューデント区間。sd の除数は n−1、正規フィットの sigma は除数 n の MLE。
%% 曲線: fit normal は最後の系列か引用符の名前を推定。curve weibull shape=1.6 scale=28 "基準" color=#8250df は指定パラメータで、データは使わない。族: normal、lognormal、exponential、uniform、gamma、weibull。`,
    seriesA: "観測",
    seriesB: "夜間",
    x: "ミリ秒",
    yCount: "件数",
    yDensity: "密度",
    plan: "計画",
    reference: "基準",
    titles: {
      histogram: "遅延のヒストグラム",
      histogramBins: "ヒストグラム — 明示区間",
      histogramCurves: "ヒストグラム — 分布曲線",
      histogramLabels: "ヒストグラム — 内側ラベル",
      histogramClean: "ヒストグラム — データ洗浄",
      histogramDensity: "ヒストグラム — 密度",
      histogramMono: "ヒストグラム — モノクロ",
      histogramRotate: "ヒストグラム — 90度回転",
      histogramLine: "ヒストグラム — 水準線",
    },
    notes: {
      histogram: "基本形: 自動ビン、件数スケール、平均、中央値、信頼区間、観測からの正規フィット。空欄と na は捨てます。",
      histogramBins: "接した不等区間です。境界は右のビンに入り、最後の区間は右端を含みます。",
      histogramCurves: "各ビンに2系列を並べます。fit は名前付き系列の normal と weibull、curve は指定パラメータのワイブルです。",
      histogramLabels: "数値をバーの内側へ。隙間は幅の20%、fontsize も指定します。ゼロは書きません。",
      histogramClean: "na は平均で埋め、oops は捨て、外れ値 120 は Tukey の柵まで縮めます。",
      histogramDensity: "密度スケール: 高さは count/(n*幅)、曲線は pdf です。幅の違うビンの比較はこちらです。",
      histogramMono: "白黒の mono。系列や曲線の color=#hex が優先されます。",
      histogramRotate: "90度回転: ビンは上から下、バーは右へ伸びます。ratio 16x9 がキャンバス比です。",
      histogramLine: "水平線にコロンはありません。値、ラベル、色、太さ、スタイルを書きます。",
    },
  },
  hi: {
    header: `%% बिन: bins auto Freedman–Diaconis है, IQR 0 हो तो Sturges। bins 8 संख्या है, binwidth 10 चौड़ाई। bins 0 --> 10, 10 --> 25 जुड़ते किनारे हैं। सीमा दाएँ बिन की है, अंतिम अंतराल बंद है। bins और binwidth साथ त्रुटि है।
%% पैमाना: scale count गिनती है और वक्र pdf(x) * n * उस बिन की चौड़ाई है जिसमें x है। scale density count/(n*चौड़ाई) है और वक्र pdf है। असमान बिन के लिए ईमानदार तुलना density है।
%% अंतराल: gap 0 में जगह नहीं, gap 1 और gap 100% बार की चौड़ाई के बराबर, gap 2 और gap 200% दोगुना। अंतराल बिनों के बीच और बिन के अंदर शृंखलाओं के बीच लगता है।
%% लेबल: labels above|inside|none। शून्य नहीं लिखा जाता। labels fontcolor auto कंट्रास्ट चुनता है, labels fontcolor #1f2328 रंग तय करता है।
%% अक्ष: axis y off मान अक्ष और उसकी ग्रिड छिपाता है, axis x off बिन लेबल छिपाता है। grid off केवल ग्रिड छिपाता है, grid 2 कदम तय करता है।
%% घुमाव: rotate 90 (या orientation horizontal) बिन ऊपर से नीचे रखता है। rotate 0 स्तंभ लौटाता है।
%% रंग: colors s1=#hex mean=#hex median=#hex ci=#hex, या series/curve पर color=#hex। mono और mono invert काले-सफ़ेद हैं; स्पष्ट रंग जीतता है।
%% फ़ॉन्ट और फ्रेम: fontsize 14, ratio 16x9।
%% स्तर: line 4 "योजना" color=#cf222e width=2 style=dash। शैलियाँ: solid, dash, dot, dashdot।
%% कमी: missing drop|mean|median|zero। खाली, na, n/a, null, none, nan, -, —, . कमी हैं।
%% त्रुटि: errors drop गैर-संख्या हटाता है, errors fail पार्स रोकता है।
%% बाहरी मान: outliers none|iqr 1.5|z 3|mad 3 और क्रिया drop|winsor|mark।
%% आँकड़े: stats mean median sd var ci, साथ min max q1 q3 iqr skew kurtosis, stats all और stats off। ci 0.95 माध्य का स्टूडेंट अंतराल है। sd का भाजक n−1 है; फिट normal की sigma MLE है, भाजक n।
%% वक्र: fit normal अंतिम शृंखला या उद्धृत नाम फिट करता है। curve weibull shape=1.6 scale=28 "संदर्भ" color=#8250df दिए पैरामीटर खींचता है और डेटा का उपयोग नहीं करता। परिवार: normal, lognormal, exponential, uniform, gamma, weibull.`,
    seriesA: "अवलोकन",
    seriesB: "शाम",
    x: "मि.से.",
    yCount: "संख्या",
    yDensity: "घनत्व",
    plan: "योजना",
    reference: "संदर्भ",
    titles: {
      histogram: "विलंब का हिस्टोग्राम",
      histogramBins: "हिस्टोग्राम — स्पष्ट अंतराल",
      histogramCurves: "हिस्टोग्राम — वितरण वक्र",
      histogramLabels: "हिस्टोग्राम — भीतरी लेबल",
      histogramClean: "हिस्टोग्राम — डेटा सफाई",
      histogramDensity: "हिस्टोग्राम — घनत्व",
      histogramMono: "हिस्टोग्राम — मोनो",
      histogramRotate: "हिस्टोग्राम — 90° घुमाव",
      histogramLine: "हिस्टोग्राम — स्तर रेखा",
    },
    notes: {
      histogram: "आधार हिस्टोग्राम: स्वतः बिन, गिनती का पैमाना, माध्य, माध्यिका और विश्वास अंतराल, तथा सामान्य फिट।",
      histogramBins: "असमान जुड़ते अंतराल। सीमा दाएँ बिन की होती है और अंतिम अंतराल दायाँ किनारा समेटता है।",
      histogramCurves: "हर बिन में दो शृंखलाएँ। fit नाम से normal और weibull चुनता है, curve दिए पैरामीटर का वेइबुल खींचता है।",
      histogramLabels: "संख्या बार के भीतर, अंतराल चौड़ाई का 20%, और अपना fontsize। शून्य नहीं लिखा जाता।",
      histogramClean: "na माध्य से भरा जाता है, oops हटाया जाता है, और 120 टुकी बाड़ तक सिकुड़ता है।",
      histogramDensity: "घनत्व पैमाना: ऊँचाई count/(n*चौड़ाई) है और वक्र pdf है।",
      histogramMono: "काले-सफ़ेद mono। स्पष्ट color=#hex मोनो से ऊपर रहता है।",
      histogramRotate: "90° घुमाव: बिन ऊपर से नीचे, बार दाईं ओर। ratio 16x9 कैनवास तय करता है।",
      histogramLine: "क्षैतिज रेखा में कोलन नहीं: मान, लेबल, रंग, मोटाई और शैली।",
    },
  },
  pt: {
    header: `%% Intervalos: bins auto usa Freedman–Diaconis e Sturges se o IQR for 0. bins 8 fixa a quantidade, binwidth 10 a largura. bins 0 --> 10, 10 --> 25 são bordas que se encostam. A fronteira pertence ao intervalo da direita e o último intervalo é fechado. bins junto com binwidth é um erro.
%% Escala: scale count desenha a contagem e a curva como pdf(x) * n * largura do intervalo que contém x. scale density desenha count/(n*largura) e a curva é a pdf. Com intervalos desiguais a comparação honesta é density.
%% Folga: gap 0 não deixa espaço, gap 1 e gap 100% igualam a largura da barra, gap 2 e gap 200% a duplicam. A folga vale entre intervalos e entre séries dentro de um intervalo.
%% Rótulos: labels above|inside|none. O zero não é rotulado. labels fontcolor auto escolhe o contraste, labels fontcolor #1f2328 fixa uma cor.
%% Eixos: axis y off esconde o eixo de valores e a grelha, axis x off esconde os rótulos dos intervalos. grid off esconde só a grelha, grid 2 fixa o passo.
%% Rotação: rotate 90 (ou orientation horizontal) põe os intervalos de cima para baixo. rotate 0 devolve as colunas.
%% Cores: colors s1=#hex mean=#hex median=#hex ci=#hex, ou color=#hex em series ou curve. mono e mono invert são preto e branco; uma cor explícita vence.
%% Letra e moldura: fontsize 14, ratio 16x9.
%% Nível: line 4 "plano" color=#cf222e width=2 style=dash. Estilos: solid, dash, dot, dashdot.
%% Em falta: missing drop|mean|median|zero. Vazio, na, n/a, null, none, nan, -, —, . são valores em falta.
%% Erros: errors drop descarta um não número, errors fail interrompe a análise.
%% Outliers: outliers none|iqr 1.5|z 3|mad 3 com a ação drop|winsor|mark.
%% Estatísticas: stats mean median sd var ci, também min max q1 q3 iqr skew kurtosis, stats all e stats off. ci 0.95 é o intervalo de Student da média. sd usa o divisor n−1; a sigma normal ajustada é o MLE com divisor n.
%% Curvas: fit normal ajusta a última série ou o nome entre aspas. curve weibull shape=1.6 scale=28 "referência" color=#8250df desenha os parâmetros dados e não usa os dados. Famílias: normal, lognormal, exponential, uniform, gamma, weibull.`,
    seriesA: "Observações",
    seriesB: "Noite",
    x: "ms",
    yCount: "contagem",
    yDensity: "densidade",
    plan: "plano",
    reference: "referência",
    titles: {
      histogram: "Histograma de latência",
      histogramBins: "Histograma — intervalos explícitos",
      histogramCurves: "Histograma — curvas de distribuição",
      histogramLabels: "Histograma — rótulos internos",
      histogramClean: "Histograma — limpeza dos dados",
      histogramDensity: "Histograma — densidade",
      histogramMono: "Histograma — monocromático",
      histogramRotate: "Histograma — rotação de 90°",
      histogramLine: "Histograma — linha de nível",
    },
    notes: {
      histogram: "Histograma base: bins automáticos, escala de contagem, média, mediana e intervalo, com ajuste normal.",
      histogramBins: "Intervalos desiguais que se encostam. A fronteira pertence ao bin da direita.",
      histogramCurves: "Duas séries lado a lado. fit estima normal e weibull; curve desenha um Weibull com parâmetros dados.",
      histogramLabels: "Rótulos dentro da barra, folga de 20% e fontsize próprio.",
      histogramClean: "na vira a média, oops é descartado e 120 é winsorizado até a cerca de Tukey.",
      histogramDensity: "Escala de densidade: a barra é count/(n*largura) e a curva é a pdf.",
      histogramMono: "Modo preto e branco. Um color=#hex explícito vence o mono.",
      histogramRotate: "Rotação de 90°: os bins descem e as barras crescem para a direita. ratio 16x9 fixa a tela.",
      histogramLine: "Linha horizontal sem dois-pontos: valor, rótulo, cor, espessura e estilo.",
    },
  },
  de: {
    header: `%% Bins: bins auto nutzt Freedman–Diaconis, bei IQR 0 Sturges. bins 8 setzt die Anzahl, binwidth 10 die Breite. bins 0 --> 10, 10 --> 25 sind aneinanderstoßende Kanten. Die Grenze gehört zum rechten Bin, das letzte Intervall ist geschlossen. bins zusammen mit binwidth ist ein Fehler.
%% Skala: scale count zeichnet die Anzahl und die Kurve als pdf(x) * n * Breite des Bins, der x enthält. scale density zeichnet count/(n*Breite), die Kurve ist die pdf. Bei ungleichen Bins ist density der ehrliche Vergleich.
%% Abstand: gap 0 lässt keinen Zwischenraum, gap 1 und gap 100% entsprechen der Balkenbreite, gap 2 und gap 200% sind doppelt so breit. Der Abstand gilt zwischen Bins und zwischen Serien in einem Bin.
%% Beschriftung: labels above|inside|none. Die Null wird nicht beschriftet. labels fontcolor auto wählt den Kontrast, labels fontcolor #1f2328 setzt eine Farbe.
%% Achsen: axis y off blendet die Wertachse und ihr Gitter aus, axis x off die Bin-Beschriftungen. grid off blendet nur das Gitter aus, grid 2 setzt den Schritt.
%% Drehung: rotate 90 (oder orientation horizontal) legt die Bins von oben nach unten. rotate 0 stellt die Säulen wieder her.
%% Farben: colors s1=#hex mean=#hex median=#hex ci=#hex, oder color=#hex an series oder curve. mono und mono invert sind Schwarz-Weiß; eine explizite Farbe gewinnt.
%% Schrift und Rahmen: fontsize 14, ratio 16x9.
%% Niveau: line 4 "Plan" color=#cf222e width=2 style=dash. Stile: solid, dash, dot, dashdot.
%% Fehlend: missing drop|mean|median|zero. Leer, na, n/a, null, none, nan, -, —, . sind fehlend.
%% Fehler: errors drop verwirft eine Nicht-Zahl, errors fail bricht das Einlesen ab.
%% Ausreißer: outliers none|iqr 1.5|z 3|mad 3 mit der Aktion drop|winsor|mark.
%% Kennzahlen: stats mean median sd var ci, außerdem min max q1 q3 iqr skew kurtosis, stats all und stats off. ci 0.95 ist das Student-Intervall des Mittelwerts. sd teilt durch n−1; die angepasste Normal-Sigma ist der MLE mit Teiler n.
%% Kurven: fit normal passt die letzte Serie oder den Namen in Anführungszeichen an. curve weibull shape=1.6 scale=28 "Referenz" color=#8250df zeichnet die gegebenen Parameter und nutzt die Daten nicht. Familien: normal, lognormal, exponential, uniform, gamma, weibull.`,
    seriesA: "Beobachtungen",
    seriesB: "Abend",
    x: "ms",
    yCount: "Anzahl",
    yDensity: "Dichte",
    plan: "Plan",
    reference: "Referenz",
    titles: {
      histogram: "Histogramm der Latenz",
      histogramBins: "Histogramm — explizite Intervalle",
      histogramCurves: "Histogramm — Verteilungskurven",
      histogramLabels: "Histogramm — Beschriftung innen",
      histogramClean: "Histogramm — Datenbereinigung",
      histogramDensity: "Histogramm — Dichte",
      histogramMono: "Histogramm — monochrom",
      histogramRotate: "Histogramm — Drehung 90°",
      histogramLine: "Histogramm — Niveaulinie",
    },
    notes: {
      histogram: "Basis: automatische Bins, Zählskala, Mittelwert, Median und Konfidenzintervall, plus Normalanpassung.",
      histogramBins: "Ungleiche aneinanderstoßende Intervalle. Die Grenze gehört zum rechten Bin.",
      histogramCurves: "Zwei Serien nebeneinander. fit schätzt normal und weibull, curve zeichnet eine Weibull mit gegebenen Parametern.",
      histogramLabels: "Zahlen im Balken, Abstand 20% der Breite und eigenes fontsize.",
      histogramClean: "na wird zum Mittelwert, oops entfällt, 120 wird auf den Tukey-Zaun winsorisiert.",
      histogramDensity: "Dichteskala: Balkenhöhe ist count/(n*Breite), die Kurve ist die pdf.",
      histogramMono: "Schwarz-Weiß mit mono. Ein explizites color=#hex gewinnt.",
      histogramRotate: "Drehung um 90°: Bins von oben nach unten, Balken nach rechts. ratio 16x9 setzt die Fläche.",
      histogramLine: "Horizontale Linie ohne Doppelpunkt: Wert, Beschriftung, Farbe, Breite und Stil.",
    },
  },
  ar: {
    header: `%% الفترات: bins auto يستخدم Freedman–Diaconis، وSturges إذا كان IQR صفراً. bins 8 يحدد العدد، وbinwidth 10 العرض. bins 0 --> 10, 10 --> 25 حواف متلاصقة. الحد يتبع الفترة اليمنى والفترة الأخيرة مغلقة. bins مع binwidth خطأ.
%% المقياس: scale count يرسم العدد والمنحنى pdf(x) * n * عرض الفترة التي تحوي x. scale density يرسم count/(n*العرض) والمنحنى هو pdf. للمقارنة الصادقة عند فترات غير متساوية استخدم density.
%% الفراغ: gap 0 بلا فراغ، وgap 1 وgap 100% بقدر عرض العمود، وgap 2 وgap 200% ضعفه. الفراغ بين الفترات وبين السلاسل داخل الفترة.
%% التسميات: labels above|inside|none. الصفر لا يُكتب. labels fontcolor auto يختار التباين، وlabels fontcolor #1f2328 يحدد لوناً.
%% المحاور: axis y off يخفي محور القيم وشبكته، وaxis x off يخفي تسميات الفترات. grid off يخفي الشبكة فقط، وgrid 2 يحدد الخطوة.
%% الدوران: rotate 90 (أو orientation horizontal) يضع الفترات من الأعلى للأسفل. rotate 0 يعيد الأعمدة.
%% الألوان: colors s1=#hex mean=#hex median=#hex ci=#hex، أو color=#hex في series أو curve. mono وmono invert أبيض وأسود، واللون الصريح يتقدم.
%% الخط والإطار: fontsize 14 وratio 16x9.
%% المستوى: line 4 "الخطة" color=#cf222e width=2 style=dash. الأنماط: solid وdash وdot وdashdot.
%% النقص: missing drop|mean|median|zero. الفارغ وna وn/a وnull وnone وnan و- و— و. قيم ناقصة.
%% الأخطاء: errors drop يسقط غير العدد، وerrors fail يوقف التحليل.
%% الشذوذ: outliers none|iqr 1.5|z 3|mad 3 مع الإجراء drop|winsor|mark.
%% الإحصاءات: stats mean median sd var ci، وأيضاً min max q1 q3 iqr skew kurtosis وstats all وstats off. ci 0.95 هو فاصل ستيودنت للمتوسط. sd قاسمه n−1، وsigma للتوزيع الطبيعي المُقدَّر هي MLE بقاسم n.
%% المنحنيات: fit normal يلائم السلسلة الأخيرة أو الاسم بين علامتي اقتباس. curve weibull shape=1.6 scale=28 "المرجع" color=#8250df يرسم المعاملات المعطاة ولا يستخدم البيانات. العائلات: normal وlognormal وexponential وuniform وgamma وweibull.`,
    seriesA: "الملاحظات",
    seriesB: "المساء",
    x: "مللي ثانية",
    yCount: "العدد",
    yDensity: "الكثافة",
    plan: "الخطة",
    reference: "المرجع",
    titles: {
      histogram: "مدرج تكراري للتأخير",
      histogramBins: "مدرج — فترات صريحة",
      histogramCurves: "مدرج — منحنيات التوزيع",
      histogramLabels: "مدرج — تسميات داخلية",
      histogramClean: "مدرج — تنظيف البيانات",
      histogramDensity: "مدرج — الكثافة",
      histogramMono: "مدرج — أحادي اللون",
      histogramRotate: "مدرج — دوران 90°",
      histogramLine: "مدرج — خط المستوى",
    },
    notes: {
      histogram: "الأساس: فترات تلقائية، مقياس العدد، المتوسط والوسيط وفاصل الثقة، وملاءمة طبيعية.",
      histogramBins: "فترات غير متساوية متلاصقة. الحد يتبع الفترة اليمنى.",
      histogramCurves: "سلسلتان جنبًا إلى جنب. fit يقدّر normal وweibull، وcurve يرسم ويبل بالمعاملات المعطاة.",
      histogramLabels: "الأرقام داخل العمود، فراغ 20% من العرض، وfontsize خاص.",
      histogramClean: "na يُستبدل بالمتوسط، وoops يُسقط، و120 يُقص إلى سياج توكي.",
      histogramDensity: "مقياس الكثافة: الارتفاع count/(n*العرض) والمنحنى هو pdf.",
      histogramMono: "وضع أبيض وأسود. color=#hex الصريح يتقدم على mono.",
      histogramRotate: "دوران 90°: الفترات من الأعلى للأسفل والأعمدة تنمو يمينًا. ratio 16x9 يحدد اللوحة.",
      histogramLine: "خط أفقي بلا نقطتين: القيمة والتسمية واللون والعرض والنمط.",
    },
  },
};

export const HISTOGRAM_GALLERY_SAMPLES: Record<AppLocale, Record<HistogramGalleryId, string>> =
  Object.fromEntries(
    (Object.keys(COPIES) as AppLocale[]).map((locale) => [locale, buildSamples(COPIES[locale])]),
  ) as Record<AppLocale, Record<HistogramGalleryId, string>>;

export const HISTOGRAM_SAMPLES_RU = HISTOGRAM_GALLERY_SAMPLES.ru;
export const HISTOGRAM_SAMPLES_EN = HISTOGRAM_GALLERY_SAMPLES.en;
