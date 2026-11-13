import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "Estudio de Diagrams-as-Code",
  "site.nav.features": "Funciones",
  "site.nav.converter": "Conversor e IA",
  "site.nav.pwa": "PWA / sin conexión",
  "site.nav.formats": "Formatos",
  "site.nav.faq": "Preguntas frecuentes",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "Discusiones",
  "site.hero.askQuestion": "💬 Hacer una pregunta",
  "site.github.star": "Estrella",
  "site.github.starLabel": "Dar estrella a code2graph en GitHub",
  "site.hero.viewOnGithub": "Ver en GitHub",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "Estudio PWA para PlantUML, Mermaid, GraphML, WireMark, D2 y Structurizr. MCP para agentes devuelve el código fuente del diagrama y una imagen.",
  "site.landingCtaApp": "Abrir el editor",
  "site.landingCtaInstallPwa": "📲 Instalar la PWA",
  "site.landingCtaRegister": "Registrarse",
  "site.landingCtaLogin": "Iniciar sesión",
  "site.landingCtaTryFree": "Probar gratis",
  "site.landingCtaDemo": "Demo",

  "site.hero.title": "Diagramas de texto en el navegador",
  "site.hero.subtitle":
    "Escriba un diagrama y véalo al momento. PlantUML, Mermaid, GraphML, WireMark, D2 y Structurizr, también sin conexión. MCP entrega al agente el código fuente y una imagen.",
  "site.offlineNote": "La edición y la vista previa funcionan sin red.",
  "site.languages.title": "Lenguajes",
  "site.language.sites": "Sitios",
  "site.language.libraries": "Bibliotecas usadas en la aplicación",
  "site.language.types": "Tipos principales de diagrama",
  "site.language.diagramTypes": "Tipos de diagrama",
  "site.language.keywords": "Palabras clave",
  "site.language.example": "Ejemplo",
  "site.language.syntax": "Sintaxis",
  "site.language.preview": "Así se ve: {title}",
  "site.language.previewFailed": "No se pudo dibujar el ejemplo",
  "site.primer.graphml.type.directed.title": "Grafo dirigido",
  "site.primer.graphml.type.directed.summary":
    "Las aristas van de un origen a un destino. Así dibuja Code2Graph GraphML de forma predeterminada.",
  "site.primer.graphml.type.undirected.title": "Grafo no dirigido",
  "site.primer.graphml.type.undirected.summary":
    "Las aristas solo conectan nodos, sin dirección.",
  "site.primer.wiremark.type.flow.title": "Pantallas enlazadas",
  "site.primer.wiremark.type.flow.summary":
    "Varios bocetos en un archivo, con saltos to=#anchor entre ellos.",
  "site.primer.plantuml.kw.startuml":
    "@startuml y @enduml abren y cierran el diagrama.",
  "site.primer.plantuml.kw.participant":
    "Una línea de vida con nombre. as le da un alias corto.",
  "site.primer.plantuml.kw.arrow": "Un mensaje: -> hacia un participante, --> para la respuesta.",
  "site.primer.plantuml.kw.alt":
    "Ramas excluyentes. else es la otra rama y end cierra el bloque.",
  "site.primer.plantuml.kw.note": "Una nota a la izquierda, a la derecha o sobre los participantes.",
  "site.primer.plantuml.kw.if":
    "Una decisión de actividad: then y else, cerrada con endif.",
  "site.primer.plantuml.kw.skinparam":
    "Un ajuste de estilo compartido, como el color de fondo.",
  "site.primer.plantuml.syntax.sequence":
    "actor y participant nombran una línea de vida; as es el alias corto. Un mensaje es ->, una respuesta es -->, y la etiqueta va después de los dos puntos.",
  "site.primer.plantuml.syntax.class":
    "class abre una clase; los campos y los métodos van dentro de las llaves. Un enlace es --> con la multiplicidad entre comillas.",
  "site.primer.plantuml.syntax.activity":
    "start y stop son los extremos. Un paso es :texto;. Una decisión es if () then (), else y endif.",
  "site.primer.plantuml.syntax.state":
    "[*] es el inicio y el fin. Una transición es -->, y la etiqueta del evento va después de los dos puntos.",
  "site.primer.plantuml.syntax.usecase":
    "actor y usecase declaran el actor y el caso. El enlace es -->, la dirección es left to right direction.",
  "site.primer.plantuml.syntax.c4_context":
    "Person(), System() y Rel() describen personas, el sistema y un enlace. La biblioteca se incorpora con !include.",
  "site.primer.mermaid.kw.participant":
    "Un participante de secuencia. as sustituye la etiqueta visible.",
  "site.primer.mermaid.kw.arrow":
    "Un mensaje: ->> es una flecha continua, -->> es una respuesta punteada.",
  "site.primer.mermaid.kw.alt":
    "Ramas de secuencia. else es la otra rama y end cierra el bloque.",
  "site.primer.mermaid.kw.note": "Una nota a la derecha de un participante, o sobre varios.",
  "site.primer.mermaid.kw.subgraph": "Un grupo de nodos de diagrama de flujo. Ciérrelo con end.",
  "site.primer.mermaid.kw.class": "Una clase con campos y métodos dentro de classDiagram.",
  "site.primer.mermaid.kw.section": "Un grupo de tareas en un diagrama de Gantt.",
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD fija la dirección. Un paso es [text], una decisión es {text}, un inicio es ([text]). Una flecha es -->, y la etiqueta de una rama es |yes|.",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram abre el diagrama. actor y participant con as nombran una línea de vida. Una petición es ->>, una respuesta es -->>.",
  "site.primer.mermaid.syntax.class":
    "classDiagram abre el diagrama. class Name { } contiene campos +nombre tipo y métodos. Un enlace es -->.",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 abre el diagrama. [*] es el inicio. Una transición es -->, y la etiqueta va después de los dos puntos.",
  "site.primer.mermaid.syntax.er":
    "erDiagram abre el diagrama. ||--o{ se lee como uno a muchos, y el rol va después de los dos puntos.",
  "site.primer.mermaid.syntax.gantt":
    "gantt abre el gráfico. title es el título, dateFormat es el patrón de fecha, section es un grupo. Una tarea es nombre :id, fecha, duración.",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap abre el mapa. La raíz es root((tema)). La sangría fija el anidamiento.",
  "site.primer.mermaid.syntax.pie":
    "pie showData imprime los números. title es el título. Un sector es \"nombre\" : número.",
  "site.primer.mermaid.syntax.journey":
    "journey abre el recorrido. title es el título, section es una etapa. Una tarea es nombre: puntuación: rol.",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph abre el historial. commit es un commit, branch es una rama, checkout cambia de rama y merge une.",
  "site.primer.mermaid.syntax.timeline":
    "timeline abre la escala. title es el título, section es un periodo. Los eventos van después de los dos puntos.",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta abre los flujos. Cada línea es origen,destino,peso. Los nombres de nodo son ASCII; ponga entre comillas un nombre que contenga una coma. Las opciones no son columnas CSV: defínalas en una cabecera YAML config.sankey antes de la palabra clave (showValues, prefix, suffix, linkColor, nodeAlignment, width, height, useMaxWidth, nodeWidth, nodePadding, labelStyle, nodeColors).",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta abre el gráfico. x-axis son las categorías, y-axis es el rango, bar y line son series.",
  "site.primer.mermaid.syntax.block":
    "block-beta abre los bloques. columns fija cuántas columnas hay. Un bloque es id[\"etiqueta\"], un enlace es -->.",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context abre el contexto. Person() y System() declaran elementos, Rel() es un enlace.",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram abre el diagrama. requirement { } es un requisito, element { } es un elemento, el enlace es satisfies.",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart abre los cuadrantes. x-axis y y-axis son los ejes, quadrant-1 … quadrant-4 son los nombres, un punto es nombre: [x, y].",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta abre el diagrama. group es un grupo, service es un servicio, un enlace es service:R --> L:service.",
  "site.primer.mermaid.syntax.packet":
    "packet-beta abre el paquete. title es el título. Un campo es un rango de bits y una etiqueta, por ejemplo 0-15: \"Origen\".",
  "site.ext.mermaid.title": "Extensión Mermaid Ext",
  "site.ext.mermaid.lead":
    "Cinco tipos de diagrama que Mermaid por sí solo no tiene: cascada, burbujas, mapa de calor, organigrama y valor ganado. Los dibuja un motor integrado, sin servicios externos.",
  "site.ext.mermaid.note":
    "Los cinco tipos los dibuja el motor integrado, sin servicios externos. Si el ejemplo de abajo no se renderiza en el editor, esta compilación se hizo sin la extensión.",
  "site.ext.mermaid.type.waterfall": "Cascada",
  "site.ext.mermaid.type.bubble": "Burbujas",
  "site.ext.mermaid.type.heatmap": "Mapa de calor",
  "site.ext.mermaid.type.orgchart": "Organigrama",
  "site.ext.mermaid.type.ev": "Valor ganado",
  "site.ext.mermaid.type.boxplot": "Diagrama de caja",
  "site.ext.mermaid.type.treemap": "Mapa de árbol",
  "site.ext.mermaid.type.radar": "Gráfico de radar",
  "site.ext.mermaid.type.voronoi": "Teselación de Voronoi",
  "site.ext.mermaid.type.clustered": "Gráfico de series",
  "site.ext.mermaid.desc.waterfall":
    "Cómo un valor inicial se convierte en un total mediante pasos + y −. Las columnas absolutas empiezan por =, y varios escenarios se declaran con series. Se admiten cortes de eje, modo en blanco y negro (mono y mono invert) y colores personalizados.",
  "site.ext.mermaid.desc.bubble":
    "Tres dimensiones a la vez: x, y y el tamaño de la burbuja. Opcionalmente, cuadrantes BCG y grupos de color.",
  "site.ext.mermaid.desc.heatmap":
    "Una matriz de valores con una escala de color. Los rangos de la escala son explícitos; una celda vacía (dos separadores seguidos) se dibuja en gris.",
  "site.ext.mermaid.desc.orgchart":
    "Un árbol de reporte con aristas explícitas: la continua es la línea principal, la punteada -.-> es un responsable secundario. Un bloque puede fijar su relleno (color) y su borde (border, style). Varias raíces se agrupan bajo una raíz invisible.",
  "site.ext.mermaid.desc.ev":
    "Tres curvas acumuladas por día: valor planificado PV, valor ganado EV y coste real AC. Además, las desviaciones SV y CV en la leyenda.",
  "site.ext.mermaid.desc.boxplot":
    "Distribución por categorías: mínimo, cuartiles inferior y superior (Q1, Q3), mediana, máximo, media y valores atípicos. Acepta un resumen explícito de cinco números o observaciones en bruto (values=).",
  "site.ext.mermaid.desc.treemap":
    "Partición jerárquica en rectángulos de grupos y elementos proporcional al peso numérico, con porcentajes automáticos y sombreado de color.",
  "site.ext.mermaid.desc.radar":
    "Compara varias series en ejes radiales desde un centro común, con anillos de cuadrícula, opacidad de relleno y colores personalizados.",
  "site.ext.mermaid.desc.voronoi":
    "Partición geométrica de un plano en celdas convexas del vecino más cercano, con grupos de color y etiquetas en el centroide.",
  "site.ext.mermaid.desc.clustered":
    "Barras de varias series por categorías, una al lado de la otra o apiladas, con líneas superpuestas, niveles horizontales, un corte de eje, llamadas de CAGR, un giro de 90 grados (rotate 90), un eje vertical invertido (invert y) y modo en blanco y negro (mono, mono invert).",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall abre el gráfico. y fija el eje. = es una columna absoluta, + y - son un paso, y la etiqueta va después de los dos puntos. \\n en una etiqueta parte la línea.",
  "site.ext.mermaid.syntax.bubble":
    "bubble abre el gráfico. x, y y size fijan los ejes y el tamaño. Dentro de data un punto es nombre : x=, y=, size=. \\n en un nombre parte la línea.",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap abre el mapa. x e y son las etiquetas de los ejes. Dentro de data una fila es nombre : números separados por comas. \\n en una etiqueta parte la línea.",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart abre el árbol. Un nodo es id [rol\\nnombre] (\\n parte la línea y la caja se ajusta al texto); color=#hex fija el relleno, border=#hex y style=solid|dash|dot|dashdot fijan el color y el estilo del borde. Una arista continua es ->, un responsable secundario es -.->.",
  "site.ext.mermaid.syntax.ev":
    "ev abre el gráfico. days son los días, pv es el plan, ev es el valor ganado y ac es el coste real. \\n en la etiqueta de un día parte la línea.",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot abre el gráfico. Fila de categoría: Nombre : min=, q1=, median=, q3=, max= (o values=v1, v2, …) con color=#hex opcional. \\n en un nombre parte la línea.",
  "site.ext.mermaid.syntax.treemap":
    "treemap abre el mapa. Fila: Grupo / Elemento : peso [color=#hex]. labels controla la visualización del valor y del porcentaje. \\n en un nombre parte la línea.",
  "site.ext.mermaid.syntax.radar":
    "radar abre el gráfico. axes enumera las etiquetas de los radios, series Nombre : v1, v2, … define una serie de datos. \\n en una etiqueta parte la línea.",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi abre la teselación. Dentro de data un sitio es Nombre : x=, y=, group=, color=#hex. \\n en un nombre parte la línea.",
  "site.ext.mermaid.syntax.clustered":
    "series abre el gráfico. categories enumera las categorías, series Nombre : v1, v2, … dibuja barras, y el nombre puede omitirse (`series : v1, v2`); un hueco vacío, \"-\" o null omite una barra. line Etiqueta : v1, v2, … dibuja una línea, y la etiqueta puede omitirse (`line : v1, v2`) (un hueco omitido une los puntos de ambos lados), con la etiqueta a la derecha del gráfico; color y style=solid|dash|dot|dashdot definen el trazo. line 160 \"plan\" dibuja un nivel horizontal (sin dos puntos). break 200 --> 700 recorta un tramo del eje. cagr es el CAGR desde la primera barra hasta la última, cagr 2, 7 une esas barras; format, prefix y label controlan el óvalo. format=\"±0.0%\" añade un signo más solo cuando el valor es positivo. Las flechas que no se solapan comparten un nivel. Las líneas cagr consecutivas se aplican a una serie. stacked apila las series, stacked off pone las barras una al lado de la otra, rotate 90 gira el gráfico. invert y junto con rotate 90 coloca la primera categoría abajo, e invert y off restaura el orden de arriba abajo. y2 \"etiqueta\" 0 --> 40 dibuja una segunda escala (a la derecha, arriba con rotate 90), y axis=y2 vincula una serie, línea o nivel a ella. \\n en una etiqueta parte la línea.",
  "site.primer.graphml.kw.graphml":
    "La raíz del documento. El espacio de nombres de GraphML es obligatorio.",
  "site.primer.graphml.kw.graph":
    "El grafo en sí. edgedefault es directed o undirected.",
  "site.primer.graphml.kw.node": "Un vértice. id debe ser único.",
  "site.primer.graphml.kw.edge": "Una arista. source y target se refieren a los id de los nodos.",
  "site.primer.graphml.kw.key": "Declara un atributo para nodos o aristas.",
  "site.primer.graphml.kw.data":
    "Un valor de atributo. La etiqueta visible vive aquí, no en el id.",
  "site.primer.graphml.syntax.directed":
    "graphml es la raíz, graph edgedefault=\"directed\" es un grafo dirigido. node es un vértice, edge source y target es una arista, data es la etiqueta.",
  "site.primer.graphml.syntax.undirected":
    "La misma forma, con edgedefault=\"undirected\": una arista solo conecta nodos.",
  "site.primer.wiremark.kw.wireframe":
    "Una pantalla. El nombre después de # es el ancla a la que enlazan otras pantallas.",
  "site.primer.wiremark.kw.flow":
    "Conecta varias pantallas. LR dibuja los enlaces de izquierda a derecha.",
  "site.primer.wiremark.kw.stack":
    "Una columna o una fila. gap fija el espaciado y la sangría fija el anidamiento.",
  "site.primer.wiremark.kw.typography":
    "Texto. h4 y body1 eligen el nivel, y la cadena entre comillas es la etiqueta.",
  "site.primer.wiremark.kw.textfield":
    "Una entrada. La etiqueta va entre comillas; los ajustes como required no.",
  "site.primer.wiremark.kw.button":
    "Un botón. contained lo rellena, to=#id salta a otra pantalla.",
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #anchor abre una pantalla. Stack construye una columna, Typography es texto, TextField es una entrada y Button es un botón.",
  "site.primer.wiremark.syntax.flow":
    "Flow LR enlaza pantallas de izquierda a derecha. to=#anchor en un botón salta a otro Wireframe.",
  "site.primer.d2.kw.direction":
    "Dirección del diseño: down, right, left o up.",
  "site.primer.d2.kw.shape":
    "Forma del nodo: person, cylinder, class, sql_table, sequence_diagram.",
  "site.primer.d2.kw.arrow": "Un enlace entre nodos. La etiqueta va después de los dos puntos.",
  "site.primer.d2.kw.style": "Estilo del nodo: relleno, trazo y fuente.",
  "site.primer.d2.kw.constraint":
    "Una restricción de columna SQL: primary_key, foreign_key o unique.",
  "site.primer.d2.syntax.flowchart":
    "direction fija el diseño. shape: person y shape: cylinder son formas de nodo. Un enlace es -> con una etiqueta después de los dos puntos.",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram convierte el bloque en una secuencia. Los participantes son nodos anidados, un mensaje es ->.",
  "site.primer.d2.syntax.class":
    "shape: class convierte el bloque en una clase. Los campos y los métodos son líneas dentro del bloque, un enlace es ->.",
  "site.primer.d2.syntax.er":
    "shape: sql_table convierte el bloque en una tabla. constraint: primary_key y foreign_key marcan las claves, un enlace es campo -> campo.",
  "site.primer.d2.syntax.architecture":
    "Los bloques anidados agrupan nodos. shape fija la forma, -> es un enlace etiquetado.",
  "site.primer.structurizr.kw.workspace":
    "La raíz del documento: un nombre y una descripción breve del modelo.",
  "site.primer.structurizr.kw.person": "Una persona que usa el sistema.",
  "site.primer.structurizr.kw.softwareSystem": "Un sistema de software en el modelo.",
  "site.primer.structurizr.kw.container":
    "Una aplicación o un almacén de datos dentro de un sistema. El tercer argumento es la tecnología.",
  "site.primer.structurizr.kw.arrow":
    "Quién llama a quién. La etiqueta de la relación va entre comillas.",
  "site.primer.structurizr.kw.views": "Qué vistas dibujar a partir del modelo.",
  "site.primer.structurizr.kw.autolayout":
    "Diseño automático de la vista: tb es de arriba abajo, lr es de izquierda a derecha.",
  "site.primer.structurizr.syntax.c4_context":
    "workspace abre el documento. person y softwareSystem describen el modelo, -> es una relación, systemContext y autolayout construyen la vista.",
  "site.primer.structurizr.syntax.c4_container":
    "container dentro de softwareSystem es una aplicación. Una vista container e include * reúnen los contenedores.",
  "site.primer.structurizr.syntax.component":
    "component dentro de container describe un módulo. Una vista component dibuja ese contenedor.",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment y deploymentNode describen el entorno. containerInstance coloca un contenedor en un nodo, y una vista deployment dibuja el diagrama.",
  "site.stackLead": "Interfaz:",
  "site.hero.ctaPrimary": "Abrir el editor sin registrarse",
  "site.hero.ctaSecondary": "📲 Instalar en el escritorio o el teléfono",
  "site.hero.trustOffline":
    "📶 Funciona sin conexión: las funciones principales y el conversor están disponibles sin internet.",
  "site.hero.trustAi":
    "🤖 IA y asistente: genere diagramas a partir de texto o mediante un flujo guiado paso a paso.",
  "site.hero.trustConverter":
    "🔄 Conversor 3 en 1: traducción instantánea entre PlantUML, Mermaid y GraphML.",
  "site.hero.trustPwa":
    "💻 Aplicación PWA: instálela en Windows, macOS, Linux, iOS y Android.",

  "site.pillars.title": "Todo lo de Diagrams-as-Code en una aplicación autónoma",
  "site.pillars.item1.title": "🤖 Creación inteligente (IA y asistente)",
  "site.pillars.item1.text":
    "¿No quiere escribir la sintaxis a mano? Describa su arquitectura en texto claro para el asistente de IA o responda a las preguntas del asistente paso a paso. Obtenga código de diagrama limpio y válido en segundos.",
  "site.pillars.item2.title": "⚡️ Conversión y edición (editor en vivo)",
  "site.pillars.item2.text":
    "Un editor en línea cómodo, con vista previa instantánea. Convierta PlantUML a Mermaid, Mermaid a GraphML y de vuelta en un clic. Olvide los problemas de compatibilidad entre Notion, GitHub y Draw.io.",
  "site.pillars.item3.title": "📲 PWA, modo sin conexión y almacenamiento",
  "site.pillars.item3.text":
    "Instale Code2Graph como una aplicación nativa en el portátil o la tableta. El trabajo y los proyectos se guardan en local y en la nube, así que puede diseñar arquitectura en un avión o sin conectividad.",

  "site.deepDive.title": "Control total de la documentación de su arquitectura",
  "site.deepDive.item1.title": "🔄 Conversor de formatos en ambos sentidos",
  "site.deepDive.item1.text":
    "Pase diagramas GraphML heredados a los estándares modernos de Mermaid o PlantUML sin perder enlaces, nodos ni la estructura lógica.",
  "site.deepDive.item2.title": "📝 Editor en vivo potente",
  "site.deepDive.item2.text":
    "Resaltado de sintaxis, sugerencias y autocompletado. Renderizado instantáneo, sin esperas.",
  "site.deepDive.item3.title": "☁️ Almacenamiento y acceso local",
  "site.deepDive.item3.text":
    "Guarde los diagramas en una biblioteca privada. Caché automática de la PWA para trabajar sin conexión con seguridad.",
  "site.deepDive.item4.title": "📤 Exportación en un clic",
  "site.deepDive.item4.text":
    "Descargue diagramas en vectorial (SVG) o en mapa de bits (PNG). Copie el código listo al portapapeles para Markdown / Confluence.",

  "site.formats.title": "Una herramienta para todos los estándares clave",
  "site.formats.colFormat": "Formato",
  "site.formats.colPurpose": "Uso",
  "site.formats.colFeatures": "Capacidades de Code2Graph",
  "site.formats.plantuml.purpose": "UML complejo, secuencia, clases y estados",
  "site.formats.plantuml.features": "Edición, generación con IA, conversión a Mermaid/GraphML",
  "site.formats.plantuml.summary":
    "UML de texto para secuencias, clases, estados, C4 y más. Code2Graph lo renderiza sin conexión con @plantuml/core y el motor de diseño Smetana. Los diagramas C4 y ArchiMate usan las bibliotecas estándar de PlantUML correspondientes.",
  "site.formats.mermaid.purpose": "Diagramas ligeros para GitHub, Notion, Obsidian y Jira",
  "site.formats.mermaid.features": "Vista previa en vivo, generación con el asistente, exportación",
  "site.formats.mermaid.summary":
    "Un lenguaje compacto de diagramas para Markdown, GitHub y notas. El editor renderiza Mermaid en el navegador; el modo en línea también puede usar mermaid.ink.",
  "site.formats.graphml.purpose": "Grafos de topología para yEd, Draw.io y sistemas de visualización",
  "site.formats.graphml.features": "Importación, visualización, ejemplos, conversión a código",
  "site.formats.graphml.summary":
    "Un formato de grafo XML usado por yEd y otras herramientas. Code2Graph lee GraphML y dispone el grafo con dagre.",
  "site.formats.wiremark.purpose": "Bocetos de interfaz a mano dentro de markdown",
  "site.formats.wiremark.features": "Edición, vista previa en vivo, pantallas de ejemplo",
  "site.formats.wiremark.summary":
    "Bocetos de texto con aspecto de apunte. La vista previa de la aplicación la dibuja @wiremark/core.",
  "site.formats.d2.purpose": "Diagramas modernos: arquitectura, secuencia, clases y SQL",
  "site.formats.d2.features": "Edición, vista previa sin conexión, ejemplos del lenguaje seleccionado",
  "site.formats.d2.summary":
    "Un lenguaje moderno de diagramas para arquitectura, secuencias, clases y SQL. La vista previa sin conexión la compila @d2lang/d2.",
  "site.formats.structurizr.purpose": "Arquitectura C4 como código: contexto, contenedores, componentes, despliegue",
  "site.formats.structurizr.features": "Edición, vista previa C4 sin conexión, ejemplos del lenguaje seleccionado",
  "site.formats.structurizr.summary":
    "Arquitectura C4 como código: paisaje, contexto, contenedores, componentes y despliegue. El editor conserva Structurizr DSL y dibuja las vistas con PlantUML C4.",

  "site.audience.title": "Acelera a todo el equipo de ingeniería",
  "site.audience.architect.title": "🏛 Arquitectos de software",
  "site.audience.architect.item1": "Esboce rápido modelos C4 y diagramas conceptuales con IA.",
  "site.audience.architect.item2": "Lleve toda la documentación de la empresa a un único estándar.",
  "site.audience.dev.title": "👨‍💻 Desarrolladores y responsables de equipo",
  "site.audience.dev.item1": "Cree diagramas de secuencia mientras diseña las tareas.",
  "site.audience.dev.item2": "Trate los diagramas como código, guárdelos en Git y edítelos sin conexión.",
  "site.audience.writer.title": "📝 Redactores técnicos y analistas de negocio",
  "site.audience.writer.item1": "Use el asistente paso a paso para describir procesos de negocio.",
  "site.audience.writer.item2":
    "Convierta diagramas con facilidad para distintas plataformas (Notion/Confluence).",

  "site.gettingStarted.title": "Empiece en 10 segundos, sin una configuración compleja",
  "site.gettingStarted.browser.title": "Opción A: en el navegador",
  "site.gettingStarted.browser.text":
    "Abra Code2Graph.ru y empiece a crear o convertir diagramas al momento.",
  "site.gettingStarted.pwa.title": "Opción B: como aplicación PWA",
  "site.gettingStarted.pwa.text":
    "Pulse Instalar aplicación en la barra de direcciones del navegador o en la página de inicio. Code2Graph aparecerá en el escritorio o en la pantalla de inicio del teléfono.",

  "site.faq.title": "Preguntas frecuentes",
  "site.faq.q1": "¿Qué es una PWA y cómo funciona el modo sin conexión?",
  "site.faq.a1":
    "Una aplicación web progresiva permite usar el sitio como un programa normal en el dispositivo. Tras la primera carga, la aplicación se guarda en caché local, así que puede convertir, editar y ver diagramas sin internet.",
  "site.faq.q2": "¿La generación con IA funciona sin conexión?",
  "site.faq.a2":
    "La edición manual, la conversión de formatos, el asistente paso a paso y el almacenamiento funcionan sin conexión. Las peticiones a la IA requieren conexión de red.",
  "site.faq.q3": "¿Puedo convertir diagramas PlantUML a Mermaid sin perder datos?",
  "site.faq.a3":
    "Sí. El conversor integrado traduce la sintaxis y los nodos para conservar la lógica del diagrama original.",
  "site.faq.q4": "¿Es seguro guardar diagramas en Code2Graph?",
  "site.faq.a4":
    "Por completo. Los diagramas se guardan localmente en el navegador o en la aplicación PWA y, con una cuenta, se almacenan de forma segura en su nube privada.",

  "site.finalCta.title": "Su navaja suiza para Diagrams-as-Code",
  "site.finalCta.text":
    "Genere con IA, edite, convierta y guarde diagramas PlantUML, Mermaid y GraphML en un solo lugar. Disponible ahora en cualquier dispositivo.",
  "site.finalCta.primary": "Abrir Code2Graph",
  "site.finalCta.secondary": "📲 Instalar la PWA",

  "site.featureOffline": "Funciona sin conexión y mediante file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "Generación y edición de diagramas con IA",
  "site.featureLibrary": "Biblioteca de diagramas en la nube",
  "site.featureLlmLocal": "Las claves de LLM BYOK se quedan en el navegador",
  "site.loginTitle": "Iniciar sesión",
  "site.loginSubtitle": "Cuenta personal y biblioteca en la nube",
  "site.registerTitle": "Registrarse",
  "site.registerSubtitle": "Cree una cuenta en el servidor de Code2Graph",
  "site.accountTitle": "Cuenta",
  "site.staticModeTitle": "Edición local",
  "site.staticModeText":
    "Esta compilación funciona sin servidor ni base de datos: los diagramas se quedan en el navegador. El inicio de sesión y la biblioteca en la nube están en la edición de servidor.",
  "site.username": "Usuario",
  "site.password": "Contraseña",
  "site.passwordConfirm": "Confirmar contraseña",
  "site.rememberMe": "Recordarme",
  "site.loginSubmit": "Iniciar sesión",
  "site.registerSubmit": "Crear cuenta",
  "site.logout": "Cerrar sesión",
  "site.openEditor": "Abrir el editor",
  "site.backHome": "Volver al inicio",
  "site.mcp.title": "MCP para agentes",
  "site.mcp.connected": "Conectado",
  "site.mcp.disconnected": "Sin conexión",
  "site.mcp.lead":
    "Un agente describe un diagrama con palabras. Code2Graph elige el lenguaje y devuelve el código fuente y una imagen de PlantUML, Mermaid, GraphML, WireMark, D2 o Structurizr.",
  "site.mcp.pointPlan": "plan_diagram elige el lenguaje y el tipo de diagrama.",
  "site.mcp.pointGenerate": "generate_diagram devuelve el código fuente del diagrama y una imagen.",
  "site.mcp.exampleCaption":
    "Un resultado de generate_diagram es código fuente que el editor puede abrir, más una imagen renderizada del diagrama.",
  "site.mcp.exampleSource": "Código fuente",
  "site.mcp.exampleImage": "Imagen",
  "site.mcp.pointLanguages": "Los mismos seis lenguajes que el editor y el asistente.",
  "site.mcp.openPage": "Cómo conectar MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "El servidor MCP permite que Cursor y otros agentes pidan un diagrama a Code2Graph. Elige un lenguaje a partir de la petición y devuelve el código fuente más una imagen del diagrama.",
  "site.mcp.toolsTitle": "Herramientas",
  "site.mcp.toolList": "lenguajes del sitio y los tipos de diagrama que acepta cada uno.",
  "site.mcp.toolPlan": "lenguaje y tipo para una frase, sin código fuente.",
  "site.mcp.toolGenerate":
    "código fuente del diagrama y una imagen. Con CODE2GRAPH_API_URL el código fuente viene del servidor; si no, el mismo esquema se construye en local. La imagen es un bloque aparte: Kroki dibuja PlantUML, D2 y Structurizr, mermaid.ink dibuja Mermaid, y GraphML y WireMark se dibujan en local.",
  "site.mcp.connectTitle": "Conectar en Cursor",
  "site.mcp.connectText":
    "Ejecute el script desde una copia de este repositorio. Sustituya la ruta por la de su copia. Deje la URL vacía para generar en local, o apúntela a la edición de servidor.",
  "site.mcp.source": "Paquete MCP del repositorio",
  "site.mcp.apiTitle": "API del servidor",
  "site.mcp.apiText":
    "La edición de servidor expone estas rutas. Si AGENT_API_TOKEN está definido, envíe Authorization: Bearer con el mismo valor que CODE2GRAPH_API_TOKEN.",
  "site.mcp.apiFormats": "lenguajes y tipos",
  "site.mcp.apiPlan": "elegir un lenguaje",
  "site.mcp.apiScaffold": "lenguaje, tipo y código fuente",
  "site.mcp.staticNote":
    "GitHub Pages es un editor estático y no sirve /api/agent. La API se ejecuta en la edición de servidor, por ejemplo www.code2graph.ru.",
  "site.mcp.catalogTitle": "Catálogo de capacidades",
  "site.mcp.catalogText":
    "El catálogo está en /llm/ en este mismo host. El proceso MCP local lee esas mismas páginas del disco y no llama a otro servidor para la sintaxis. La respuesta es el código para el editor, sin imagen y sin un renderizador externo.",
  "site.mcp.toolCapabilities":
    "una página índice de lenguajes, o de uno si se indica el lenguaje. No incluye el cuerpo de las fichas.",
  "site.mcp.toolSyntax":
    "una página de sintaxis por palabras clave o por una ruta de un enlace anterior. Las páginas enlazadas no se unen.",
  "site.noAccount": "¿No tiene cuenta?",
  "site.hasAccount": "¿Ya tiene una cuenta?",
  "site.role": "Rol",
  "site.loginError": "Usuario o contraseña no válidos",
  "site.registerError": "El registro falló",
  "site.registerDisabled": "El administrador ha desactivado el registro",
  "site.registerStatusError":
    "No se pudo comprobar el estado del servidor. Verifique la conexión e inténtelo de nuevo.",
  "site.registerMismatch": "Las contraseñas no coinciden",
  "site.registerRequired": "Rellene todos los campos",
  "site.welcomeUser": "Sesión iniciada como {username}",
  "site.versionHint": "Versión del sitio: compárela después de una actualización o de recargar la página",
  "site.footer.links": "Enlaces del proyecto",
  "site.license.title": "Licencia",
  "site.license.summary":
    "Código disponible bajo la Prosperity Public License 3.0.0. Gratis para uso no comercial.",
  "site.license.commercial":
    "El uso comercial es gratis durante una prueba de 30 días; después hace falta una licencia de pago.",
  "site.license.read": "Leer la licencia",
  "site.license.commercialLink": "Licencia comercial",
  "site.landing.showcaseTitle": "Míralo, haz clic, edítalo",
  "site.landing.showcaseHint": "Cada imagen siguiente se abre en el editor",
  "site.landing.tryScenario": "Probar este escenario",
  "site.landing.openInEditor": "Abrir en el editor",
  "site.landing.allFormats": "6 lenguajes, un editor",
  "site.landing.privacyTitle": "Privado en tu dispositivo",
  "site.landing.privacyLocal": "Los diagramas se dibujan en tu navegador",
  "site.landing.privacyKey": "Tu clave de IA se queda en tu navegador",
  "site.landing.privacyCloud": "Nube solo con cuenta; la IA usa la red de tu proveedor",
  "site.landing.platformTitle": "Donde trabajes",
  "site.landing.platformDevices": "Windows · macOS · Linux · iOS · Android",
  "site.landing.platformSame": "Navegador o app instalada: el mismo editor",
  "site.landing.platformOffline": "Funciona sin conexión tras la primera carga",
  "site.landing.heroAlt": "Se escribe código y el diagrama se construye en vivo",
  "site.landing.converterAlt": "PlantUML a Mermaid en un clic, el diagrama no cambia",
  "site.landing.mcpAlt": "Pedir a un agente de IA en Cursor y recibir el diagrama",
  "site.landing.audience.developers": "Desarrolladores",
  "site.landing.audience.analysts": "Analistas",
  "site.landing.audience.managers": "Gerentes",
  "site.landing.audience.students": "Estudiantes",
  "site.landing.audience.vibecoders": "Vibe coders",
  "site.landing.usp.developers": "Secuencia y C4 en la revisión: diagrama como código, en Git y en el diff",
  "site.landing.usp.analysts": "Un proceso sin sintaxis: el asistente pregunta y el diagrama queda listo",
  "site.landing.usp.managers": "Plan y estado en una imagen: Gantt y gráficos a la presentación en un clic",
  "site.landing.usp.students": "Un diagrama en un minuto: plantillas, ayudas, sin instalar nada",
  "site.landing.usp.vibecoders": "El agente dibuja, tú editas: MCP da a Cursor código e imagen",
  "site.ext.mermaid.type.histogram": "Histograma",
  "site.ext.mermaid.desc.histogram": "Conteos o densidad por intervalo, con una curva de distribución ajustada o dada, media, mediana y un intervalo de confianza.",
  "site.ext.mermaid.syntax.histogram": "histogram abre el gráfico (alias hist y dist). series Nombre : v1, v2, … es una muestra; una celda vacía, na, n/a, null, none, nan, -, — o . es un faltante. bins auto, bins N, binwidth W o bins a --> b, b --> c fijan los intervalos. scale count o scale density fija la altura. fit normal estima la curva y curve weibull shape=1.6 scale=28 dibuja parámetros dados. stats lista mean median sd var ci, y ci 0.95 es el intervalo de la media. labels, gap, colors, mono, rotate 90, fontsize, ratio, grid, axis y line funcionan como en series.",
} as const satisfies LocaleMessages;
