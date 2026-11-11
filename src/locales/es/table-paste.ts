import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "Pegar tabla desde el portapapeles",
  "editor.pasteTableHistory": "Pegar tabla",
  "tablePaste.modalTitle": "No se puede pegar la tabla desde el portapapeles",
  "tablePaste.reasonLabel": "Qué ha fallado",
  "tablePaste.expectedLabel": "Formato de tabla esperado ({type})",
  "tablePaste.columnsLabel": "Columnas:",
  "tablePaste.rulesLabel": "Reglas de conversión:",
  "tablePaste.sampleLabel": "Tabla de ejemplo para copiar (Excel / Google Sheets / TSV):",
  "tablePaste.error.emptyClipboard":
    "El portapapeles está vacío. Copie un rango de celdas de Excel o Google Sheets, o una tabla separada por tabuladores o por punto y coma.",
  "tablePaste.error.clipboardReadFailed":
    "No se pudo leer el portapapeles. Conceda el permiso del portapapeles en el navegador e inténtelo de nuevo.",
  "tablePaste.error.notATable":
    "El contenido del portapapeles no es una tabla (se esperaban al menos 2 columnas separadas por tabuladores, ';' o '|').",
  "tablePaste.error.tooManyColumns":
    "Demasiadas columnas: se encontraron {actual} en el portapapeles, pero este diagrama espera {expected}.",
  "tablePaste.error.tooFewColumns":
    "Muy pocas columnas: se encontraron {actual} en el portapapeles, pero este diagrama espera {expected}.",
  "tablePaste.error.tooFewColumnsMin":
    "Muy pocas columnas: se encontraron {actual} en el portapapeles, pero hacen falta al menos {min}.",
  "tablePaste.error.tooFewRowsMin":
    "Muy pocas filas: se encontraron {actual} en el portapapeles, pero hacen falta al menos {min} filas.",
  "tablePaste.error.expectedColumnRange":
    "Número de columnas no válido: se encontraron {actual} en el portapapeles y se esperaban entre {min} y {max} columnas.",
  "tablePaste.error.waterfallColumns":
    "Se esperaban 2 columnas: una con etiquetas de texto y otra con números (o celdas vacías para totales '=').",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "La primera fila de datos (fila {row}) debe tener un valor numérico inicial ('=número'), no una celda vacía.",
  "tablePaste.error.noNumericColumn":
    "Ninguna de las columnas contiene valores numéricos.",
  "tablePaste.error.invalidNumberAtRow":
    "Fila {row}: el valor \"{value}\" no es un número válido.",
  "tablePaste.error.negativeNotAllowedAtRow":
    "Fila {row}: el valor negativo \"{value}\" no se permite en un gráfico circular.",
  "tablePaste.error.noDataRows":
    "La tabla copiada no contiene filas de datos.",
  "tablePaste.type.waterfall": "Cascada",
  "tablePaste.type.pie": "Gráfico circular",
  "tablePaste.type.heatmap": "Mapa de calor",
  "tablePaste.type.bubble": "Gráfico de burbujas",
  "tablePaste.type.ev": "Valor ganado (EV)",
  "tablePaste.type.boxplot": "Diagrama de caja",
  "tablePaste.type.treemap": "Mapa de árbol",
  "tablePaste.type.radar": "Gráfico de radar",
  "tablePaste.type.voronoi": "Diagrama de Voronoi",
  "tablePaste.type.clustered": "Gráfico de series",
  "tablePaste.type.xychart": "Gráfico XY (barras / líneas)",
  "tablePaste.type.quadrant": "Gráfico de cuadrantes",
  "tablePaste.type.sankey": "Diagrama de Sankey",
  "tablePaste.type.orgchart": "Organigrama",
  "tablePaste.type.gantt": "Diagrama de Gantt",
  "tablePaste.type.timeline": "Línea de tiempo",
  "tablePaste.type.journey": "Recorrido del usuario",
  "tablePaste.type.packet": "Cabecera de paquete",
  "tablePaste.type.wbs": "Desglose del trabajo (WBS)",
  "tablePaste.type.mindmap": "Mapa mental",
  "tablePaste.type.nwdiag": "Diagrama de red (Nwdiag)",
  "tablePaste.type.wireframe": "Tabla WireMark",
  "tablePaste.expected.waterfall.columns":
    "2 columnas en cualquier orden: 'Etiqueta' y 'Valor' (o 'Valor' y 'Etiqueta').",
  "tablePaste.expected.waterfall.rules":
    "El primer número se convierte en la barra inicial (=N), los positivos en aumentos (+N), los negativos en disminuciones (-N) y una celda vacía (o '=') en un total acumulado (= : Etiqueta).",
  "tablePaste.expected.waterfall.headers": "Etiqueta|Valor",
  "tablePaste.expected.pie.columns":
    "2 columnas en cualquier orden: 'Categoría' y 'Número no negativo'.",
  "tablePaste.expected.pie.rules":
    "Cada fila se convierte en un sector: \"Categoría\" : Valor.",
  "tablePaste.expected.pie.headers": "Categoría|Parte",
  "tablePaste.expected.heatmap.columns":
    "Matriz de al menos 2×2: la primera fila tiene los encabezados de columna X, la primera columna las etiquetas de fila Y y las celdas interiores contienen números (o celdas vacías).",
  "tablePaste.expected.heatmap.rules":
    "Las líneas x e y se insertan antes del bloque scale. Si falta scale, se añade una escala del mínimo al máximo, de azul a rojo. Las celdas vacías pasan a ser huecos nulos.",
  "tablePaste.expected.heatmap.headers": "Periodo|Lun|Mar|Mié",
  "tablePaste.expected.bubble.columns":
    "4 o 5 columnas: 'Etiqueta', 'X (número)', 'Y (número)', 'Tamaño (número)', ['Grupo (opcional)'].",
  "tablePaste.expected.bubble.rules":
    "Cada fila se convierte en un punto de burbuja: Etiqueta : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "Producto|X|Y|Tamaño|Grupo",
  "tablePaste.expected.ev.columns":
    "4 columnas: 'Periodo (días)', 'PV (planificado)', 'EV (ganado)', 'AC (real)' (o 4 filas: days, pv, ev, ac).",
  "tablePaste.expected.ev.rules":
    "Genera las series days, pv, ev y ac del gráfico de valor ganado.",
  "tablePaste.expected.ev.headers": "Periodo|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 columnas ('Categoría', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.') o 4 o más columnas de observaciones en bruto ('Categoría', 'Muestra 1', 'Muestra 2', 'Muestra 3'...).",
  "tablePaste.expected.boxplot.rules":
    "Genera min=..., q1=..., median=..., q3=..., max=... para resúmenes de cinco números, o values=... para observaciones de muestra en bruto.",
  "tablePaste.expected.boxplot.headers": "Categoría|Mín.|Q1|Mediana|Q3|Máx.",
  "tablePaste.expected.treemap.columns":
    "De 2 a 4 columnas: 'Elemento | Peso' o 'Grupo | Elemento | Peso [| Color]'.",
  "tablePaste.expected.treemap.rules":
    "Genera bloques jerárquicos 'Grupo / Elemento : Peso' (el peso debe ser > 0).",
  "tablePaste.expected.treemap.headers": "Grupo|Elemento|Peso",
  "tablePaste.expected.radar.columns":
    "Matriz de al menos 4 columnas: la primera fila tiene los nombres de los ejes (al menos 3 ejes), la primera columna los nombres de las series y las celdas interiores los números.",
  "tablePaste.expected.radar.rules":
    "Genera la directiva axes a partir de la fila de encabezado y filas 'series Nombre : v1, v2, ...'.",
  "tablePaste.expected.radar.headers": "Serie|Velocidad|Fiabilidad|Usabilidad|Seguridad",
  "tablePaste.expected.voronoi.columns":
    "De 3 a 5 columnas: 'Sitio', 'X (número)', 'Y (número)', ['Grupo'], ['Color'].",
  "tablePaste.expected.voronoi.rules":
    "Cada fila se convierte en un sitio de Voronoi: Sitio : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "Sitio|X|Y|Grupo",
  "tablePaste.expected.clustered.columns":
    "Matriz de al menos 2×2: la primera columna tiene las categorías, la primera fila los nombres de las series (o transpuesta cuando el encabezado empieza por 'Serie').",
  "tablePaste.expected.clustered.rules":
    "Genera las líneas categories y series y conserva las directivas rotate 90, invert y y color.",
  "tablePaste.expected.clustered.headers": "Categoría|Norte|Sur|Exportación",
  "tablePaste.expected.xychart.columns":
    "1 o más columnas. Una columna son números para bar [Val 1, ..., Val n]. Dos columnas son 'Categoría X' y 'Valor de barra'. Tres o más son 'Categoría X' más una serie de barras por cada columna extra.",
  "tablePaste.expected.xychart.rules":
    "Una columna sustituye las líneas bar [values] existentes. Dos o más columnas sustituyen x-axis y todas las líneas bar, con una serie bar [...] por cada columna de valores. Si el gráfico aún no tiene y-axis, se añade y-axis \"\" min --> max.",
  "tablePaste.expected.xychart.headers": "Mes|Plan|Real|Previsión",
  "tablePaste.expected.quadrant.columns":
    "3 columnas: 'Etiqueta del punto', 'X (0..1 o 0..100%)', 'Y (0..1 o 0..100%)'.",
  "tablePaste.expected.quadrant.rules":
    "Las coordenadas mayores que 1 se normalizan automáticamente de porcentajes (0..100) a [0..1].",
  "tablePaste.expected.quadrant.headers": "Elemento|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 columnas: 'Origen', 'Destino', 'Valor del flujo (número)'.",
  "tablePaste.expected.sankey.rules":
    "Cada fila se convierte en una línea de flujo: Origen,Destino,Valor.",
  "tablePaste.expected.sankey.headers": "Origen|Destino|Flujo",
  "tablePaste.expected.orgchart.columns":
    "2 o 3 columnas: 'Responsable', 'Subordinado directo', ['Estilo de arista (punteada) o cargo'].",
  "tablePaste.expected.orgchart.rules":
    "Genera nodos de organigrama y líneas de reporte continuas (->) o punteadas (-.->).",
  "tablePaste.expected.orgchart.headers": "Responsable|Informe|Enlace",
  "tablePaste.expected.gantt.columns":
    "De 2 a 4 columnas: 'Tarea', 'Fecha de inicio o duración', ['Duración (5d)'], ['Sección'].",
  "tablePaste.expected.gantt.rules":
    "Genera filas de tareas de Gantt (agrupadas por sección en Mermaid).",
  "tablePaste.expected.gantt.headers": "Tarea|Inicio|Duración|Sección",
  "tablePaste.expected.timeline.columns":
    "2 o 3 columnas: 'Periodo / fecha', 'Evento', ['Sección (opcional)'].",
  "tablePaste.expected.timeline.rules":
    "Cada fila se convierte en una entrada de la línea de tiempo 'Periodo : Evento'.",
  "tablePaste.expected.timeline.headers": "Periodo|Evento|Sección",
  "tablePaste.expected.journey.columns":
    "De 2 a 4 columnas: 'Paso', 'Puntuación (1–5)', ['Actores'], ['Sección'].",
  "tablePaste.expected.journey.rules":
    "Genera pasos del recorrido del usuario 'Paso: Puntuación: Actores'.",
  "tablePaste.expected.journey.headers": "Paso|Puntuación|Actores|Sección",
  "tablePaste.expected.packet.columns":
    "2 columnas en cualquier orden: 'Rango de bits (0-15) o longitud en bits (16)' y 'Nombre del campo'.",
  "tablePaste.expected.packet.rules":
    "Genera campos de paquete '0-15: \"Campo\"' (las longitudes en bits se acumulan automáticamente en rangos).",
  "tablePaste.expected.packet.headers": "Bits|Campo",
  "tablePaste.expected.wbs.columns":
    "2 o más columnas que representan niveles de jerarquía: 'Nivel 1 (raíz)', 'Nivel 2', 'Nivel 3', etc.",
  "tablePaste.expected.wbs.rules":
    "Construye un árbol WBS (*, **, ***), agrupando automáticamente las celdas padre idénticas.",
  "tablePaste.expected.wbs.headers": "Nivel 1|Nivel 2|Nivel 3",
  "tablePaste.expected.mindmap.columns":
    "2 o más columnas que representan la profundidad del árbol: 'Raíz', 'Rama', 'Subrama', etc.",
  "tablePaste.expected.mindmap.rules":
    "Construye un árbol de mapa mental y fusiona los padres idénticos. Los nodos pegados sustituyen todos los nodos del mapa. Se conservan la leyenda, title, header, footer, caption, style y los comentarios.",
  "tablePaste.expected.mindmap.headers": "Raíz|Rama|Hoja",
  "tablePaste.expected.nwdiag.columns":
    "2 o 3 columnas: 'Nodo', 'Dirección IP', ['Red (opcional)'].",
  "tablePaste.expected.nwdiag.rules":
    "Agrupa los nodos por red en bloques network { node [address = \"...\"] }.",
  "tablePaste.expected.nwdiag.headers": "Nodo|Dirección IP|Red",
  "tablePaste.expected.wireframe.columns":
    "Cualquier tabla con al menos 2 columnas (la primera fila es el encabezado y las demás son filas del cuerpo).",
  "tablePaste.expected.wireframe.rules":
    "Genera un componente Table de WireMark con TableHead y TableBody (las columnas numéricas se alinean a la derecha).",
  "tablePaste.expected.wireframe.headers": "Nombre|Autor|Estado|Vistas",
} as const satisfies LocaleMessages;
