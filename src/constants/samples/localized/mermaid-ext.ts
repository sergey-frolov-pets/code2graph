import type { MermaidExtSampleId } from "@/constants/mermaid-sample-diagrams";
import type { AppLocale } from "@/constants/i18n";

export const MERMAID_EXT_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<MermaidExtSampleId, string>
> = {
  es: {
    waterfall: `waterfall
%% Cascada básica: inicio, crecimiento, caída y total.
%% Filas de datos: <signo><número> : <etiqueta>
%%   =120 : Q1   valor absoluto (inicio o total)
%%   = : Suma S1  "=" solo — repite el total acumulado
%%   +180 : Q2   incremento
%%   -60 : Q3    decremento
%% Más funciones: ejemplos «corte de eje», «varias series», «etiquetas».
%% NOTA: las líneas discontinuas entre barras son conectores (activados por defecto).
%%       Para apagarlos: connectors off
title Ingresos 2026
y "mill. USD" 0 --> 500
grid 100
=120 : Q1 inicio
+180 : Q2 crecimiento
-60 : Q3 bajas
= : Suma S1
+240 : Q4
= : Suma del año`,
    waterfallBreak: `waterfall
%% Corte de eje: el tramo 300..800 se RECORTA para que los pasos pequeños se vean más grandes.
%% Una barra que cruza el corte se dibuja en trozos, con un zigzag en la línea.
title Ingresos con corte de eje
y "mill. USD" 0 --> 1000
grid 100
break 300 --> 800 "corte de eje"
=120 : Q1
+180 : Q2
+700 : Q3
= : Suma`,
    waterfallMulti: `waterfall
%% Varias series: cada grupo tiene su color de base,
%% los aumentos son un 20% más claros y las caídas un 25% más oscuras.
title Previsto frente a real
y "mill. USD" 0 --> 400
grid 100
series Previsto color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Suma
series Real color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Suma`,
    waterfallLabels: `waterfall
%% ETIQUETAS Y LÍNEAS — lo que más suele faltar.
%%
%% 1) inside y above eligen dónde va la etiqueta del valor.
%%    Las banderas van al final de la fila de datos; el orden no importa, ni las mayúsculas.
%%    Una sola bandera no dibuja la otra, así que inside a solas no se copia arriba:
%%      =90 : Q1 inside           solo dentro (encima de la barra no hay nada)
%%      -25 : Q3 above            solo encima de la barra
%%    Las dos a la vez están permitidas, y cada una puede llevar su texto:
%%      +60 : Q2 inside="60" above="+60 mill."
%%    Ambas posiciones con el mismo número:
%%      = : Suma inside above
%%    Para todas las barras a la vez:  labels inside | above | both | none
%%    La etiqueta interior es blanca; la de encima de la barra es gris.
%%    El texto que no cabe dentro de la barra se mueve encima, una sola vez.
%%
%% 2) Las LÍNEAS entre barras son una DIRECTIVA en su propia línea (no una bandera):
%%      connectors on    activar (activados por defecto)
%%      connectors off   desactivar
%%    La línea discontinua va del borde útil de una barra a la siguiente:
%%    crecimiento — desde arriba, caída — desde abajo. Niveles distintos
%%    se unen con un escalón.
%%
%% 3) Texto compartido cuando una posición no tiene el suyo:  label="+60 mill."
%%    Sin etiqueta alguna:                                      no-label
%%
%% 4) Colores: colors total= increase= decrease=
title Etiquetas y líneas
y "mill. USD" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 mill."
-25 : Q3 above
= : Suma inside above`,
    waterfallNoLines: `waterfall
%% LÍNEAS APAGADAS — la misma cascada que «etiquetas y líneas»,
%% pero sin los conectores discontinuos: una imagen limpia para presentar.
%%
%% La única diferencia es una línea:  connectors off
%% (los conectores están activos por defecto, así que "off" hay que escribirlo)
%%
%% Compárese con el ejemplo «Cascada — etiquetas y líneas»:
%% allí hay connectors on y exactamente los mismos datos.
title Etiquetas sin líneas
y "mill. USD" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 mill."
-25 : Q3 above
= : Suma inside above`,
    waterfallThresholds: `waterfall
%% LÍNEAS HORIZONTALES CON ETIQUETA — nivel del plan, meta, umbral.
%%
%% La directiva va en su PROPIA línea (no es una bandera en una fila de datos):
%%   line <valor> ["etiqueta"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "previsión"                 discontinua por defecto, color del tema
%%   line 400 "meta" color=#cf222e   color propio
%%   line 250 "umbral" style=dot width=1
%%
%% La línea cruza todo el gráfico; la etiqueta queda a la derecha de la última barra,
%% con un hueco para que la línea no tache el texto.
%% Tantas líneas como quieras — una por línea.
title Ingresos frente al plan
y "mill. USD" 0 --> 500
grid 100
line 350 "previsión"
line 400 "meta" color=#cf222e width=2
line 250 "umbral" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : Suma S1
+240 : Q4
= : Suma del año`,
    waterfallMono: `waterfall
%% Modo en blanco y negro: no hacen falta colores, las barras se distinguen por la claridad.
%% Útil para imprimir y para documentos sin color.
%% Los colores propios siguen funcionando aquí — sustituyen la escala de grises.
title Modo blanco y negro (mono)
mono
y "mill. USD" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : Suma S1
+110 : Q4
= : Suma del año`,
    bubble: `bubble
%% Demostración de todo lo que hace bubble: ejes x/y, leyenda del tamaño, cuadrantes
%% y sus etiquetas, grupos de color y tamaño de letra.
%% La etiqueta se queda dentro de la burbuja si cabe; si no, debajo, entera, sin "…".
title Matriz BCG: etiquetas completas
x "Cuota de mercado" 0 --> 10
y "Crecimiento del mercado, %" 0 --> 30
size "Ingresos"
quadrants Estrellas, Interrogantes, Vacas lecheras, Perros
mid x=5 y=12
fontsize 12
data
Producto A : x=8.2, y=22, size=340, group=Software
Producto B : x=2.1, y=25, size=180, group=Software
Producto C : x=7.4, y=4, size=520, group=Hardware
Producto D : x=1.5, y=3, size=90, group=Hardware
Producto E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title Carga por día
x Lun, Mar, Mié, Jue, Vie
y Mañana, Mediodía, Tarde
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Mañana : 20, 35, 50, 30, 25
Mediodía : 60, 75, 85, 70, 55
Tarde : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% El relleno es color=#hex (o fill=). El borde es border=#hex y style=solid|dash|dot|dashdot.
%% Las claves se combinan en cualquier orden. Dentro de [corchetes] color= sigue siendo parte de la etiqueta.
DirectorGeneral [Director general\\nAlejandro Mora] color=#8250df
DirectorTecnico [Director de tecnología\\nElena Vidal] color=#ddf4ff border=#0969da
DirectorFinanciero [Director financiero\\nLaura Méndez] border=#9a6700 style=dash
Servidor [Responsable de desarrollo de servidor\\nSergio Vargas]
Cliente [Responsable de desarrollo de cliente\\nMaría Soler]
DirectorGeneral -> DirectorTecnico
DirectorGeneral -> DirectorFinanciero
DirectorTecnico -> Servidor
DirectorTecnico -> Cliente
DirectorFinanciero -.-> Servidor`,
    ev: `ev
title Valor ganado del presupuesto
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% Diagrama de caja: cuartiles Q1/Q2/Q3, bigotes, rombo de la media y valores atípicos.
%% Dos formas de definir la fila de una categoría:
%%   1) Resumen explícito de cinco números: Categoría : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) Observaciones en bruto:      Categoría : values=20, 28, 35, 42, 50, 62, 145 color=#hex (bigotes de Tukey 1.5*IQR)
%% Opciones de color:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — modo de impresión en blanco y negro
title Distribución de la latencia de servicios
y "milisegundos" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
Pasarela API : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
Pagos : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
Búsqueda : values=12, 22, 28, 34, 38, 45, 52, 68, 148
Analítica : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% Mapa de árbol: el área de cada rectángulo es proporcional a su peso numérico.
%% Sintaxis de fila: Grupo / Elemento : <peso> [color=#hex]
%% Directiva labels: values | percent | both | none (por defecto both — valor y cuota en %).
%% Opciones de color: colors s1=#hex s2=#hex ..., color=#hex en un grupo o elemento, o mono.
title Desglose del presupuesto de TI (mill. USD)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
Infraestructura / Nube y K8s : 420
Infraestructura / Red y CDN : 180
Infraestructura / Almacenamiento : 140
Ingeniería / Servidor y API : 360
Ingeniería / Web y móvil : 260
Ingeniería / QA y automatización : 140
Datos e IA / Almacén DWH : 240
Datos e IA / Modelos de ML : 160 color=#0f766e`,
    radar: `radar
%% Diagrama de radar / araña: compara varias series en N >= 3 ejes.
%% Directivas:
%%   axes Eje 1, Eje 2, ...  etiquetas de los radios (al menos 3)
%%   scale 0 --> 100           rango de valores a lo largo de los radios
%%   rings 5                   número de anillos poligonales concéntricos
%%   fill 0.22                 opacidad del relleno del polígono (0..1 u off)
%%   dots on|off               marcas en los vértices
%%   colors s1=#hex s2=#hex    paleta de series (o color=#hex por serie, o mono)
title Comparación de plataformas en la nube
axes Rendimiento, Fiabilidad, Seguridad, Experiencia DX, Ecosistema, Eficiencia de coste
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series Plataforma A : 90, 92, 88, 82, 95, 70
series Plataforma B : 78, 85, 94, 90, 80, 86
series Plataforma C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% Teselación de Voronoi: parte el plano en celdas convexas del centro más cercano.
%% Directivas:
%%   x "etiqueta" min --> max     eje X (por defecto 0 --> 100)
%%   y "etiqueta" min --> max     eje Y (por defecto 0 --> 100)
%%   sites on|off              dibujar los puntos centrales
%%   labels on|off             dibujar las etiquetas de las celdas en el centroide
%%   colors s1=#hex s2=#hex    paleta de grupos/celdas (o color=#hex por punto, o mono)
title Zonas de cobertura de centros logísticos
x "Oeste — Este, km" 0 --> 100
y "Sur — Norte, km" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
Centro norte : x=48, y=82, group=Troncal
Centro sur : x=52, y=18, group=Troncal
Terminal oeste : x=20, y=54, group=Región
Terminal este : x=82, y=56, group=Región
Depósito central : x=50, y=50, group=Núcleo
Suroeste : x=24, y=22, group=Región, color=#f97316`,
    clustered: `series
%% Diagrama de series: agrupa varias series una al lado de la otra en cada categoría.
%% Para girar el gráfico 90 grados (barras horizontales), añada: rotate 90
%% Directivas:
%%   categories C1, C2, ...    etiquetas de categoría (alias: x C1, C2, ...)
%%   y "etiqueta" min --> max     escala del eje de valores
%%   labels above|inside|none  etiquetas de los valores
%%   colors s1=#hex s2=#hex    paleta de series (o color=#hex en la fila series, o mono)
title Ingresos por canal de ventas
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series En línea : 120, 145, 165, 190
series Minorista : 85, 95, 110, 130
series Socios : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% Diagrama de series GIRADO 90 GRADOS (rotate 90).
%% La directiva rotate 90 (u orientation horizontal) intercambia los ejes:
%% las categorías bajan de arriba abajo a la izquierda, y las barras crecen de izquierda a derecha.
%% Ponga la primera categoría abajo con: invert y (volver atrás con invert y off).
%% Vuelva a las barras verticales con: rotate 0 (o quite rotate 90).
title Ingresos por canal (giro 90°)
rotate 90
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series En línea : 120, 145, 165, 190
series Minorista : 85, 95, 110, 130
series Socios : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% Barras apiladas: las series comparten una columna en lugar de ir una al lado de la otra.
%% stacked / bars stacked / layout stacked
%% Otra vez una al lado de la otra: stacked off o bars grouped
%% Los valores positivos crecen hacia arriba desde cero, los negativos hacia abajo.
title Composición de los ingresos
stacked
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series Producto : 80, 90, 70, 110
series Servicios : 50, 60, 55, 70
series Socios : 30, 25, 40, 35`,
    clusteredMono: `series
%% Blanco y negro: las series se distinguen por la claridad, no por el tono.
%% Unos colors explícitos sustituyen la escala de grises, por eso este ejemplo no los pone.
title Ingresos, blanco y negro
mono
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 200
grid 50
series En línea : 120, 145, 165, 190
series Minorista : 85, 95, 110, 130
series Socios : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% Blanco y negro invertido: barras gris claro sobre un lienzo oscuro.
%% Para temas oscuros y diapositivas oscuras. mono off devuelve el color.
title Ingresos, blanco y negro invertido
mono invert
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 200
grid 50
series En línea : 120, 145, 165, 190
series Minorista : 85, 95, 110, 130
series Socios : 45, 60, 75, 95`,
    seriesLines: `series
%% Una línea sobre las barras: line Etiqueta : n1, n2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot. Por defecto solid y grosor 1.75.
%% Omita una categoría con un hueco vacío, "-", o null. La línea une los puntos a ambos lados.
%% La etiqueta queda a la derecha del gráfico, a la altura del último punto dado.
title Reales y referencias
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 220
grid 20
labels above
series Real : 120, 145, 165, 190
line Continua : 110, 130, 150, 180 color=#0969da style=solid width=2
line Discontinua : 100, -, 160, 175 color=#8250df style=dash
line Puntos : 90, , 155, 170 color=#2da44e style=dot width=1
line Trazo-punto : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% Un cagr sin números dibuja una flecha desde la primera barra hasta la última.
title Crecimiento de los ingresos
categories 2021, 2022, 2023, 2024
y "mill. USD" 0 --> 220
grid 20
series Ingresos : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% Distintas opciones de cagr en los rangos de barras 1–3, 4–6 y 7–9.
%% Los números de barra empiezan en 1. Varios cagr seguidos pertenecen a la serie justo encima.
%% format="0%"        entero, el valor por defecto
%% format="0.0%"      un decimal; "+" en el patrón añade el signo más
%% format="0.00"      una razón, sin signo de porcentaje
%% prefix="CAGR: "    texto antes del número
%% label="meta"       texto del óvalo tal cual, sin cálculo (prefix entonces se ignora)
title CAGR por tramo
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "mill. USD" 0 --> 220
grid 20
series En línea : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="meta"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% Corte de eje: el tramo 200..700 se RECORTA para que las barras pequeñas se vean más grandes.
%% Una barra que cruza el corte se dibuja en trozos, con un zigzag en la línea.
%% La misma sintaxis que waterfall: break <después> --> <antes> ["etiqueta"]
title Ingresos con un corte de eje
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 1000
grid 100
break 200 --> 700 "corte de eje"
series En línea : 120, 180, 860, 240
series Minorista : 80, 140, 790, 190`,
    seriesThresholds: `series
%% LÍNEAS HORIZONTALES — plan, meta, umbral.
%% Esto NO es una línea a través de las categorías: una línea de nivel no lleva dos puntos.
%%
%%   line <valor> ["etiqueta"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line Etiqueta : n1, n2, …   — sigue siendo una polilínea sobre las barras
%%
%% La línea cruza el gráfico; la etiqueta queda a la derecha, con un hueco detrás del texto.
title Ingresos respecto al plan
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 250
grid 50
line 160 "previsión"
line 200 "meta" color=#cf222e width=2
line 120 "umbral" style=dot width=1
series Real : 120, 145, 165, 190
series Referencia : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% Se puede omitir el nombre de la serie y la etiqueta de la línea.
%%   series : n1, n2, …     barras sin fila en la leyenda
%%   line : n1, n2, …       una línea sin leyenda a la derecha
%% color y style se siguen aplicando.
title Trimestres sin nombres
categories Q1, Q2, Q3, Q4
y "mill. USD" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
  zh: {
    waterfall: `waterfall
%% 基本瀑布图：起点、增长、下降、合计。
%% 数据行：<符号><数字> : <标签>
%%   =120 : Q1   绝对值（起点或合计）
%%   = : 上半年合计  单独的 "=" — 重复当前累计合计
%%   +180 : Q2   向上增量
%%   -60 : Q3    向下增量
%% 其余功能见示例「轴截断」「多系列」「标签」。
%% 注意：柱之间的虚线是连接线（默认开启）。
%%       关闭方式：connectors off
title 2026 年收入
y "百万美元" 0 --> 500
grid 100
=120 : Q1 起点
+180 : Q2 增长
-60 : Q3 流失
= : 上半年合计
+240 : Q4
= : 全年合计`,
    waterfallBreak: `waterfall
%% 轴截断：区间 300..800 被切掉，使较小的台阶显得更大。
%% 穿过截断的柱会分段绘制，并在线上加锯齿。
title 带轴截断的收入
y "百万美元" 0 --> 1000
grid 100
break 300 --> 800 "轴截断"
=120 : Q1
+180 : Q2
+700 : Q3
= : 合计`,
    waterfallMulti: `waterfall
%% 多个系列：每组有自己的基色，
%% 增长浅 20%，下降深 25%。
title 计划与实际
y "百万美元" 0 --> 400
grid 100
series 计划 color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : 合计
series 实际 color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : 合计`,
    waterfallLabels: `waterfall
%% 标签和连线 — 最常被漏掉的两件事。
%%
%% 1) inside 和 above 决定数值标签写在哪里。
%%    标志写在数据行末尾；顺序无关，大小写也无关。
%%    只写一个标志不会画出另一个，因此单独的 inside 不会被复制到柱上方：
%%      =90 : Q1 inside           仅在内部（柱上方为空）
%%      -25 : Q3 above            仅在柱上方
%%    两者可以同时使用，而且各自可以带不同文字：
%%      +60 : Q2 inside="60" above="+60 百万"
%%    两个位置使用同一个数字：
%%      = : 合计 inside above
%%    一次性作用于所有柱：  labels inside | above | both | none
%%    内部标签为白色，柱上方的标签为灰色。
%%    放不进柱内的文字会移到柱上方，只保留一份。
%%
%% 2) 柱与柱之间的连线是单独一行的指令（不是标志）：
%%      connectors on    开启（默认开启）
%%      connectors off   关闭
%%    虚线从柱的工作边连到下一根柱：
%%    增长从顶部出发，下降从底部出发。高度不同时
%%    用台阶连接。
%%
%% 3) 某个位置没有自己的文字时，使用共用文字：  label="+60 百万"
%%    完全不要标签：                                            no-label
%%
%% 4) 颜色：colors total= increase= decrease=
title 标签与连线
y "百万美元" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 百万"
-25 : Q3 above
= : 合计 inside above`,
    waterfallNoLines: `waterfall
%% 连线关闭 — 与「标签与连线」同一张瀑布图，
%% 但没有虚线连接：适合演示的干净图。
%%
%% 唯一的差别是一行：  connectors off
%% （连接线默认开启，因此必须明确写出 "off"）
%%
%% 对照示例「瀑布图 — 标签与连线」：
%% 那里是 connectors on，数据完全相同。
title 无连线的标签
y "百万美元" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 百万"
-25 : Q3 above
= : 合计 inside above`,
    waterfallThresholds: `waterfall
%% 带标签的水平线 — 计划水平、目标、阈值。
%%
%% 该指令独占一行（不是数据行里的标志）：
%%   line <值> ["标签"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "计划"                 默认虚线，主题色
%%   line 400 "目标" color=#cf222e   自定义颜色
%%   line 250 "阈值" style=dot width=1
%%
%% 线横贯整个绘图区，标签位于最后一根柱的右侧，
%% 并留出缺口，使线条不会划过文字。
%% 需要多少条就写多少条 — 每条一行。
title 收入对比计划
y "百万美元" 0 --> 500
grid 100
line 350 "计划"
line 400 "目标" color=#cf222e width=2
line 250 "阈值" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : 上半年合计
+240 : Q4
= : 全年合计`,
    waterfallMono: `waterfall
%% 黑白模式：不需要颜色，柱靠明暗区分。
%% 适合打印和无色彩的文档。
%% 这里仍可指定自定义颜色 — 它们会覆盖灰度。
title 黑白模式 (mono)
mono
y "百万美元" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : 上半年合计
+110 : Q4
= : 全年合计`,
    bubble: `bubble
%% bubble 全部功能演示：x/y 轴、大小图例、象限
%% 及其标签、颜色分组和字号。
%% 标签放得下就留在气泡内；否则完整放在下方，不用「…」。
title BCG 矩阵：完整标签
x "市场份额" 0 --> 10
y "市场增长，%" 0 --> 30
size "收入"
quadrants 明星, 问题, 金牛, 瘦狗
mid x=5 y=12
fontsize 12
data
产品 A : x=8.2, y=22, size=340, group=Software
产品 B : x=2.1, y=25, size=180, group=Software
产品 C : x=7.4, y=4, size=520, group=Hardware
产品 D : x=1.5, y=3, size=90, group=Hardware
产品 E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title 按日负载
x 周一, 周二, 周三, 周四, 周五
y 早晨, 白天, 傍晚
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
早晨 : 20, 35, 50, 30, 25
白天 : 60, 75, 85, 70, 55
傍晚 : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% 填充是 color=#hex（或 fill=）。边框是 border=#hex 和 style=solid|dash|dot|dashdot。
%% 这些键可以任意组合、调换顺序。在 [方括号] 内 color= 仍是标签文字。
首席执行官 [首席执行官\\n王伟] color=#8250df
技术总监 [技术总监\\n陈丽] color=#ddf4ff border=#0969da
财务总监 [财务总监\\n李娜] border=#9a6700 style=dash
后端 [后端研发负责人\\n张强]
前端 [前端研发负责人\\n刘洋]
首席执行官 -> 技术总监
首席执行官 -> 财务总监
技术总监 -> 后端
技术总监 -> 前端
财务总监 -.-> 后端`,
    ev: `ev
title 预算挣值
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% 箱线图：四分位数 Q1/Q2/Q3、须线、均值菱形和离群点。
%% 定义类别行有两种方式：
%%   1) 显式五数概括：类别 : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) 原始观测值：      类别 : values=20, 28, 35, 42, 50, 62, 145 color=#hex（Tukey 1.5*IQR 须线）
%% 颜色选项：
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — 黑白打印模式
title 服务延迟分布
y "毫秒" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
API 网关 : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
支付 : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
搜索 : values=12, 22, 28, 34, 38, 45, 52, 68, 148
分析 : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% 树状图：每个矩形的面积与其数值权重成正比。
%% 行语法：组 / 项 : <权重> [color=#hex]
%% labels 指令：values | percent | both | none（默认 both — 数值和百分比份额）。
%% 颜色选项：colors s1=#hex s2=#hex ...，组或项上的 color=#hex，或 mono。
title 信息技术预算构成（百万美元）
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
基础设施 / 云与 K8s : 420
基础设施 / 网络与 CDN : 180
基础设施 / 存储 : 140
研发 / 后端与 API : 360
研发 / 网页与移动端 : 260
研发 / QA 与自动化测试 : 140
数据与人工智能 / 数据仓库 DWH : 240
数据与人工智能 / ML 模型 : 160 color=#0f766e`,
    radar: `radar
%% 雷达图 / 蛛网图：在 N >= 3 条轴上比较多个系列。
%% 指令：
%%   axes 轴 1, 轴 2, ...  辐条标签（至少 3 个）
%%   scale 0 --> 100           沿辐条的取值范围
%%   rings 5                   同心多边形环的数量
%%   fill 0.22                 多边形填充不透明度（0..1 或 off）
%%   dots on|off               顶点标记
%%   colors s1=#hex s2=#hex    系列调色板（或每条系列 color=#hex，或 mono）
title 云平台比较
axes 性能, 可靠性, 安全性, 开发者体验, 生态系统, 成本效率
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series 平台 A : 90, 92, 88, 82, 95, 70
series 平台 B : 78, 85, 94, 90, 80, 86
series 平台 C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% 沃罗诺伊剖分：把平面分成离各中心最近的凸单元格。
%% 指令：
%%   x "标签" min --> max     X 轴（默认 0 --> 100）
%%   y "标签" min --> max     Y 轴（默认 0 --> 100）
%%   sites on|off              绘制中心点
%%   labels on|off             在多边形质心绘制单元格标签
%%   colors s1=#hex s2=#hex    组/单元格调色板（或每个点 color=#hex，或 mono）
title 物流枢纽覆盖区
x "西 — 东，千米" 0 --> 100
y "南 — 北，千米" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
北部枢纽 : x=48, y=82, group=干线
南部枢纽 : x=52, y=18, group=干线
西部终端 : x=20, y=54, group=区域
东部终端 : x=82, y=56, group=区域
中央仓库 : x=50, y=50, group=核心
西南 : x=24, y=22, group=区域, color=#f97316`,
    clustered: `series
%% 系列图：每个类别里把多个系列并排分组。
%% 要把图旋转 90 度（水平条），请添加：rotate 90
%% 指令：
%%   categories C1, C2, ...    类别标签（别名：x C1, C2, ...）
%%   y "标签" min --> max     数值轴刻度
%%   labels above|inside|none  数值标签
%%   colors s1=#hex s2=#hex    系列调色板（或 series 行上的 color=#hex，或 mono）
title 按销售渠道的收入
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series 线上 : 120, 145, 165, 190
series 零售 : 85, 95, 110, 130
series 伙伴 : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% 旋转 90 度的系列图 (rotate 90)。
%% 指令 rotate 90（或 orientation horizontal）对调坐标轴：
%% 类别在左侧从上到下排列，分组条从左向右生长。
%% 把第一个类别放到底部：invert y（恢复用 invert y off）。
%% 恢复竖直柱：rotate 0（或删掉 rotate 90）。
title 按渠道的收入（旋转 90°）
rotate 90
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series 线上 : 120, 145, 165, 190
series 零售 : 85, 95, 110, 130
series 伙伴 : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% 堆积柱：系列共用一根柱，而不是并排。
%% stacked / bars stacked / layout stacked
%% 恢复并排：stacked off 或 bars grouped
%% 正值从零向上长，负值向下长。
title 收入构成
stacked
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series 产品 : 80, 90, 70, 110
series 服务 : 50, 60, 55, 70
series 伙伴 : 30, 25, 40, 35`,
    clusteredMono: `series
%% 黑白：系列靠明暗区分，不靠色相。
%% 显式 colors 会覆盖灰度，因此本示例不写它们。
title 收入，黑白
mono
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 200
grid 50
series 线上 : 120, 145, 165, 190
series 零售 : 85, 95, 110, 130
series 伙伴 : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% 反色黑白：深色画布上的浅灰柱。
%% 用于深色主题和深色幻灯片。mono off 会恢复颜色。
title 收入，反色黑白
mono invert
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 200
grid 50
series 线上 : 120, 145, 165, 190
series 零售 : 85, 95, 110, 130
series 伙伴 : 45, 60, 75, 95`,
    seriesLines: `series
%% 柱上的一条线：line 标签 : 值1, 值2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot。默认 solid，粗细 1.75。
%% 用空位、"-" 或 null 跳过一个类别。线会连接缺口两侧的点。
%% 标签在绘图区右侧，高度与最后一个给定点相同。
title 实际与参照
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 220
grid 20
labels above
series 实际 : 120, 145, 165, 190
line 实线 : 110, 130, 150, 180 color=#0969da style=solid width=2
line 虚线 : 100, -, 160, 175 color=#8250df style=dash
line 点线 : 90, , 155, 170 color=#2da44e style=dot width=1
line 点划线 : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% 不带数字的 cagr 从第一根柱画一根箭头到最后一根。
title 收入增长
categories 2021, 2022, 2023, 2024
y "百万美元" 0 --> 220
grid 20
series 收入 : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% 柱区间 1–3、4–6 和 7–9 上不同的 cagr 选项。
%% 柱编号从 1 开始。连续多条 cagr 属于紧挨在它们上面的系列。
%% format="0%"        整数，默认
%% format="0.0%"      一位小数；模式里的 "+" 会加上正号
%% format="0.00"      比率，不带百分号
%% prefix="CAGR: "    数字前的文字
%% label="目标"       椭圆文字原样显示，不计算（此时忽略 prefix）
title 按区间的 CAGR
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "百万美元" 0 --> 220
grid 20
series 线上 : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="目标"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% 轴截断：区间 200..700 被切掉，使较小的柱显得更大。
%% 穿过截断的柱会分段绘制，并在线上加锯齿。
%% 语法与 waterfall 相同：break <之后> --> <之前> ["标签"]
title 带轴截断的收入图
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 1000
grid 100
break 200 --> 700 "轴截断"
series 线上 : 120, 180, 860, 240
series 零售 : 80, 140, 790, 190`,
    seriesThresholds: `series
%% 水平线 — 计划、目标、阈值。
%% 这不是跨类别的折线：水平线没有冒号。
%%
%%   line <值> ["标签"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line 标签 : 值1, 值2, …   — 仍然是柱上的折线
%%
%% 线横贯绘图区；标签在右侧，文字后面留出空隙。
title 对照计划的收入
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 250
grid 50
line 160 "计划"
line 200 "目标" color=#cf222e width=2
line 120 "阈值" style=dot width=1
series 实际 : 120, 145, 165, 190
series 参照 : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% 系列名和线的标签都可以不写。
%%   series : 值1, 值2, …     图例中没有对应行的柱
%%   line : 值1, 值2, …       右侧没有说明的线
%% color 和 style 仍然有效。
title 无名称的季度
categories Q1, Q2, Q3, Q4
y "百万美元" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
  ja: {
    waterfall: `waterfall
%% 基本のウォーターフォール：開始、増加、減少、合計。
%% データ行：<符号><数値> : <ラベル>
%%   =120 : Q1   絶対値（開始または合計）
%%   = : 上期合計  数値なしの "=" — これまでの累計を繰り返す
%%   +180 : Q2   増加
%%   -60 : Q3    減少
%% その他の機能は例「軸の分割」「複数系列」「ラベル」を参照。
%% 注意：棒の間の破線はコネクタです（既定でオン）。
%%       オフにするには：connectors off
title 2026 年の売上
y "百万米ドル" 0 --> 500
grid 100
=120 : Q1 開始
+180 : Q2 成長
-60 : Q3 離脱
= : 上期合計
+240 : Q4
= : 年間合計`,
    waterfallBreak: `waterfall
%% 軸の分割：区間 300..800 を切り取り、小さな段差を大きく見せます。
%% 分割をまたぐ棒は切れ目で分かれ、線上にジグザグが付きます。
title 軸分割付きの売上
y "百万米ドル" 0 --> 1000
grid 100
break 300 --> 800 "軸の分割"
=120 : Q1
+180 : Q2
+700 : Q3
= : 合計`,
    waterfallMulti: `waterfall
%% 複数系列：各グループに基準色があり、
%% 増加は 20% 明るく、減少は 25% 暗くなります。
title 計画と実績
y "百万米ドル" 0 --> 400
grid 100
series 計画 color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : 合計
series 実績 color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : 合計`,
    waterfallLabels: `waterfall
%% ラベルと線 — いちばん忘れられがちな二つ。
%%
%% 1) inside と above は値ラベルの位置を選びます。
%%    フラグはデータ行の末尾に書きます。順序も大文字小文字も関係ありません。
%%    片方だけのフラグはもう片方を描きません。inside だけなら上にはコピーされません：
%%      =90 : Q1 inside           内側のみ（棒の上は空）
%%      -25 : Q3 above            棒の上のみ
%%    同時に両方置けます。それぞれ別の文字にできます：
%%      +60 : Q2 inside="60" above="+60 百万"
%%    両方の位置に同じ数値：
%%      = : 合計 inside above
%%    すべての棒へ一度に：  labels inside | above | both | none
%%    内側のラベルは白、棒の上のラベルは灰色です。
%%    棒の中に収まらない文字は上へ移し、コピーは一つだけです。
%%
%% 2) 棒と棒の間の線は、独立した行の指令です（フラグではありません）：
%%      connectors on    有効にする（既定でオン）
%%      connectors off   無効にする
%%    破線は棒の作業端から次の棒へ走ります：
%%    増加は上端から、減少は下端から。高さが違うときは
%%    段差でつなぎます。
%%
%% 3) 位置に独自の文字がないときの共通テキスト：  label="+60 百万"
%%    ラベルをまったく付けない：                                no-label
%%
%% 4) 色：colors total= increase= decrease=
title ラベルと線
y "百万米ドル" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 百万"
-25 : Q3 above
= : 合計 inside above`,
    waterfallNoLines: `waterfall
%% 線オフ — 「ラベルと線」と同じウォーターフォールで、
%% ただし破線のコネクタはありません。発表用のすっきりした図です。
%%
%% 違いはその一行だけです：  connectors off
%% （コネクタは既定でオンなので、"off" は明示して書く）
%%
%% 例「ウォーターフォール — ラベルと線」と比べてください：
%% そちらは connectors on で、データはまったく同じです。
title 線なしのラベル
y "百万米ドル" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 百万"
-25 : Q3 above
= : 合計 inside above`,
    waterfallThresholds: `waterfall
%% ラベル付き水平線 — 計画の水準、目標、しきい値。
%%
%% 指令は独立した行に書きます（データ行のフラグではありません）：
%%   line <値> ["ラベル"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "計画"                 既定は破線、テーマ色
%%   line 400 "目標" color=#cf222e   独自の色
%%   line 250 "しきい値" style=dot width=1
%%
%% 線はプロット全体を横切り、ラベルは最後の棒の右に置きます。
%% 文字の後ろは抜きにするので、線が文字を横切りません。
%% 本数はいくつでも — 1 本につき 1 行です。
title 計画に対する売上
y "百万米ドル" 0 --> 500
grid 100
line 350 "計画"
line 400 "目標" color=#cf222e width=2
line 250 "しきい値" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : 上期合計
+240 : Q4
= : 年間合計`,
    waterfallMono: `waterfall
%% 白黒モード：色は不要で、棒は明るさで区別します。
%% 印刷や色のない文書に向きます。
%% 独自の色もここで使えます — 灰色の階調を上書きします。
title 白黒モード (mono)
mono
y "百万米ドル" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : 上期合計
+110 : Q4
= : 年間合計`,
    bubble: `bubble
%% bubble の全機能の見本：x/y 軸、大きさの凡例、象限
%% とそのラベル、色のグループ、文字サイズ。
%% ラベルは収まれば泡の中、収まらなければ下に全文、"…" は付けません。
title BCG マトリクス：ラベル全文
x "市場シェア" 0 --> 10
y "市場成長率、%" 0 --> 30
size "売上"
quadrants スター, 問題児, 金のなる木, 負け犬
mid x=5 y=12
fontsize 12
data
製品 A : x=8.2, y=22, size=340, group=Software
製品 B : x=2.1, y=25, size=180, group=Software
製品 C : x=7.4, y=4, size=520, group=Hardware
製品 D : x=1.5, y=3, size=90, group=Hardware
製品 E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title 日別の負荷
x 月, 火, 水, 木, 金
y 朝, 昼, 夕方
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
朝 : 20, 35, 50, 30, 25
昼 : 60, 75, 85, 70, 55
夕方 : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% 塗りは color=#hex（または fill=）。枠は border=#hex と style=solid|dash|dot|dashdot。
%% キーは任意の順で組み合わせられます。[角括弧] の中では color= はラベルの一部のままです。
社長 [最高経営責任者\\n佐藤健] color=#8250df
技術責任者 [最高技術責任者\\n鈴木美咲] color=#ddf4ff border=#0969da
財務責任者 [最高財務責任者\\n高橋翔] border=#9a6700 style=dash
バックエンド [バックエンド開発責任者\\n田中蓮]
フロントエンド [フロントエンド開発責任者\\n伊藤彩]
社長 -> 技術責任者
社長 -> 財務責任者
技術責任者 -> バックエンド
技術責任者 -> フロントエンド
財務責任者 -.-> バックエンド`,
    ev: `ev
title 予算のアーンドバリュー
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% 箱ひげ図：四分位数 Q1/Q2/Q3、ひげ、平均のひし形、外れ値。
%% カテゴリ行の書き方は二つあります：
%%   1) 明示の五数要約：カテゴリ : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) 生の観測値：      カテゴリ : values=20, 28, 35, 42, 50, 62, 145 color=#hex（Tukey 1.5*IQR のひげ）
%% 色のオプション：
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — 白黒印刷モード
title サービス応答時間の分布
y "ミリ秒" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
API ゲートウェイ : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
決済 : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
検索 : values=12, 22, 28, 34, 38, 45, 52, 68, 148
分析 : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% ツリーマップ：各矩形の面積は数値の重みに比例します。
%% 行の構文：グループ / 項目 : <重み> [color=#hex]
%% labels 指令：values | percent | both | none（既定は both — 値と割合 %）。
%% 色のオプション：colors s1=#hex s2=#hex ...、グループや項目の color=#hex、または mono。
title IT 予算の内訳（百万米ドル）
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
インフラ / クラウドと K8s : 420
インフラ / ネットワークと CDN : 180
インフラ / ストレージ : 140
開発 / バックエンドと API : 360
開発 / ウェブとモバイル : 260
開発 / QA と自動テスト : 140
データと AI / DWH ウェアハウス : 240
データと AI / ML モデル : 160 color=#0f766e`,
    radar: `radar
%% レーダー図 / スパイダーチャート：N >= 3 本の軸で複数系列を比べます。
%% 指令：
%%   axes 軸 1, 軸 2, ...  軸のラベル（3 個以上）
%%   scale 0 --> 100           軸に沿った値の範囲
%%   rings 5                   同心の多角形リングの数
%%   fill 0.22                 多角形の塗り不透明度（0..1 または off）
%%   dots on|off               頂点の印
%%   colors s1=#hex s2=#hex    系列のパレット（系列ごとの color=#hex、または mono）
title クラウド基盤の比較
axes 性能, 信頼性, 安全性, 開発体験, エコシステム, コスト効率
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series プラットフォーム A : 90, 92, 88, 82, 95, 70
series プラットフォーム B : 78, 85, 94, 90, 80, 86
series プラットフォーム C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% ボロノイ分割：平面を最寄りの中心の凸セルに分けます。
%% 指令：
%%   x "ラベル" min --> max     X 軸（既定は 0 --> 100）
%%   y "ラベル" min --> max     Y 軸（既定は 0 --> 100）
%%   sites on|off              中心の点を描く
%%   labels on|off             セルのラベルを重心に描く
%%   colors s1=#hex s2=#hex    グループ/セルのパレット（点ごとの color=#hex、または mono）
title 物流拠点のカバー範囲
x "西 — 東、km" 0 --> 100
y "南 — 北、km" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
北拠点 : x=48, y=82, group=幹線
南拠点 : x=52, y=18, group=幹線
西ターミナル : x=20, y=54, group=地域
東ターミナル : x=82, y=56, group=地域
中央倉庫 : x=50, y=50, group=中核
南西 : x=24, y=22, group=地域, color=#f97316`,
    clustered: `series
%% 系列図：各カテゴリで複数系列を横に並べます。
%% 図を 90 度回す（横棒）には次を追加します：rotate 90
%% 指令：
%%   categories C1, C2, ...    カテゴリのラベル（別名：x C1, C2, ...）
%%   y "ラベル" min --> max     値軸の目盛り
%%   labels above|inside|none  値のラベル
%%   colors s1=#hex s2=#hex    系列のパレット（series 行の color=#hex、または mono）
title 販路別の売上
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series オンライン : 120, 145, 165, 190
series 店舗 : 85, 95, 110, 130
series パートナー : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% 90 度回転した系列図 (rotate 90)。
%% 指令 rotate 90（または orientation horizontal）は軸を入れ替えます：
%% カテゴリは左で上から下へ並び、棒は左から右へ伸びます。
%% 最初のカテゴリを下にするには：invert y（戻すには invert y off）。
%% 縦棒に戻すには：rotate 0（または rotate 90 を削除）。
title 販路別の売上（90°回転）
rotate 90
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series オンライン : 120, 145, 165, 190
series 店舗 : 85, 95, 110, 130
series パートナー : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% 積み上げ棒：系列は横並びではなく一つの柱を共有します。
%% stacked / bars stacked / layout stacked
%% 再び横並び：stacked off または bars grouped
%% 正の値はゼロから上へ、負の値は下へ伸びます。
title 売上の内訳
stacked
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series 製品 : 80, 90, 70, 110
series サービス : 50, 60, 55, 70
series パートナー : 30, 25, 40, 35`,
    clusteredMono: `series
%% 白黒：系列は色相ではなく明るさで区別します。
%% 明示した colors は灰色の階調を上書きするので、この例では書きません。
title 売上、白黒
mono
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 200
grid 50
series オンライン : 120, 145, 165, 190
series 店舗 : 85, 95, 110, 130
series パートナー : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% 反転した白黒：暗いキャンバス上の薄い灰色の棒。
%% 暗いテーマと暗いスライド向けです。mono off で色が戻ります。
title 売上、反転白黒
mono invert
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 200
grid 50
series オンライン : 120, 145, 165, 190
series 店舗 : 85, 95, 110, 130
series パートナー : 45, 60, 75, 95`,
    seriesLines: `series
%% 棒の上の線：line ラベル : 値1, 値2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot。既定は solid、太さ 1.75。
%% 空の枠、"-"、または null でカテゴリを飛ばします。線は両側の点をつなぎます。
%% ラベルはプロットの右、最後に与えた点の高さに置きます。
title 実績と目安
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 220
grid 20
labels above
series 実績 : 120, 145, 165, 190
line 実線 : 110, 130, 150, 180 color=#0969da style=solid width=2
line 破線 : 100, -, 160, 175 color=#8250df style=dash
line 点線 : 90, , 155, 170 color=#2da44e style=dot width=1
line 一点鎖線 : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% 番号のない cagr は最初の棒から最後の棒へ矢印を引きます。
title 売上の成長
categories 2021, 2022, 2023, 2024
y "百万米ドル" 0 --> 220
grid 20
series 売上 : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% 棒の範囲 1–3、4–6、7–9 で異なる cagr のオプション。
%% 棒の番号は 1 から。連続する cagr は直前の系列に属します。
%% format="0%"        整数、既定
%% format="0.0%"      小数 1 桁。パターンの "+" は正符号を付ける
%% format="0.00"      比率。百分率記号は付けない
%% prefix="CAGR: "    数値の前の文字
%% label="目標"       楕円の文字をそのまま。計算しない（そのとき prefix は無視）
title 範囲別の CAGR
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "百万米ドル" 0 --> 220
grid 20
series オンライン : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="目標"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% 軸の分割：区間 200..700 を切り取り、小さな棒を大きく見せます。
%% 分割をまたぐ棒は切れ目で分かれ、線上にジグザグが付きます。
%% 構文は waterfall と同じ：break <後> --> <前> ["ラベル"]
title 軸を分割した売上
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 1000
grid 100
break 200 --> 700 "軸の分割"
series オンライン : 120, 180, 860, 240
series 店舗 : 80, 140, 790, 190`,
    seriesThresholds: `series
%% 水平線 — 計画、目標、しきい値。
%% これはカテゴリをまたぐ折れ線ではありません。水準線にコロンはありません。
%%
%%   line <値> ["ラベル"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line ラベル : 値1, 値2, …   — 引き続き棒の上の折れ線
%%
%% 線はプロットを横切り、ラベルは右、文字の後ろは空けます。
title 計画と比べた売上
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 250
grid 50
line 160 "計画"
line 200 "目標" color=#cf222e width=2
line 120 "しきい値" style=dot width=1
series 実績 : 120, 145, 165, 190
series 目安 : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% 系列名と線のラベルは書かなくて構いません。
%%   series : 値1, 値2, …     凡例の行がない棒
%%   line : 値1, 値2, …       右に見出しのない線
%% color と style はそのまま指定できます。
title 名前のない四半期
categories Q1, Q2, Q3, Q4
y "百万米ドル" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
  hi: {
    waterfall: `waterfall
%% मूल जलप्रपात: प्रारंभ, वृद्धि, गिरावट, कुल।
%% डेटा पंक्तियाँ: <चिह्न><संख्या> : <लेबल>
%%   =120 : Q1   निरपेक्ष मान (प्रारंभ या कुल)
%%   = : H1 कुल  अकेला "=" — चल कुल को दोहराता है
%%   +180 : Q2   वृद्धि
%%   -60 : Q3    कमी
%% और सुविधाएँ उदाहरणों में: «अक्ष विराम», «कई शृंखलाएँ», «लेबल»।
%% ध्यान दें: स्तंभों के बीच की डैश रेखाएँ कनेक्टर हैं (डिफ़ॉल्ट चालू)।
%%       बंद करने के लिए: connectors off
title आय 2026
y "मिलियन डॉलर" 0 --> 500
grid 100
=120 : Q1 प्रारंभ
+180 : Q2 वृद्धि
-60 : Q3 च्युति
= : H1 कुल
+240 : Q4
= : वर्ष का कुल`,
    waterfallBreak: `waterfall
%% अक्ष विराम: अंतर 300..800 काट दिया जाता है, ताकि छोटे चरण बड़े दिखें।
%% विराम को पार करने वाला स्तंभ टुकड़ों में बनता है, रेखा पर टेढ़े निशान के साथ।
title अक्ष विराम के साथ आय
y "मिलियन डॉलर" 0 --> 1000
grid 100
break 300 --> 800 "अक्ष विराम"
=120 : Q1
+180 : Q2
+700 : Q3
= : कुल`,
    waterfallMulti: `waterfall
%% कई शृंखलाएँ: प्रत्येक समूह का अपना आधार रंग होता है,
%% वृद्धि 20% हल्की होती है, कमी 25% गहरी।
title योजना बनाम वास्तविक
y "मिलियन डॉलर" 0 --> 400
grid 100
series योजना color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : कुल
series वास्तविक color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : कुल`,
    waterfallLabels: `waterfall
%% लेबल और रेखाएँ — दो बातें जो सबसे अधिक छूट जाती हैं।
%%
%% 1) inside और above चुनते हैं कि मान का लेबल कहाँ लिखा जाए।
%%    झंडे डेटा पंक्ति के अंत में होते हैं; क्रम मायने नहीं रखता, न ही अक्षरों का आकार।
%%    एक झंडा दूसरे को नहीं बनाता, इसलिए अकेला inside ऊपर की नकल नहीं है:
%%      =90 : Q1 inside           केवल भीतर (स्तंभ के ऊपर कुछ नहीं)
%%      -25 : Q3 above            केवल स्तंभ के ऊपर
%%    दोनों एक साथ हो सकते हैं, और प्रत्येक का अपना पाठ हो सकता है:
%%      +60 : Q2 inside="60" above="+60 मिलियन"
%%    दोनों स्थानों पर वही संख्या:
%%      = : कुल inside above
%%    एक साथ हर स्तंभ के लिए:  labels inside | above | both | none
%%    भीतरी लेबल सफेद है, स्तंभ के ऊपर वाला धूसर।
%%    जो पाठ भीतर नहीं समाता, वह स्तंभ के ऊपर एक ही प्रति में चला जाता है।
%%
%% 2) स्तंभों के बीच की रेखाएँ अपनी ही पंक्ति पर एक निर्देश हैं (झंडा नहीं):
%%      connectors on    चालू (डिफ़ॉल्ट चालू)
%%      connectors off   बंद
%%    डैश रेखा स्तंभ के कार्यशील किनारे से अगले स्तंभ तक जाती है:
%%    वृद्धि — ऊपर से, गिरावट — नीचे से। अलग ऊँचाइयाँ
%%    एक सीढ़ी से जुड़ती हैं।
%%
%% 3) जब किसी स्थान का अपना पाठ न हो, साझा पाठ:  label="+60 मिलियन"
%%    कोई लेबल ही नहीं:                                         no-label
%%
%% 4) रंग: colors total= increase= decrease=
title लेबल और रेखाएँ
y "मिलियन डॉलर" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 मिलियन"
-25 : Q3 above
= : कुल inside above`,
    waterfallNoLines: `waterfall
%% रेखाएँ बंद — वही जलप्रपात जो «लेबल और रेखाएँ» में है,
%% पर डैश कनेक्टर के बिना: प्रस्तुति के लिए साफ चित्र।
%%
%% एकमात्र अंतर एक पंक्ति है:  connectors off
%% (कनेक्टर डिफ़ॉल्ट रूप से चालू हैं, इसलिए "off" लिखना आवश्यक है)
%%
%% उदाहरण «जलप्रपात — लेबल और रेखाएँ» से तुलना करें:
%% वहाँ connectors on है और डेटा बिल्कुल वही है।
title रेखाओं के बिना लेबल
y "मिलियन डॉलर" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 मिलियन"
-25 : Q3 above
= : कुल inside above`,
    waterfallThresholds: `waterfall
%% लेबल वाली क्षैतिज रेखाएँ — योजना स्तर, लक्ष्य, सीमा।
%%
%% निर्देश अपनी ही पंक्ति पर होता है (डेटा पंक्ति का झंडा नहीं):
%%   line <मान> ["लेबल"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "योजना"                 डिफ़ॉल्ट डैश, थीम का रंग
%%   line 400 "लक्ष्य" color=#cf222e   अपना रंग
%%   line 250 "सीमा" style=dot width=1
%%
%% रेखा पूरे प्लॉट पर जाती है; लेबल अंतिम स्तंभ के दाईं ओर रहता है,
%% और एक खाली जगह के साथ, ताकि रेखा पाठ को काटे नहीं।
%% जितनी चाहें रेखाएँ — प्रत्येक के लिए एक पंक्ति।
title योजना के मुकाबले आय
y "मिलियन डॉलर" 0 --> 500
grid 100
line 350 "योजना"
line 400 "लक्ष्य" color=#cf222e width=2
line 250 "सीमा" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : H1 कुल
+240 : Q4
= : वर्ष का कुल`,
    waterfallMono: `waterfall
%% श्याम-श्वेत मोड: रंग की जरूरत नहीं, स्तंभ हल्के-गहरे से अलग होते हैं।
%% छपाई और बिना रंग के दस्तावेज़ों के लिए उपयोगी।
%% अपने रंग यहाँ भी चलते हैं — वे धूसर पैमाना ढक देते हैं।
title श्याम-श्वेत मोड (mono)
mono
y "मिलियन डॉलर" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : H1 कुल
+110 : Q4
= : वर्ष का कुल`,
    bubble: `bubble
%% bubble की हर सुविधा का प्रदर्शन: x/y अक्ष, आकार का संकेत, चतुर्थांश
%% और उनके लेबल, रंग समूह और फ़ॉन्ट आकार।
%% लेबल बुलबुले में समाए तो भीतर रहता है; नहीं तो नीचे, पूरा, बिना "…"।
title BCG मैट्रिक्स: पूर्ण लेबल
x "बाज़ार हिस्सेदारी" 0 --> 10
y "बाज़ार वृद्धि, %" 0 --> 30
size "राजस्व"
quadrants तारे, प्रश्न, नकदी गाय, कुत्ते
mid x=5 y=12
fontsize 12
data
उत्पाद A : x=8.2, y=22, size=340, group=Software
उत्पाद B : x=2.1, y=25, size=180, group=Software
उत्पाद C : x=7.4, y=4, size=520, group=Hardware
उत्पाद D : x=1.5, y=3, size=90, group=Hardware
उत्पाद E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title दिन के अनुसार भार
x सोम, मंगल, बुध, गुरु, शुक्र
y सुबह, दिन, शाम
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
सुबह : 20, 35, 50, 30, 25
दिन : 60, 75, 85, 70, 55
शाम : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% भराव color=#hex है (या fill=)। सीमा border=#hex और style=solid|dash|dot|dashdot है।
%% कुंजियाँ किसी भी क्रम में जुड़ सकती हैं। [कोष्ठक] के भीतर color= लेबल का हिस्सा रहता है।
मुख्यकार्यकारी [मुख्य कार्यकारी अधिकारी\\nअर्जुन शर्मा] color=#8250df
तकनीकीप्रमुख [मुख्य तकनीकी अधिकारी\\nअनन्या वर्मा] color=#ddf4ff border=#0969da
वित्तीयप्रमुख [मुख्य वित्तीय अधिकारी\\nरिया गुप्ता] border=#9a6700 style=dash
बैकएंड [बैकएंड इंजीनियरिंग प्रमुख\\nसमीर पटेल]
फ्रंटएंड [फ्रंटएंड इंजीनियरिंग प्रमुख\\nमेघा जोशी]
मुख्यकार्यकारी -> तकनीकीप्रमुख
मुख्यकार्यकारी -> वित्तीयप्रमुख
तकनीकीप्रमुख -> बैकएंड
तकनीकीप्रमुख -> फ्रंटएंड
वित्तीयप्रमुख -.-> बैकएंड`,
    ev: `ev
title बजट का अर्जित मूल्य
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% बॉक्स आरेख: चतुर्थक Q1/Q2/Q3, मूँछें, माध्य का समचतुर्भुज और अपवाद।
%% श्रेणी की पंक्ति लिखने के दो तरीके:
%%   1) स्पष्ट पाँच-संख्या सार: श्रेणी : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) कच्चे अवलोकन:      श्रेणी : values=20, 28, 35, 42, 50, 62, 145 color=#hex (Tukey 1.5*IQR मूँछें)
%% रंग के विकल्प:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — श्याम-श्वेत छपाई मोड
title सेवा विलंबता का वितरण
y "मि.से." 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
API गेटवे : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
भुगतान : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
खोज : values=12, 22, 28, 34, 38, 45, 52, 68, 148
विश्लेषण : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% वृक्ष मानचित्र: प्रत्येक आयत का क्षेत्रफल उसके संख्यात्मक भार के अनुपात में है।
%% पंक्ति वाक्य: समूह / मद : <भार> [color=#hex]
%% labels निर्देश: values | percent | both | none (डिफ़ॉल्ट both — मान और % हिस्सा)।
%% रंग विकल्प: colors s1=#hex s2=#hex ..., समूह या मद पर color=#hex, या mono।
title आईटी बजट का विवरण (मिलियन डॉलर)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
अवसंरचना / क्लाउड और K8s : 420
अवसंरचना / नेटवर्क और CDN : 180
अवसंरचना / भंडारण : 140
इंजीनियरिंग / बैकएंड और API : 360
इंजीनियरिंग / वेब और मोबाइल : 260
इंजीनियरिंग / QA और स्वचालित परीक्षण : 140
डेटा और एआई / DWH भंडार : 240
डेटा और एआई / ML मॉडल : 160 color=#0f766e`,
    radar: `radar
%% रडार / मकड़ी आरेख: N >= 3 अक्षों पर कई शृंखलाओं की तुलना।
%% निर्देश:
%%   axes अक्ष 1, अक्ष 2, ...  अरों के लेबल (कम से कम 3)
%%   scale 0 --> 100           अरों पर मानों की सीमा
%%   rings 5                   संकेंद्रित बहुभुज वलयों की संख्या
%%   fill 0.22                 बहुभुज भराव की अपारदर्शिता (0..1 या off)
%%   dots on|off               शीर्षों पर चिह्न
%%   colors s1=#hex s2=#hex    शृंखला पैलेट (या प्रत्येक पर color=#hex, या mono)
title क्लाउड प्लेटफ़ॉर्म की तुलना
axes प्रदर्शन, विश्वसनीयता, सुरक्षा, डेवलपर अनुभव, पारिस्थितिकी, लागत दक्षता
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series प्लेटफ़ॉर्म A : 90, 92, 88, 82, 95, 70
series प्लेटफ़ॉर्म B : 78, 85, 94, 90, 80, 86
series प्लेटफ़ॉर्म C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% वोरोनोई विभाजन: समतल को निकटतम केंद्र की उत्तल कोशिकाओं में बाँटता है।
%% निर्देश:
%%   x "लेबल" min --> max     X अक्ष (डिफ़ॉल्ट 0 --> 100)
%%   y "लेबल" min --> max     Y अक्ष (डिफ़ॉल्ट 0 --> 100)
%%   sites on|off              केंद्र बिंदु बनाएँ
%%   labels on|off             कोशिकाओं के लेबल केंद्रक पर बनाएँ
%%   colors s1=#hex s2=#hex    समूह/कोशिका पैलेट (या प्रत्येक बिंदु पर color=#hex, या mono)
title लॉजिस्टिक्स केंद्रों के कवरेज क्षेत्र
x "पश्चिम — पूर्व, किमी" 0 --> 100
y "दक्षिण — उत्तर, किमी" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
उत्तरी केंद्र : x=48, y=82, group=ट्रंक
दक्षिणी केंद्र : x=52, y=18, group=ट्रंक
पश्चिमी टर्मिनल : x=20, y=54, group=क्षेत्र
पूर्वी टर्मिनल : x=82, y=56, group=क्षेत्र
केंद्रीय डिपो : x=50, y=50, group=कोर
दक्षिण-पश्चिम : x=24, y=22, group=क्षेत्र, color=#f97316`,
    clustered: `series
%% शृंखला आरेख: प्रत्येक श्रेणी में कई शृंखलाएँ साथ-साथ समूहित करता है।
%% आरेख को 90 डिग्री घुमाने (क्षैतिज पट्टियाँ) के लिए जोड़ें: rotate 90
%% निर्देश:
%%   categories C1, C2, ...    श्रेणी लेबल (उपनाम: x C1, C2, ...)
%%   y "लेबल" min --> max     मान अक्ष का पैमाना
%%   labels above|inside|none  मानों के लेबल
%%   colors s1=#hex s2=#hex    शृंखला पैलेट (या series पंक्ति पर color=#hex, या mono)
title बिक्री माध्यम के अनुसार आय
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series ऑनलाइन : 120, 145, 165, 190
series खुदरा : 85, 95, 110, 130
series साझेदार : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% 90 डिग्री घुमाया शृंखला आरेख (rotate 90)।
%% निर्देश rotate 90 (या orientation horizontal) अक्षों की अदला-बदली करता है:
%% श्रेणियाँ बाईं ओर ऊपर से नीचे चलती हैं, और पट्टियाँ बाएँ से दाएँ बढ़ती हैं।
%% पहली श्रेणी को नीचे रखें: invert y (वापस: invert y off)।
%% ऊर्ध्वाधर पट्टियों पर लौटें: rotate 0 (या rotate 90 हटाएँ)।
title माध्यम के अनुसार आय (90° घुमाव)
rotate 90
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series ऑनलाइन : 120, 145, 165, 190
series खुदरा : 85, 95, 110, 130
series साझेदार : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% स्टैक पट्टियाँ: शृंखलाएँ साथ-साथ नहीं, एक ही स्तंभ साझा करती हैं।
%% stacked / bars stacked / layout stacked
%% फिर साथ-साथ: stacked off या bars grouped
%% धनात्मक मान शून्य से ऊपर बढ़ते हैं, ऋणात्मक नीचे।
title आय का मिश्रण
stacked
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series उत्पाद : 80, 90, 70, 110
series सेवाएँ : 50, 60, 55, 70
series साझेदार : 30, 25, 40, 35`,
    clusteredMono: `series
%% श्याम-श्वेत: शृंखलाएँ रंग से नहीं, हल्के-गहरे से अलग होती हैं।
%% स्पष्ट colors धूसर पैमाना ढक देते हैं, इसलिए यह उदाहरण उन्हें नहीं लिखता।
title आय, श्याम-श्वेत
mono
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 200
grid 50
series ऑनलाइन : 120, 145, 165, 190
series खुदरा : 85, 95, 110, 130
series साझेदार : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% उलटा श्याम-श्वेत: गहरे कैनवास पर हल्के धूसर स्तंभ।
%% गहरी थीम और गहरी स्लाइडों के लिए। mono off रंग लौटाता है।
title आय, उलटा श्याम-श्वेत
mono invert
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 200
grid 50
series ऑनलाइन : 120, 145, 165, 190
series खुदरा : 85, 95, 110, 130
series साझेदार : 45, 60, 75, 95`,
    seriesLines: `series
%% स्तंभों के ऊपर एक रेखा: line लेबल : म1, म2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot। डिफ़ॉल्ट solid और मोटाई 1.75।
%% खाली स्थान, "-", या null से एक श्रेणी छोड़ें। रेखा दोनों ओर के बिंदु जोड़ती है।
%% लेबल प्लॉट के दाईं ओर, अंतिम दिए बिंदु की ऊँचाई पर रहता है।
title वास्तविक और संदर्भ
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 220
grid 20
labels above
series वास्तविक : 120, 145, 165, 190
line सतत : 110, 130, 150, 180 color=#0969da style=solid width=2
line डैश : 100, -, 160, 175 color=#8250df style=dash
line बिंदु : 90, , 155, 170 color=#2da44e style=dot width=1
line डैश-बिंदु : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% बिना संख्या के cagr पहली पट्टी से अंतिम पट्टी तक तीर खींचता है।
title आय की वृद्धि
categories 2021, 2022, 2023, 2024
y "मिलियन डॉलर" 0 --> 220
grid 20
series राजस्व : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% पट्टी सीमाओं 1–3, 4–6 और 7–9 पर अलग-अलग cagr विकल्प।
%% पट्टी संख्या 1 से शुरू होती है। लगातार cagr ठीक ऊपर वाली शृंखला के हैं।
%% format="0%"        पूर्णांक, डिफ़ॉल्ट
%% format="0.0%"      एक दशमलव; पैटर्न में "+" धन चिह्न जोड़ता है
%% format="0.00"      अनुपात, बिना प्रतिशत चिह्न
%% prefix="CAGR: "    संख्या से पहले का पाठ
%% label="लक्ष्य"       अंडाकार का पाठ जैसा है, बिना गणना (तब prefix नहीं लिखा जाता)
title सीमा के अनुसार CAGR
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "मिलियन डॉलर" 0 --> 220
grid 20
series ऑनलाइन : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="लक्ष्य"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% अक्ष विराम: अंतर 200..700 काट दिया जाता है, ताकि छोटी पट्टियाँ बड़ी दिखें।
%% विराम को पार करने वाली पट्टी टुकड़ों में बनती है, रेखा पर टेढ़े निशान के साथ।
%% वाक्य waterfall जैसा: break <बाद> --> <पहले> ["लेबल"]
title अक्ष विराम वाली आय
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 1000
grid 100
break 200 --> 700 "अक्ष विराम"
series ऑनलाइन : 120, 180, 860, 240
series खुदरा : 80, 140, 790, 190`,
    seriesThresholds: `series
%% क्षैतिज रेखाएँ — योजना, लक्ष्य, सीमा।
%% यह श्रेणियों के पार की रेखा नहीं है: स्तर रेखा में कोलन नहीं होता।
%%
%%   line <मान> ["लेबल"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line लेबल : म1, म2, …   — फिर भी स्तंभों के ऊपर की टूटी रेखा
%%
%% रेखा प्लॉट पार करती है; लेबल दाईं ओर है, पाठ के पीछे एक खाली जगह के साथ।
title योजना की तुलना में आय
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 250
grid 50
line 160 "योजना"
line 200 "लक्ष्य" color=#cf222e width=2
line 120 "सीमा" style=dot width=1
series वास्तविक : 120, 145, 165, 190
series संदर्भ : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% शृंखला का नाम और रेखा का लेबल छोड़ा जा सकता है।
%%   series : म1, म2, …     संकेत में बिना पंक्ति के स्तंभ
%%   line : म1, म2, …       दाईं ओर बिना शीर्षक की रेखा
%% color और style फिर भी लागू होते हैं।
title बिना नाम की तिमाहियाँ
categories Q1, Q2, Q3, Q4
y "मिलियन डॉलर" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
  pt: {
    waterfall: `waterfall
%% Cascata básica: início, crescimento, queda e soma.
%% Linhas de dados: <sinal><número> : <rótulo>
%%   =120 : Q1   valor absoluto (início ou soma)
%%   = : Soma S1  "=" sozinho — repete o total acumulado
%%   +180 : Q2   aumento
%%   -60 : Q3    redução
%% Mais recursos: exemplos «quebra de eixo», «várias séries», «rótulos».
%% NOTA: as linhas tracejadas entre as barras são conectores (ligados por padrão).
%%       Para desligar: connectors off
title Receita 2026
y "mi USD" 0 --> 500
grid 100
=120 : Q1 início
+180 : Q2 crescimento
-60 : Q3 evasão
= : Soma S1
+240 : Q4
= : Soma do ano`,
    waterfallBreak: `waterfall
%% Quebra de eixo: o trecho 300..800 é CORTADO para os passos pequenos ficarem maiores.
%% Uma barra que atravessa a quebra é desenhada em pedaços, com um zigue-zague na linha.
title Receita com quebra de eixo
y "mi USD" 0 --> 1000
grid 100
break 300 --> 800 "quebra de eixo"
=120 : Q1
+180 : Q2
+700 : Q3
= : Soma`,
    waterfallMulti: `waterfall
%% Várias séries: cada grupo tem a própria cor de base,
%% aumentos 20% mais claros, quedas 25% mais escuras.
title Plano e realizado
y "mi USD" 0 --> 400
grid 100
series Plano color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Soma
series Realizado color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Soma`,
    waterfallLabels: `waterfall
%% RÓTULOS E LINHAS — as duas coisas que mais faltam.
%%
%% 1) inside e above escolhem onde fica o rótulo do valor.
%%    As bandeiras ficam no fim da linha de dados; a ordem não importa, nem maiúsculas.
%%    Uma bandeira sozinha não desenha a outra, então inside isolado não é copiado acima:
%%      =90 : Q1 inside           só dentro (nada acima da barra)
%%      -25 : Q3 above            só acima da barra
%%    As duas juntas são permitidas, e cada uma pode ter o próprio texto:
%%      +60 : Q2 inside="60" above="+60 mi"
%%    As duas posições com o mesmo número:
%%      = : Soma inside above
%%    Para todas as barras de uma vez:  labels inside | above | both | none
%%    O rótulo interno é branco; o de cima da barra é cinza.
%%    O texto que não cabe dentro da barra sobe para cima dela, uma vez só.
%%
%% 2) As LINHAS entre barras são uma DIRETIVA na própria linha (não uma bandeira):
%%      connectors on    ligar (ligados por padrão)
%%      connectors off   desligar
%%    A linha tracejada sai da borda útil de uma barra até a seguinte:
%%    crescimento — de cima, queda — de baixo. Níveis diferentes
%%    se unem por um degrau.
%%
%% 3) Texto compartilhado quando a posição não tem o seu:  label="+60 mi"
%%    Sem rótulo nenhum:                                        no-label
%%
%% 4) Cores: colors total= increase= decrease=
title Rótulos e linhas
y "mi USD" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 mi"
-25 : Q3 above
= : Soma inside above`,
    waterfallNoLines: `waterfall
%% LINHAS DESLIGADAS — a mesma cascata de «rótulos e linhas»,
%% mas sem os conectores tracejados: uma imagem limpa para apresentar.
%%
%% A única diferença é uma linha:  connectors off
%% (os conectores vêm ligados por padrão, então "off" precisa ser escrito)
%%
%% Compare com o exemplo «Cascata — rótulos e linhas»:
%% lá está connectors on e exatamente os mesmos dados.
title Rótulos sem linhas
y "mi USD" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 mi"
-25 : Q3 above
= : Soma inside above`,
    waterfallThresholds: `waterfall
%% LINHAS HORIZONTAIS COM RÓTULO — nível do plano, meta, limiar.
%%
%% A diretiva fica na PRÓPRIA linha (não é uma bandeira numa linha de dados):
%%   line <valor> ["rótulo"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "plano"                 tracejada por padrão, cor do tema
%%   line 400 "meta" color=#cf222e   cor própria
%%   line 250 "limiar" style=dot width=1
%%
%% A linha cruza o gráfico todo; o rótulo fica à direita da última barra,
%% com um vão para a linha não riscar o texto.
%% Quantas linhas quiser — uma por linha.
title Receita frente ao plano
y "mi USD" 0 --> 500
grid 100
line 350 "plano"
line 400 "meta" color=#cf222e width=2
line 250 "limiar" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : Soma S1
+240 : Q4
= : Soma do ano`,
    waterfallMono: `waterfall
%% Modo preto e branco: não precisa de cores, as barras diferem pela claridade.
%% Útil para impressão e para documentos sem cor.
%% Cores próprias ainda funcionam aqui — elas substituem a escala de cinza.
title Modo preto e branco (mono)
mono
y "mi USD" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : Soma S1
+110 : Q4
= : Soma do ano`,
    bubble: `bubble
%% Demonstração de tudo o que o bubble faz: eixos x/y, legenda do tamanho, quadrantes
%% e seus rótulos, grupos de cor e tamanho da letra.
%% O rótulo fica dentro da bolha se couber; senão abaixo, inteiro, sem "…".
title Matriz BCG: rótulos completos
x "Participação de mercado" 0 --> 10
y "Crescimento do mercado, %" 0 --> 30
size "Receita"
quadrants Estrelas, Interrogações, Vacas leiteiras, Cães
mid x=5 y=12
fontsize 12
data
Produto A : x=8.2, y=22, size=340, group=Software
Produto B : x=2.1, y=25, size=180, group=Software
Produto C : x=7.4, y=4, size=520, group=Hardware
Produto D : x=1.5, y=3, size=90, group=Hardware
Produto E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title Carga por dia
x Seg, Ter, Qua, Qui, Sex
y Manhã, Dia, Entardecer
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Manhã : 20, 35, 50, 30, 25
Dia : 60, 75, 85, 70, 55
Entardecer : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% O preenchimento é color=#hex (ou fill=). A borda é border=#hex e style=solid|dash|dot|dashdot.
%% As chaves se combinam em qualquer ordem. Dentro de [colchetes] color= continua parte do rótulo.
DiretorGeral [Diretor-geral\\nAndré Moraes] color=#8250df
DiretorTecnologia [Diretor de tecnologia\\nElena Costa] color=#ddf4ff border=#0969da
DiretoraFinanceira [Diretora financeira\\nCamila Rocha] border=#9a6700 style=dash
Servidor [Chefe de engenharia de servidor\\nSamuel Pereira]
Cliente [Chefe de engenharia de cliente\\nClara Duarte]
DiretorGeral -> DiretorTecnologia
DiretorGeral -> DiretoraFinanceira
DiretorTecnologia -> Servidor
DiretorTecnologia -> Cliente
DiretoraFinanceira -.-> Servidor`,
    ev: `ev
title Valor agregado do orçamento
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% Gráfico de caixa: quartis Q1/Q2/Q3, bigodes, losango da média e valores discrepantes.
%% Duas formas de definir a linha de uma categoria:
%%   1) Resumo explícito de cinco números: Categoria : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) Observações brutas:      Categoria : values=20, 28, 35, 42, 50, 62, 145 color=#hex (bigodes de Tukey 1.5*IQR)
%% Opções de cor:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — modo de impressão em preto e branco
title Distribuição da latência dos serviços
y "milissegundos" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
Gateway de API : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
Pagamentos : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
Busca : values=12, 22, 28, 34, 38, 45, 52, 68, 148
Análise : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% Mapa de árvore: a área de cada retângulo é proporcional ao peso numérico.
%% Sintaxe da linha: Grupo / Item : <peso> [color=#hex]
%% Diretiva labels: values | percent | both | none (o padrão é both — valor e fatia em %).
%% Opções de cor: colors s1=#hex s2=#hex ..., color=#hex num grupo ou item, ou mono.
title Composição do orçamento de TI (mi USD)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
Infraestrutura / Nuvem e K8s : 420
Infraestrutura / Rede e CDN : 180
Infraestrutura / Armazenamento : 140
Engenharia / Servidor e API : 360
Engenharia / Web e celular : 260
Engenharia / QA e automação : 140
Dados e IA / Armazém DWH : 240
Dados e IA / Modelos de ML : 160 color=#0f766e`,
    radar: `radar
%% Gráfico radar / aranha: compara várias séries em N >= 3 eixos.
%% Diretivas:
%%   axes Eixo 1, Eixo 2, ...  rótulos dos raios (pelo menos 3)
%%   scale 0 --> 100           intervalo de valores ao longo dos raios
%%   rings 5                   número de anéis poligonais concêntricos
%%   fill 0.22                 opacidade do preenchimento do polígono (0..1 ou off)
%%   dots on|off               marcas nos vértices
%%   colors s1=#hex s2=#hex    paleta das séries (ou color=#hex por série, ou mono)
title Comparação de plataformas de nuvem
axes Desempenho, Confiabilidade, Segurança, Experiência DX, Ecossistema, Eficiência de custo
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series Plataforma A : 90, 92, 88, 82, 95, 70
series Plataforma B : 78, 85, 94, 90, 80, 86
series Plataforma C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% Tesselação de Voronoi: parte o plano em células convexas do centro mais próximo.
%% Diretivas:
%%   x "rótulo" min --> max     eixo X (padrão 0 --> 100)
%%   y "rótulo" min --> max     eixo Y (padrão 0 --> 100)
%%   sites on|off              desenhar os pontos centrais
%%   labels on|off             desenhar os rótulos das células no centroide
%%   colors s1=#hex s2=#hex    paleta de grupos/células (ou color=#hex por ponto, ou mono)
title Zonas de cobertura dos polos logísticos
x "Oeste — Leste, km" 0 --> 100
y "Sul — Norte, km" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
Polo norte : x=48, y=82, group=Tronco
Polo sul : x=52, y=18, group=Tronco
Terminal oeste : x=20, y=54, group=Região
Terminal leste : x=82, y=56, group=Região
Depósito central : x=50, y=50, group=Núcleo
Sudoeste : x=24, y=22, group=Região, color=#f97316`,
    clustered: `series
%% Diagrama de séries: agrupa várias séries lado a lado em cada categoria.
%% Para girar o gráfico 90 graus (barras horizontais), acrescente: rotate 90
%% Diretivas:
%%   categories C1, C2, ...    rótulos de categoria (alias: x C1, C2, ...)
%%   y "rótulo" min --> max     escala do eixo de valores
%%   labels above|inside|none  rótulos dos valores
%%   colors s1=#hex s2=#hex    paleta das séries (ou color=#hex na linha series, ou mono)
title Receita por canal de vendas
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series Loja virtual : 120, 145, 165, 190
series Varejo : 85, 95, 110, 130
series Parceiros : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% Diagrama de séries GIRADO 90 GRAUS (rotate 90).
%% A diretiva rotate 90 (ou orientation horizontal) troca os eixos:
%% as categorias descem de cima para baixo à esquerda, e as barras crescem da esquerda para a direita.
%% Coloque a primeira categoria embaixo com: invert y (desfaça com invert y off).
%% Volte às barras verticais com: rotate 0 (ou remova rotate 90).
title Receita por canal (rotação 90°)
rotate 90
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series Loja virtual : 120, 145, 165, 190
series Varejo : 85, 95, 110, 130
series Parceiros : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% Barras empilhadas: as séries compartilham uma coluna em vez de ficarem lado a lado.
%% stacked / bars stacked / layout stacked
%% Lado a lado de novo: stacked off ou bars grouped
%% Valores positivos crescem para cima a partir do zero, os negativos para baixo.
title Composição da receita
stacked
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series Produto : 80, 90, 70, 110
series Serviços : 50, 60, 55, 70
series Parceiros : 30, 25, 40, 35`,
    clusteredMono: `series
%% Preto e branco: as séries diferem pela claridade, não pelo matiz.
%% colors explícitos substituem a escala de cinza, por isso este exemplo não os inclui.
title Receita, preto e branco
mono
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 200
grid 50
series Loja virtual : 120, 145, 165, 190
series Varejo : 85, 95, 110, 130
series Parceiros : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% Preto e branco invertido: barras cinza-claro sobre uma tela escura.
%% Para temas escuros e slides escuros. mono off devolve a cor.
title Receita, preto e branco invertido
mono invert
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 200
grid 50
series Loja virtual : 120, 145, 165, 190
series Varejo : 85, 95, 110, 130
series Parceiros : 45, 60, 75, 95`,
    seriesLines: `series
%% Uma linha sobre as barras: line Rótulo : n1, n2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot. O padrão é solid e espessura 1.75.
%% Pule uma categoria com um espaço vazio, "-", ou null. A linha une os pontos dos dois lados.
%% O rótulo fica à direita do gráfico, na altura do último ponto informado.
title Realizados e referências
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 220
grid 20
labels above
series Realizado : 120, 145, 165, 190
line Contínua : 110, 130, 150, 180 color=#0969da style=solid width=2
line Tracejada : 100, -, 160, 175 color=#8250df style=dash
line Pontilhada : 90, , 155, 170 color=#2da44e style=dot width=1
line Traço-ponto : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% Um cagr sem números desenha uma seta da primeira barra até a última.
title Crescimento da receita
categories 2021, 2022, 2023, 2024
y "mi USD" 0 --> 220
grid 20
series Receita : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% Opções diferentes de cagr nos intervalos de barras 1–3, 4–6 e 7–9.
%% A numeração das barras começa em 1. Vários cagr seguidos pertencem à série logo acima.
%% format="0%"        inteiro, o padrão
%% format="0.0%"      uma casa decimal; "+" no padrão acrescenta o sinal de mais
%% format="0.00"      uma razão, sem sinal de porcentagem
%% prefix="CAGR: "    texto antes do número
%% label="meta"       texto do oval como está, sem cálculo (prefix é então ignorado)
title CAGR por intervalo
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "mi USD" 0 --> 220
grid 20
series Loja virtual : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="meta"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% Quebra de eixo: o trecho 200..700 é CORTADO para as barras pequenas ficarem maiores.
%% Uma barra que atravessa a quebra é desenhada em pedaços, com um zigue-zague na linha.
%% A mesma sintaxe do waterfall: break <depois> --> <antes> ["rótulo"]
title Receita com uma quebra de eixo
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 1000
grid 100
break 200 --> 700 "quebra de eixo"
series Loja virtual : 120, 180, 860, 240
series Varejo : 80, 140, 790, 190`,
    seriesThresholds: `series
%% LINHAS HORIZONTAIS — plano, meta, limiar.
%% Isto NÃO é uma linha através das categorias: uma linha de nível não tem dois-pontos.
%%
%%   line <valor> ["rótulo"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line Rótulo : n1, n2, …   — continua sendo uma polilinha sobre as barras
%%
%% A linha cruza o gráfico; o rótulo fica à direita, com um vão atrás do texto.
title Receita em relação ao plano
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 250
grid 50
line 160 "plano"
line 200 "meta" color=#cf222e width=2
line 120 "limiar" style=dot width=1
series Realizado : 120, 145, 165, 190
series Referência : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% O nome da série e o rótulo da linha podem ficar de fora.
%%   series : n1, n2, …     barras sem linha na legenda
%%   line : n1, n2, …       uma linha sem legenda à direita
%% color e style continuam valendo.
title Trimestres sem nomes
categories Q1, Q2, Q3, Q4
y "mi USD" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
  de: {
    waterfall: `waterfall
%% Einfacher Wasserfall: Start, Wachstum, Rückgang, Summe.
%% Datenzeilen: <Vorzeichen><Zahl> : <Beschriftung>
%%   =120 : Q1   absoluter Wert (Start oder Summe)
%%   = : H1-Summe  bloßes "=" — wiederholt die laufende Summe
%%   +180 : Q2   Zuwachs
%%   -60 : Q3    Rückgang
%% Weitere Möglichkeiten: Beispiele «Achsenbruch», «mehrere Serien», «Beschriftungen».
%% HINWEIS: die gestrichelten Linien zwischen den Balken sind Verbinder (standardmäßig an).
%%       Ausschalten mit: connectors off
title Umsatz 2026
y "Mio. USD" 0 --> 500
grid 100
=120 : Q1 Start
+180 : Q2 Wachstum
-60 : Q3 Abgang
= : H1-Summe
+240 : Q4
= : Jahressumme`,
    waterfallBreak: `waterfall
%% Achsenbruch: der Bereich 300..800 wird AUSGESCHNITTEN, damit kleine Schritte größer wirken.
%% Ein Balken, der den Bruch kreuzt, wird in Stücken gezeichnet, mit einem Zickzack auf der Linie.
title Umsatz mit Achsenbruch
y "Mio. USD" 0 --> 1000
grid 100
break 300 --> 800 "Achsenbruch"
=120 : Q1
+180 : Q2
+700 : Q3
= : Summe`,
    waterfallMulti: `waterfall
%% Mehrere Serien: jede Gruppe hat eine eigene Grundfarbe,
%% Zuwächse 20% heller, Rückgänge 25% dunkler.
title Soll und Ist
y "Mio. USD" 0 --> 400
grid 100
series Soll color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : Summe
series Ist color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : Summe`,
    waterfallLabels: `waterfall
%% BESCHRIFTUNGEN UND LINIEN — das, was am häufigsten fehlt.
%%
%% 1) inside und above wählen, wohin die Wertbeschriftung kommt.
%%    Die Flags stehen am Ende der Datenzeile; Reihenfolge und Großschreibung sind egal.
%%    Ein Flag zeichnet das andere nicht, inside allein wird also nicht nach oben kopiert:
%%      =90 : Q1 inside           nur innen (über dem Balken nichts)
%%      -25 : Q3 above            nur über dem Balken
%%    Beide zugleich sind erlaubt, und jede kann eigenen Text tragen:
%%      +60 : Q2 inside="60" above="+60 Mio."
%%    Beide Positionen mit derselben Zahl:
%%      = : Summe inside above
%%    Für alle Balken auf einmal:  labels inside | above | both | none
%%    Die innere Beschriftung ist weiß, die über dem Balken grau.
%%    Text, der nicht in den Balken passt, wandert einmalig darüber.
%%
%% 2) LINIEN zwischen Balken sind eine DIREKTIVE in einer eigenen Zeile (kein Flag):
%%      connectors on    einschalten (standardmäßig an)
%%      connectors off   ausschalten
%%    Die gestrichelte Linie läuft von der Arbeitskante eines Balkens zum nächsten:
%%    Wachstum — von oben, Rückgang — von unten. Unterschiedliche Höhen
%%    werden mit einer Stufe verbunden.
%%
%% 3) Gemeinsamer Text, wenn eine Position keinen eigenen hat:  label="+60 Mio."
%%    Gar keine Beschriftung:                                   no-label
%%
%% 4) Farben: colors total= increase= decrease=
title Beschriftungen und Linien
y "Mio. USD" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 Mio."
-25 : Q3 above
= : Summe inside above`,
    waterfallNoLines: `waterfall
%% LINIEN AUS — derselbe Wasserfall wie «Beschriftungen und Linien»,
%% aber ohne die gestrichelten Verbinder: ein klares Bild für die Präsentation.
%%
%% Der einzige Unterschied ist eine Zeile:  connectors off
%% (Verbinder sind standardmäßig an, daher muss "off" ausdrücklich stehen)
%%
%% Vergleich mit dem Beispiel «Wasserfall — Beschriftungen und Linien»:
%% dort steht connectors on und genau dieselben Daten.
title Beschriftungen ohne Linien
y "Mio. USD" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 Mio."
-25 : Q3 above
= : Summe inside above`,
    waterfallThresholds: `waterfall
%% HORIZONTALE LINIEN MIT BESCHRIFTUNG — Planniveau, Ziel, Schwelle.
%%
%% Die Direktive steht in einer EIGENEN Zeile (kein Flag in einer Datenzeile):
%%   line <Wert> ["Beschriftung"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "Plan"                 standardmäßig gestrichelt, Themenfarbe
%%   line 400 "Ziel" color=#cf222e   eigene Farbe
%%   line 250 "Schwelle" style=dot width=1
%%
%% Die Linie geht über die ganze Zeichenfläche; die Beschriftung steht rechts vom letzten Balken,
%% mit einer Aussparung, damit die Linie den Text nicht durchstreicht.
%% So viele Linien wie nötig — jede in einer eigenen Zeile.
title Umsatz gegen den Plan
y "Mio. USD" 0 --> 500
grid 100
line 350 "Plan"
line 400 "Ziel" color=#cf222e width=2
line 250 "Schwelle" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : H1-Summe
+240 : Q4
= : Jahressumme`,
    waterfallMono: `waterfall
%% Schwarz-Weiß-Modus: keine Farben nötig, die Balken unterscheiden sich durch die Helligkeit.
%% Praktisch für den Druck und für Dokumente ohne Farbe.
%% Eigene Farben funktionieren auch hier — sie ersetzen die Grauskala.
title Schwarz-Weiß-Modus (mono)
mono
y "Mio. USD" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : H1-Summe
+110 : Q4
= : Jahressumme`,
    bubble: `bubble
%% Demonstration aller bubble-Möglichkeiten: x/y-Achsen, Größenlegende, Quadranten
%% und ihre Beschriftungen, Farbgruppen und die Schriftgröße.
%% Die Beschriftung bleibt in der Blase, wenn sie passt; sonst darunter, ungekürzt, ohne "…".
title BCG-Matrix: vollständige Beschriftungen
x "Marktanteil" 0 --> 10
y "Marktwachstum, %" 0 --> 30
size "Umsatz"
quadrants Sterne, Fragezeichen, Melkkühe, Arme Hunde
mid x=5 y=12
fontsize 12
data
Produkt A : x=8.2, y=22, size=340, group=Software
Produkt B : x=2.1, y=25, size=180, group=Software
Produkt C : x=7.4, y=4, size=520, group=Hardware
Produkt D : x=1.5, y=3, size=90, group=Hardware
Produkt E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title Last nach Tag
x Mo, Di, Mi, Do, Fr
y Morgen, Tag, Abend
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
Morgen : 20, 35, 50, 30, 25
Tag : 60, 75, 85, 70, 55
Abend : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% Die Füllung ist color=#hex (oder fill=). Der Rand ist border=#hex und style=solid|dash|dot|dashdot.
%% Die Schlüssel lassen sich in beliebiger Reihenfolge kombinieren. In [Klammern] bleibt color= Teil der Beschriftung.
Geschäftsführung [Geschäftsführer\\nAlexander Berger] color=#8250df
Technikleitung [Technische Leitung\\nElena Hofmann] color=#ddf4ff border=#0969da
Finanzleitung [Finanzleitung\\nDavid Müller] border=#9a6700 style=dash
Server [Leitung Serverentwicklung\\nSamuel Krüger]
Client [Leitung Cliententwicklung\\nClara Vogel]
Geschäftsführung -> Technikleitung
Geschäftsführung -> Finanzleitung
Technikleitung -> Server
Technikleitung -> Client
Finanzleitung -.-> Server`,
    ev: `ev
title Fertigstellungswert des Budgets
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% Boxplot: Quartile Q1/Q2/Q3, Whisker, Mittelwert-Raute und Ausreißer.
%% Zwei Arten, eine Kategoriezeile anzugeben:
%%   1) Explizite Fünf-Zahlen-Zusammenfassung: Kategorie : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) Rohbeobachtungen:      Kategorie : values=20, 28, 35, 42, 50, 62, 145 color=#hex (Tukey-Whisker 1.5*IQR)
%% Farboptionen:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — Schwarz-Weiß-Druckmodus
title Verteilung der Dienstlatenz
y "Millisekunden" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
API-Gateway : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
Zahlungen : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
Suche : values=12, 22, 28, 34, 38, 45, 52, 68, 148
Analytik : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% Baumkarte: die Fläche jedes Rechtecks ist proportional zu seinem Zahlengewicht.
%% Zeilensyntax: Gruppe / Element : <Gewicht> [color=#hex]
%% Direktive labels: values | percent | both | none (Vorgabe ist both — Wert und Anteil in %).
%% Farboptionen: colors s1=#hex s2=#hex ..., color=#hex an Gruppe oder Element, oder mono.
title Aufschlüsselung des IT-Budgets (Mio. USD)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
Infrastruktur / Cloud und K8s : 420
Infrastruktur / Netz und CDN : 180
Infrastruktur / Speicher : 140
Entwicklung / Server und API : 360
Entwicklung / Web und Mobil : 260
Entwicklung / QA und Automatisierung : 140
Daten und KI / DWH-Speicher : 240
Daten und KI / ML-Modelle : 160 color=#0f766e`,
    radar: `radar
%% Radar- / Netzdiagramm: vergleicht mehrere Serien über N >= 3 Achsen.
%% Direktiven:
%%   axes Achse 1, Achse 2, ...  Beschriftung der Speichen (mindestens 3)
%%   scale 0 --> 100           Wertebereich entlang der Speichen
%%   rings 5                   Anzahl konzentrischer Polygonringe
%%   fill 0.22                 Deckkraft der Polygonfüllung (0..1 oder off)
%%   dots on|off               Markierungen an den Ecken
%%   colors s1=#hex s2=#hex    Serienpalette (oder color=#hex je Serie, oder mono)
title Vergleich von Cloud-Plattformen
axes Leistung, Zuverlässigkeit, Sicherheit, Entwicklererlebnis, Ökosystem, Kosteneffizienz
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series Plattform A : 90, 92, 88, 82, 95, 70
series Plattform B : 78, 85, 94, 90, 80, 86
series Plattform C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% Voronoi-Zerlegung: teilt die Ebene in konvexe Zellen des nächsten Zentrums.
%% Direktiven:
%%   x "Beschriftung" min --> max     X-Achse (Vorgabe 0 --> 100)
%%   y "Beschriftung" min --> max     Y-Achse (Vorgabe 0 --> 100)
%%   sites on|off              Mittelpunkte zeichnen
%%   labels on|off             Zellbeschriftungen im Schwerpunkt zeichnen
%%   colors s1=#hex s2=#hex    Palette für Gruppen/Zellen (oder color=#hex je Punkt, oder mono)
title Abdeckungszonen der Logistikdrehscheiben
x "West — Ost, km" 0 --> 100
y "Süd — Nord, km" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
Norddrehscheibe : x=48, y=82, group=Magistrale
Süddrehscheibe : x=52, y=18, group=Magistrale
Westterminal : x=20, y=54, group=Region
Ostterminal : x=82, y=56, group=Region
Zentrallager : x=50, y=50, group=Kern
Südwesten : x=24, y=22, group=Region, color=#f97316`,
    clustered: `series
%% Seriendiagramm: gruppiert mehrere Serien in jeder Kategorie nebeneinander.
%% Um das Diagramm um 90 Grad zu drehen (waagerechte Balken), ergänzen: rotate 90
%% Direktiven:
%%   categories C1, C2, ...    Kategorienamen (Alias: x C1, C2, ...)
%%   y "Beschriftung" min --> max     Skala der Werteachse
%%   labels above|inside|none  Wertbeschriftungen
%%   colors s1=#hex s2=#hex    Serienpalette (oder color=#hex in der series-Zeile, oder mono)
title Umsatz nach Vertriebskanal
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series Onlinehandel : 120, 145, 165, 190
series Einzelhandel : 85, 95, 110, 130
series Partner : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% Seriendiagramm UM 90 GRAD GEDREHT (rotate 90).
%% Die Direktive rotate 90 (oder orientation horizontal) tauscht die Achsen:
%% Kategorien laufen links von oben nach unten, und die Balken wachsen von links nach rechts.
%% Die erste Kategorie nach unten setzen mit: invert y (zurück mit invert y off).
%% Zurück zu senkrechten Balken mit: rotate 0 (oder rotate 90 entfernen).
title Umsatz nach Kanal (Drehung 90°)
rotate 90
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series Onlinehandel : 120, 145, 165, 190
series Einzelhandel : 85, 95, 110, 130
series Partner : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% Gestapelte Balken: die Serien teilen sich eine Säule, statt nebeneinander zu stehen.
%% stacked / bars stacked / layout stacked
%% Wieder nebeneinander: stacked off oder bars grouped
%% Positive Werte wachsen von null nach oben, negative nach unten.
title Umsatzmix
stacked
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series Produkt : 80, 90, 70, 110
series Dienste : 50, 60, 55, 70
series Partner : 30, 25, 40, 35`,
    clusteredMono: `series
%% Schwarz-Weiß: die Serien unterscheiden sich durch die Helligkeit, nicht durch den Farbton.
%% Ausdrückliche colors ersetzen die Grauskala, deshalb lässt dieses Beispiel sie weg.
title Umsatz, Schwarz-Weiß
mono
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 200
grid 50
series Onlinehandel : 120, 145, 165, 190
series Einzelhandel : 85, 95, 110, 130
series Partner : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% Invertiertes Schwarz-Weiß: hellgraue Balken auf dunkler Fläche.
%% Für dunkle Themen und dunkle Folien. mono off bringt die Farbe zurück.
title Umsatz, invertiertes Schwarz-Weiß
mono invert
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 200
grid 50
series Onlinehandel : 120, 145, 165, 190
series Einzelhandel : 85, 95, 110, 130
series Partner : 45, 60, 75, 95`,
    seriesLines: `series
%% Eine Linie über den Balken: line Beschriftung : w1, w2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot. Vorgabe ist solid und Stärke 1.75.
%% Eine Kategorie mit einer leeren Stelle, "-", oder null auslassen. Die Linie verbindet die Punkte daneben.
%% Die Beschriftung steht rechts von der Zeichenfläche, auf der Höhe des letzten gegebenen Punkts.
title Istwerte und Leitlinien
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 220
grid 20
labels above
series Ist : 120, 145, 165, 190
line Durchgezogen : 110, 130, 150, 180 color=#0969da style=solid width=2
line Gestrichelt : 100, -, 160, 175 color=#8250df style=dash
line Gepunktet : 90, , 155, 170 color=#2da44e style=dot width=1
line Strichpunkt : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% Ein cagr ohne Nummern zeichnet einen Pfeil vom ersten Balken zum letzten.
title Umsatzwachstum
categories 2021, 2022, 2023, 2024
y "Mio. USD" 0 --> 220
grid 20
series Umsatz : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% Verschiedene cagr-Optionen auf den Balkenbereichen 1–3, 4–6 und 7–9.
%% Die Balkennummern beginnen bei 1. Aufeinanderfolgende cagr gehören zur Serie direkt darüber.
%% format="0%"        ganze Zahl, die Vorgabe
%% format="0.0%"      eine Dezimalstelle; "+" im Muster setzt ein Plus
%% format="0.00"      ein Verhältnis, ohne Prozentzeichen
%% prefix="CAGR: "    Text vor der Zahl
%% label="Ziel"       Ovaltext wie angegeben, ohne Rechnung (prefix wird dann ignoriert)
title CAGR nach Bereich
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "Mio. USD" 0 --> 220
grid 20
series Onlinehandel : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="Ziel"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% Achsenbruch: der Bereich 200..700 wird AUSGESCHNITTEN, damit kleine Balken größer wirken.
%% Ein Balken, der den Bruch kreuzt, wird in Stücken gezeichnet, mit einem Zickzack auf der Linie.
%% Dieselbe Syntax wie waterfall: break <danach> --> <davor> ["Beschriftung"]
title Umsatz mit einem Achsenbruch
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 1000
grid 100
break 200 --> 700 "Achsenbruch"
series Onlinehandel : 120, 180, 860, 240
series Einzelhandel : 80, 140, 790, 190`,
    seriesThresholds: `series
%% HORIZONTALE LINIEN — Plan, Ziel, Schwelle.
%% Das ist KEINE Linie über die Kategorien: eine Niveaulinie hat keinen Doppelpunkt.
%%
%%   line <Wert> ["Beschriftung"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line Beschriftung : w1, w2, …   — weiterhin ein Linienzug über den Balken
%%
%% Die Linie geht über die Zeichenfläche; die Beschriftung steht rechts, mit einer Lücke hinter dem Text.
title Umsatz gegenüber dem Plan
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 250
grid 50
line 160 "Plan"
line 200 "Ziel" color=#cf222e width=2
line 120 "Schwelle" style=dot width=1
series Ist : 120, 145, 165, 190
series Leitwert : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% Der Serienname und die Linienbeschriftung können wegbleiben.
%%   series : w1, w2, …     Balken ohne Zeile in der Legende
%%   line : w1, w2, …       eine Linie ohne Beschriftung rechts
%% color und style gelten weiterhin.
title Quartale ohne Namen
categories Q1, Q2, Q3, Q4
y "Mio. USD" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
  ar: {
    waterfall: `waterfall
%% شلال أساسي: بداية ونمو وانخفاض وإجمالي.
%% صفوف البيانات: <إشارة><عدد> : <تسمية>
%%   =120 : Q1   قيمة مطلقة (بداية أو إجمالي)
%%   = : إجمالي النصف  "=" وحدها — تكرر الإجمالي الجاري
%%   +180 : Q2   زيادة
%%   -60 : Q3    نقص
%% مزيد من الإمكانات: أمثلة «قطع المحور» و«سلاسل متعددة» و«التسميات».
%% ملاحظة: الخطوط المتقطعة بين الأعمدة موصلات (مفعّلة افتراضيًا).
%%       لإيقافها: connectors off
title إيراد 2026
y "مليون دولار" 0 --> 500
grid 100
=120 : Q1 بداية
+180 : Q2 نمو
-60 : Q3 تسرّب
= : إجمالي النصف
+240 : Q4
= : إجمالي السنة`,
    waterfallBreak: `waterfall
%% قطع المحور: المدى 300..800 مقطوع حتى تبدو الخطوات الصغيرة أكبر.
%% العمود الذي يمر بالقطع يُرسم أجزاءً، مع خط متعرج على الحد.
title إيراد مع قطع المحور
y "مليون دولار" 0 --> 1000
grid 100
break 300 --> 800 "قطع المحور"
=120 : Q1
+180 : Q2
+700 : Q3
= : الإجمالي`,
    waterfallMulti: `waterfall
%% سلاسل متعددة: لكل مجموعة لون أساس،
%% الزيادة أفتح بنسبة 20% والنقصان أغمق بنسبة 25%.
title الخطة والفعلي
y "مليون دولار" 0 --> 400
grid 100
series الخطة color=#1f6feb
=120 : Q1
+80 : Q2
-20 : Q3
= : الإجمالي
series الفعلي color=#8250df
=110 : Q1
+95 : Q2
-35 : Q3
= : الإجمالي`,
    waterfallLabels: `waterfall
%% التسميات والخطوط — الأمران اللذان يُنسيان أكثر من غيرهما.
%%
%% 1) inside و above يحددان موضع تسمية القيمة.
%%    الأعلام في نهاية صف البيانات؛ الترتيب لا يهم، ولا حالة الأحرف.
%%    العلم الواحد لا يرسم الآخر، فـ inside وحده لا يُنسخ إلى الأعلى:
%%      =90 : Q1 inside           في الداخل فقط (فوق العمود فارغ)
%%      -25 : Q3 above            فوق العمود فقط
%%    الاثنان معًا مسموحان، ويمكن أن يحمل كل منهما نصه:
%%      +60 : Q2 inside="60" above="+60 مليون"
%%    الموضعان بالعدد نفسه:
%%      = : الإجمالي inside above
%%    لكل الأعمدة دفعة واحدة:  labels inside | above | both | none
%%    التسمية الداخلية بيضاء، والتي فوق العمود رمادية.
%%    النص الذي لا يتسع داخل العمود ينتقل فوقه مرة واحدة.
%%
%% 2) الخطوط بين الأعمدة توجيه في سطر مستقل (ليست علمًا):
%%      connectors on    تشغيل (مفعّلة افتراضيًا)
%%      connectors off   إيقاف
%%    الخط المتقطع يجري من الحافة العاملة للعمود إلى العمود التالي:
%%    النمو من الأعلى، والانخفاض من الأسفل. المستويات المختلفة
%%    تتصل بعتبة.
%%
%% 3) نص مشترك حين لا يملك الموضع نصه:  label="+60 مليون"
%%    بلا تسمية إطلاقًا:                                        no-label
%%
%% 4) الألوان: colors total= increase= decrease=
title التسميات والخطوط
y "مليون دولار" 0 --> 200
grid 50
connectors on
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 مليون"
-25 : Q3 above
= : الإجمالي inside above`,
    waterfallNoLines: `waterfall
%% الخطوط متوقفة — الشلال نفسه كما في «التسميات والخطوط»،
%% لكن بلا الموصلات المتقطعة: صورة نظيفة للعرض.
%%
%% الفرق الوحيد سطر واحد:  connectors off
%% (الموصلات مفعّلة افتراضيًا، لذا يجب كتابة "off" صراحة)
%%
%% قارن بمثال «شلال — التسميات والخطوط»:
%% هناك connectors on والبيانات نفسها تمامًا.
title تسميات بلا خطوط
y "مليون دولار" 0 --> 200
grid 50
connectors off
colors total=#1f6feb increase=#2da44e decrease=#cf222e
=90 : Q1 inside
+60 : Q2 inside="60" above="+60 مليون"
-25 : Q3 above
= : الإجمالي inside above`,
    waterfallThresholds: `waterfall
%% خطوط أفقية مع تسمية — مستوى الخطة والهدف والعتبة.
%%
%% التوجيه في سطر مستقل (ليس علمًا داخل صف بيانات):
%%   line <قيمة> ["تسمية"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%
%%   line 350 "خطة"                 متقطع افتراضيًا، لون السمة
%%   line 400 "هدف" color=#cf222e   لون خاص
%%   line 250 "عتبة" style=dot width=1
%%
%% الخط يمتد عبر الرسم كله، والتسمية إلى يمين آخر عمود،
%% مع فراغ حتى لا يقطع الخط النص.
%% أي عدد من الخطوط — كل واحد في سطر.
title الإيراد مقابل الخطة
y "مليون دولار" 0 --> 500
grid 100
line 350 "خطة"
line 400 "هدف" color=#cf222e width=2
line 250 "عتبة" style=dot width=1
=120 : Q1
+180 : Q2
-60 : Q3
= : إجمالي النصف
+240 : Q4
= : إجمالي السنة`,
    waterfallMono: `waterfall
%% وضع أبيض وأسود: لا حاجة إلى الألوان، الأعمدة تختلف بدرجة الإضاءة.
%% مناسب للطباعة وللمستندات بلا لون.
%% الألوان الخاصة تظل تعمل هنا — وهي تستبدل تدرج الرمادي.
title وضع أبيض وأسود (mono)
mono
y "مليون دولار" 0 --> 300
grid 50
=120 : Q1
+80 : Q2
-40 : Q3
= : إجمالي النصف
+110 : Q4
= : إجمالي السنة`,
    bubble: `bubble
%% عرض لكل ما يفعله bubble: محورا x/y، مفتاح الحجم، الأرباع
%% وتسمياتها ومجموعات الألوان وحجم الخط.
%% تبقى التسمية داخل الفقاعة إن اتسعت؛ وإلا تحتها كاملة، بلا "…".
title مصفوفة BCG: تسميات كاملة
x "حصة السوق" 0 --> 10
y "نمو السوق، %" 0 --> 30
size "الإيراد"
quadrants النجوم, علامات الاستفهام, الأبقار المدرة, الكلاب
mid x=5 y=12
fontsize 12
data
المنتج A : x=8.2, y=22, size=340, group=Software
المنتج B : x=2.1, y=25, size=180, group=Software
المنتج C : x=7.4, y=4, size=520, group=Hardware
المنتج D : x=1.5, y=3, size=90, group=Hardware
المنتج E : x=4.6, y=16.5, size=240, group=Software`,
    heatmap: `heatmap
title الحمل حسب اليوم
x الإثنين, الثلاثاء, الأربعاء, الخميس, الجمعة
y صباح, نهار, مساء
scale
0-40 : #e8f5e9
40-70 : #fff3e0
70+ : #ffebee
data
صباح : 20, 35, 50, 30, 25
نهار : 60, 75, 85, 70, 55
مساء : 40, 45, 65, 50, 35`,
    orgchart: `orgchart
%% التعبئة هي color=#hex (أو fill=). الحد هو border=#hex و style=solid|dash|dot|dashdot.
%% يمكن جمع المفاتيح بأي ترتيب. داخل [الأقواس] يبقى color= جزءًا من التسمية.
الرئيس_التنفيذي [الرئيس التنفيذي\\nأحمد منصور] color=#8250df
الرئيس_التقني [الرئيس التقني\\nليلى حسن] color=#ddf4ff border=#0969da
الرئيسة_المالية [الرئيسة المالية\\nسارة خالد] border=#9a6700 style=dash
الخادم [رئيس هندسة الخادم\\nسامر عادل]
الواجهة [رئيسة هندسة الواجهة\\nنورا فهد]
الرئيس_التنفيذي -> الرئيس_التقني
الرئيس_التنفيذي -> الرئيسة_المالية
الرئيس_التقني -> الخادم
الرئيس_التقني -> الواجهة
الرئيسة_المالية -.-> الخادم`,
    ev: `ev
title القيمة المكتسبة للميزانية
days 1, 2, 3, 4, 5
pv 10, 25, 45, 65, 90
ev 8, 20, 40, 58, 80
ac 12, 28, 50, 72, 95
grid`,
    boxplot: `boxplot
%% مخطط الصندوق: الربيعات Q1/Q2/Q3 والشعيرات ومعين المتوسط والقيم الشاذة.
%% طريقتان لتعريف صف الفئة:
%%   1) ملخص صريح من خمسة أعداد: فئة : min=15, q1=30, median=45, q3=70, max=110, mean=48, outliers=165;180, color=#hex
%%   2) مشاهدات خام:      فئة : values=20, 28, 35, 42, 50, 62, 145 color=#hex (شعيرات Tukey 1.5*IQR)
%% خيارات اللون:
%%   colors box=#hex median=#hex whisker=#hex outlier=#hex s1=#hex s2=#hex
%%   mono — وضع طباعة أبيض وأسود
title توزيع زمن استجابة الخدمات
y "مللي ثانية" 0 --> 200
grid 50
colors outlier=#cf222e s1=#0969da s2=#8250df s3=#2da44e s4=#bf8700
بوابة API : min=18, q1=32, median=48, q3=74, max=115, mean=52, outliers=165;182
المدفوعات : min=25, q1=40, median=58, q3=86, max=130, mean=62, outliers=175
البحث : values=12, 22, 28, 34, 38, 45, 52, 68, 148
التحليلات : 30, 55, 78, 110, 155 color=#0f766e`,
    treemap: `treemap
%% خريطة شجرية: مساحة كل مستطيل تتناسب مع وزنه العددي.
%% صياغة الصف: مجموعة / عنصر : <وزن> [color=#hex]
%% توجيه labels: values | percent | both | none (الافتراضي both — القيمة والحصة %).
%% خيارات اللون: colors s1=#hex s2=#hex ...، أو color=#hex على مجموعة أو عنصر، أو mono.
title تفصيل ميزانية تقنية المعلومات (مليون دولار)
labels both
colors s1=#0969da s2=#8250df s3=#2da44e
البنية التحتية / السحابة و K8s : 420
البنية التحتية / الشبكة و CDN : 180
البنية التحتية / التخزين : 140
الهندسة / الخادم و API : 360
الهندسة / الويب والجوال : 260
الهندسة / QA والاختبار الآلي : 140
البيانات والذكاء الاصطناعي / مستودع DWH : 240
البيانات والذكاء الاصطناعي / نماذج ML : 160 color=#0f766e`,
    radar: `radar
%% مخطط رادار / عنكبوت: يقارن سلاسل عدة عبر N >= 3 محاور.
%% التوجيهات:
%%   axes محور 1, محور 2, ...  تسميات الأشعة (3 على الأقل)
%%   scale 0 --> 100           مدى القيم على الأشعة
%%   rings 5                   عدد الحلقات المضلعة المتراكزة
%%   fill 0.22                 عتمة تعبئة المضلع (0..1 أو off)
%%   dots on|off               علامات عند الرؤوس
%%   colors s1=#hex s2=#hex    لوحة السلاسل (أو color=#hex لكل سلسلة، أو mono)
title مقارنة منصات السحابة
axes الأداء, الموثوقية, الأمان, تجربة المطوّر, المنظومة, كفاءة التكلفة
scale 0 --> 100
rings 5
fill 0.22
colors s1=#0969da s2=#8250df s3=#2da44e
series المنصة A : 90, 92, 88, 82, 95, 70
series المنصة B : 78, 85, 94, 90, 80, 86
series المنصة C : 84, 76, 80, 88, 74, 92 color=#f97316`,
    voronoi: `voronoi
%% تقسيم فورونوي: يقسم المستوى إلى خلايا محدبة لأقرب مركز.
%% التوجيهات:
%%   x "تسمية" min --> max     محور X (الافتراضي 0 --> 100)
%%   y "تسمية" min --> max     محور Y (الافتراضي 0 --> 100)
%%   sites on|off              رسم نقاط المراكز
%%   labels on|off             رسم تسميات الخلايا عند مركز الشكل
%%   colors s1=#hex s2=#hex    لوحة المجموعات/الخلايا (أو color=#hex لكل نقطة، أو mono)
title نطاقات تغطية المراكز اللوجستية
x "الغرب — الشرق، كم" 0 --> 100
y "الجنوب — الشمال، كم" 0 --> 100
sites on
labels on
colors s1=#0969da s2=#8250df s3=#2da44e
data
مركز الشمال : x=48, y=82, group=الشريان
مركز الجنوب : x=52, y=18, group=الشريان
محطة الغرب : x=20, y=54, group=الإقليم
محطة الشرق : x=82, y=56, group=الإقليم
المستودع المركزي : x=50, y=50, group=القلب
الجنوب الغربي : x=24, y=22, group=الإقليم, color=#f97316`,
    clustered: `series
%% مخطط سلاسل: يجمع سلاسل عدة جنبًا إلى جنب في كل فئة.
%% لتدوير الرسم 90 درجة (أشرطة أفقية)، أضف: rotate 90
%% التوجيهات:
%%   categories C1, C2, ...    تسميات الفئات (اسم بديل: x C1, C2, ...)
%%   y "تسمية" min --> max     مقياس محور القيم
%%   labels above|inside|none  تسميات القيم
%%   colors s1=#hex s2=#hex    لوحة السلاسل (أو color=#hex في صف series، أو mono)
title الإيراد حسب قناة البيع
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series المتجر : 120, 145, 165, 190
series التجزئة : 85, 95, 110, 130
series الشركاء : 45, 60, 75, 95 color=#f97316`,
    clusteredRotated: `series
%% مخطط سلاسل مُدار 90 درجة (rotate 90).
%% التوجيه rotate 90 (أو orientation horizontal) يبادل المحورين:
%% الفئات تنزل من الأعلى إلى الأسفل على اليسار، والأشرطة تنمو من اليسار إلى اليمين.
%% ضع الفئة الأولى في الأسفل بـ: invert y (للرجوع: invert y off).
%% ارجع إلى الأشرطة الرأسية بـ: rotate 0 (أو احذف rotate 90).
title الإيراد حسب القناة (تدوير 90°)
rotate 90
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 200
grid 50
labels above
colors s1=#0969da s2=#8250df s3=#2da44e
series المتجر : 120, 145, 165, 190
series التجزئة : 85, 95, 110, 130
series الشركاء : 45, 60, 75, 95 color=#f97316`,
    clusteredStacked: `series
%% أشرطة مكدسة: السلاسل تشترك في عمود واحد بدل أن تقف جنبًا إلى جنب.
%% stacked / bars stacked / layout stacked
%% جنبًا إلى جنب من جديد: stacked off أو bars grouped
%% القيم الموجبة تنمو من الصفر إلى الأعلى، والسالبة إلى الأسفل.
title مزيج الإيراد
stacked
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 400
grid 50
labels inside
colors s1=#0969da s2=#8250df s3=#2da44e
series المنتج : 80, 90, 70, 110
series الخدمات : 50, 60, 55, 70
series الشركاء : 30, 25, 40, 35`,
    clusteredMono: `series
%% أبيض وأسود: السلاسل تختلف بدرجة الإضاءة لا بالصبغة.
%% colors الصريحة تستبدل تدرج الرمادي، لذا هذا المثال لا يكتبها.
title الإيراد، أبيض وأسود
mono
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 200
grid 50
series المتجر : 120, 145, 165, 190
series التجزئة : 85, 95, 110, 130
series الشركاء : 45, 60, 75, 95`,
    clusteredMonoInvert: `series
%% أبيض وأسود معكوس: أشرطة رمادية فاتحة على رقعة داكنة.
%% للسمات الداكنة والشرائح الداكنة. mono off يعيد اللون.
title الإيراد، أبيض وأسود معكوس
mono invert
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 200
grid 50
series المتجر : 120, 145, 165, 190
series التجزئة : 85, 95, 110, 130
series الشركاء : 45, 60, 75, 95`,
    seriesLines: `series
%% خط فوق الأعمدة: line تسمية : ق1, ق2, … [color=#hex] [style=…] [width=N]
%% style: solid | dash | dot | dashdot. الافتراضي solid والسماكة 1.75.
%% تجاوز فئة بفراغ فارغ أو "-" أو null. يصل الخط النقاط على الجانبين.
%% التسمية إلى يمين الرسم، على ارتفاع آخر نقطة معطاة.
title الفعلي والمرجعيات
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 220
grid 20
labels above
series الفعلي : 120, 145, 165, 190
line متصلة : 110, 130, 150, 180 color=#0969da style=solid width=2
line متقطعة : 100, -, 160, 175 color=#8250df style=dash
line نقطية : 90, , 155, 170 color=#2da44e style=dot width=1
line شرطة-نقطة : 80, 120, null, 160 color=#f97316 style=dashdot width=2.5`,
    seriesCagr: `series
%% cagr بلا أرقام يرسم سهمًا من أول عمود إلى آخر عمود.
title نمو الإيراد
categories 2021, 2022, 2023, 2024
y "مليون دولار" 0 --> 220
grid 20
series الإيراد : 80, 110, 150, 190
cagr`,
    seriesCagrRanges: `series
%% خيارات cagr مختلفة على نطاقات الأعمدة 1–3 و4–6 و7–9.
%% أرقام الأعمدة تبدأ من 1. أسطر cagr المتتالية تخص السلسلة التي فوقها مباشرة.
%% format="0%"        عدد صحيح، وهو الافتراضي
%% format="0.0%"      منزلة عشرية واحدة؛ "+" في النمط يضيف علامة الزائد
%% format="0.00"      نسبة، بلا علامة بالمئة
%% prefix="CAGR: "    نص قبل العدد
%% label="هدف"       نص الشكل البيضوي كما هو، بلا حساب (عندها يُتجاهل prefix)
title CAGR حسب النطاق
ratio 16x6
categories 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025
y "مليون دولار" 0 --> 220
grid 20
series المتجر : 34, 39, 68, 74, 90, 108, 118, 140, 130
cagr 1, 2 format="0%"
cagr 2, 3 format="0.00" prefix="×"
cagr 3, 5 format="0.0%" prefix="CAGR: "
cagr 5, 6 label="هدف"

cagr 8, 9 format="+0.0%"
cagr 6, 7 format="0%" prefix="+"`,
    seriesBreak: `series
%% قطع المحور: المدى 200..700 مقطوع حتى تبدو الأعمدة الصغيرة أكبر.
%% العمود الذي يمر بالقطع يُرسم أجزاءً، مع خط متعرج على الحد.
%% الصياغة نفسها كما في waterfall: break <بعد> --> <قبل> ["تسمية"]
title إيراد مع قطع في المحور
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 1000
grid 100
break 200 --> 700 "قطع المحور"
series المتجر : 120, 180, 860, 240
series التجزئة : 80, 140, 790, 190`,
    seriesThresholds: `series
%% خطوط أفقية — خطة وهدف وعتبة.
%% هذا ليس خطًا عبر الفئات: خط المستوى بلا نقطتين.
%%
%%   line <قيمة> ["تسمية"] [color=#hex] [width=<px>] [style=solid|dash|dot|dashdot]
%%   line تسمية : ق1, ق2, …   — ما زال خطًا منكسرًا فوق الأعمدة
%%
%% الخط يمتد عبر الرسم؛ التسمية على اليمين، مع فراغ خلف النص.
title الإيراد قياسًا إلى الخطة
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 250
grid 50
line 160 "خطة"
line 200 "هدف" color=#cf222e width=2
line 120 "عتبة" style=dot width=1
series الفعلي : 120, 145, 165, 190
series المرجع : 110, 130, 150, 180`,
    seriesUnnamed: `series
%% يمكن ترك اسم السلسلة وتسمية الخط.
%%   series : ق1, ق2, …     أعمدة بلا صف في المفتاح
%%   line : ق1, ق2, …       خط بلا تعليق على اليمين
%% color و style يبقيان ساريين.
title أرباع بلا أسماء
categories Q1, Q2, Q3, Q4
y "مليون دولار" 0 --> 220
grid 20
series : 120, 145, 165, 190
series : 80, 95, 110, 130 color=#8250df
line : 110, 130, 155, 180 color=#0969da style=dash width=2
line : 70, 100, 120, 150 style=dot`,
  },
};
