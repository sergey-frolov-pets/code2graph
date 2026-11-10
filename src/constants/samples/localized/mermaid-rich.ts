import type { AppLocale } from "@/constants/i18n";

type MermaidRichExtraId =
  | "component"
  | "activity"
  | "mindmap"
  | "pie"
  | "journey"
  | "gitgraph"
  | "timeline"
  | "sankey"
  | "xychart"
  | "block"
  | "c4_context"
  | "requirement"
  | "quadrant"
  | "architecture"
  | "packet";

const PIE_INIT = `%%{init: {'theme': 'base', 'pie': {'textPosition': 0.72, 'donutHole': 0.42, 'legendPosition': 'bottom', 'highlightSlice': 'Mermaid'}, 'themeVariables': {'pie1': '#1f6feb', 'pie2': '#2da44e', 'pie3': '#8250df', 'pie4': '#bf8700', 'pie5': '#cf222e', 'pie6': '#57606a', 'pieTitleTextSize': '20px', 'pieSectionTextSize': '14px', 'pieLegendTextSize': '14px', 'pieStrokeColor': '#ffffff', 'pieStrokeWidth': '2px', 'pieOuterStrokeWidth': '3px', 'pieOuterStrokeColor': '#ffffff', 'pieOpacity': '0.9'}}}%%`;

const PIE_SLICES = `    "PlantUML" : 28
    "Mermaid" : 24
    "D2" : 16
    "GraphML" : 12
    "Structurizr" : 12
    "WireMark" : 8`;

const PIE_THEME_KEYS = `    %% themeVariables: pieTitleTextSize (25px), pieTitleTextColor, pieSectionTextSize (17px), pieSectionTextColor
    %% pieLegendTextSize (17px), pieLegendTextColor, pieStrokeColor (black), pieStrokeWidth (2px)
    %% pieOuterStrokeWidth (2px), pieOuterStrokeColor (black), pieOpacity (0.7)`;

const ACTIVITY_STYLE = `    classDef ok fill:#E8F5E9,stroke:#2E7D32
    classDef stop fill:#FFEBEE,stroke:#C62828
    class D,F,G,H,I ok
    class E,J stop
    linkStyle 2 stroke:#C62828,stroke-width:2px`;

const XY_INIT = `%%{init: {'themeVariables': {'xyChart': {'plotColorPalette': '#2563eb, #f59e0b'}}}}%%`;

const XY_SERIES = `    bar [20, 35, 40, 55, 70, 90]
    line [18, 30, 42, 50, 68, 88]`;

const XY_AXIS_KEYS = `    %% xAxisLabelColor, xAxisTitleColor, xAxisTickColor, xAxisLineColor
    %% yAxisLabelColor, yAxisTitleColor, yAxisTickColor, yAxisLineColor`;

const XY_CONFIG_KEY_LINES = `    %% legendFontSize, legendPadding, chartOrientation, plotReservedSpacePercent
    %% showDataLabel, showDataLabelOutsideBar`;

const XY_TICK_KEYS = `    %% showTick, tickLength, tickWidth, showAxisLine, axisLineWidth, labelRotation`;

const SANKEY_ROWS_ENTRY = `Ads,Site,90
Direct,Site,40
Email,Site,25
Referral,Site,15`;

const SANKEY_ROWS_SITE = `Site,Catalog,80
Site,Search,50
Site,"Bounce, no click",40`;

const SANKEY_ROWS_FIND = `Catalog,Product,55
Catalog,Compare,25
Search,Product,30
Search,Compare,20`;

const SANKEY_ROWS_CHOOSE = `Product,Cart,60
Product,Wishlist,25
Compare,Cart,30
Compare,"Leave, compare",15`;

const SANKEY_ROWS_WISH = `Wishlist,Cart,10
Wishlist,"Saved, later",15`;

const SANKEY_ROWS_PAY = `Cart,Checkout,85
Cart,Abandoned,15
Checkout,"Pay, card",50
Checkout,"Pay, invoice",25
Checkout,"Drop, checkout",10
"Pay, card",Paid,48
"Pay, card","Fail, card",2
"Pay, invoice",Paid,22
"Pay, invoice",Unpaid,3
Paid,Repeat,28
Paid,One-off order,42`;

const SANKEY_CONFIG = `%% ---
%% config:
%%   sankey:`;

const SANKEY_NODE_COLORS = `%%       Paid: "#2e7d32"
%%       Abandoned: "#c62828"`;

const MERMAID_RICH_EXTRA_DATA = {
  es: {
    component: `C4Component
title Componentes del API
Container_Boundary(api, "API", "Java") {
  Component(orders, "Pedidos", "Spring", "Crea un pedido")
  Component(catalog, "Catálogo", "Spring", "Devuelve productos")
  ComponentDb(cache, "Caché", "Redis", "Tarjetas calientes")
  ComponentQueue(events, "Eventos", "Kafka", "Hechos del pedido")
}
ContainerDb(db, "Base de datos", "PostgreSQL", "Pedidos y productos")
Rel(orders, catalog, "Pide un producto", "JSON")
Rel(orders, db, "Guarda", "JDBC")
Rel(catalog, cache, "Lee", "Redis")
Rel(orders, events, "Publica", "async")`,
    activity: `flowchart LR
    %% Actividad: carriles, decisiones y ramas paralelas
    subgraph Cliente
      A([Inicio]) --> B[Elegir un producto]
    end
    subgraph Tienda
      B --> C{¿Hay stock?}
      C -->|sí| D[Reservar]
      C -->|no| E[Avisar de falta]
      D --> F[Pago]
      F --> G[Recibo]
    end
    subgraph Almacén
      D --> H[Recoger]
      H --> I([Enviar])
    end
    E --> J([Parar])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    Editor
      Código
      Vista previa
      Temas
    Lenguajes
      PlantUML
      Mermaid
      D2
    Exportación
      SVG
      PNG
      Biblioteca`,
    pie: `${PIE_INIT}
pie showData
    title Participación de los lenguajes de ejemplo
    accTitle: Participación de los lenguajes de ejemplo
    accDescr: Gráfico circular de la participación de lenguajes en los ejemplos de Code2Graph
${PIE_SLICES}
    %% La primera línea es pie. showData es opcional: la leyenda muestra entonces "Mermaid [24]"; sin él, solo el nombre.
    %% Título en la misma línea: pie title Texto    o    pie showData title Texto
    %% Título en su propia línea: title Título del gráfico. Las comillas alrededor del título no son obligatorias.
    %% Un sector es "Etiqueta" : número. Las comillas son obligatorias. Los decimales usan punto: 10.25 (docs: hasta dos cifras).
    %% No escriba un signo de porcentaje. El ángulo es valor / suma de todos los valores; la suma no tiene que ser 100.
    %% Un valor negativo es un error. Un sector inferior al 1% de la suma permanece en la leyenda y no se dibuja como arco.
    %% Una etiqueta repetida se ignora. Los sectores avanzan en el sentido de las agujas del reloj según el orden del fuente.
    %% Un comentario es una línea %%. Una línea %%{ ... }%% es una directiva de configuración, no un comentario.
    %% config.pie.textPosition coloca la etiqueta del sector en el radio: 0 en el centro, 1 en el borde exterior. Predeterminado 0.75.
    %% config.pie.donutHole es la proporción del hueco de 0 a 0.9. 0 es un círculo sólido.
    %% config.pie.legendPosition es top, bottom, left, right o center. Predeterminado right.
    %% config.pie.highlightSlice es la etiqueta exacta del sector a resaltar. hover resalta el sector bajo el puntero.
    %% Los colores propios pie1..pie12 se aplican en el tema base: pie1 rellena el primer sector, pie2 el segundo, hasta pie12.
${PIE_THEME_KEYS}
    %% accTitle: título breve para lectores de pantalla
    %% accDescr: descripción para lectores de pantalla. Varias líneas: accDescr { texto }`,
    journey: `journey
    title Compra en la tienda
    section Explorar
      Abrir el catálogo: 5: Comprador
      Comparar productos: 3: Comprador
    section Pago
      Iniciar sesión: 4: Comprador
      Pagar con tarjeta: 2: Comprador, Banco
    section Entrega
      Obtener el seguimiento: 5: Comprador, Almacén`,
    gitgraph: `gitGraph
    %% Andamiaje, editor, vista previa y compilación
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title Historia de Code2Graph
    section Editor
      2024 : PlantUML sin conexión
           : Vista previa SVG
    section Lenguajes
      2025 : Mermaid
           : D2 y GraphML
    section Ahora
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% Embudo de la tienda: varias entradas, divisiones y fusiones.
%% Una fila es CSV de tres columnas: origen,destino,valor.
%% El valor es un número positivo; se permiten decimales (10.5). No hay fila de encabezado.
%% Una línea en blanco entre grupos está permitida y no dibuja nada.
%% Una coma o una comilla en un nombre: envuelva el nombre entre comillas y doble la comilla interna.
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% Una línea que es solo %% sin texto rompe el analizador: ponga texto después de %%.
%% Los nombres de nodo son solo ASCII: el analizador sankey-beta rechaza otros caracteres.
%% Las opciones no son columnas CSV. Defínalas en una cabecera YAML ENCIMA de sankey-beta
%% (o en mermaid.initialize). El bloque de abajo es un comentario: cópielo sin %%.
${SANKEY_CONFIG}
%%     showValues: true       números en los nodos: true | false (predeterminado true)
%%     prefix: ""             texto antes del número, por ejemplo "$"
%%     suffix: ""             texto después del número, por ejemplo " pcs"
%%     linkColor: gradient    source | target | gradient | un color CSS, por ejemplo "#aabbcc"
%%     nodeAlignment: justify uno de: justify, left, right, center
%%     width: 600             ancho en px (predeterminado 600)
%%     height: 400            alto en px (predeterminado 400)
%%     useMaxWidth: false     true — usar el ancho disponible (predeterminado false)
%%     nodeWidth: 10          grosor del nodo en px (Mermaid 11.15+, predeterminado 10)
%%     nodePadding: 12        hueco vertical entre nodos en px (11.15+, predeterminado 12)
%%     labelStyle: legacy     legacy | outlined — un trazo detrás de la etiqueta (11.15+)
%%     nodeColors:            colores por nodo; los demás conservan el tema (11.15+)
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — entradas a la izquierda, nodos sin enlace de salida en el extremo derecho (predeterminado)
%%   left — todos los nodos pegados a la izquierda
%%   right — salidas pegadas a la derecha
%%   center — como left, pero los nodos sin enlace de entrada se mueven a la derecha
%% linkColor:
%%   gradient — mezcla del color de origen al color de destino (predeterminado)
%%   source — el color del nodo de origen
%%   target — el color del nodo de destino
%%   #hex o un nombre de color CSS — un color para cada enlace

%% Entradas al sitio: 90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% El sitio se divide en catálogo, búsqueda y un rebote
${SANKEY_ROWS_SITE}

%% El catálogo y la búsqueda se encuentran en el producto y en comparar
${SANKEY_ROWS_FIND}

%% Producto y comparar: carrito, lista de deseos, salir
${SANKEY_ROWS_CHOOSE}

%% La lista de deseos devuelve parte del flujo al carrito
${SANKEY_ROWS_WISH}

%% Carrito, pago y resultado
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "Pedidos por mes"
    x-axis [Ene, Feb, Mar, Abr, May, Jun]
    y-axis "Pedidos" 0 --> 120
${XY_SERIES}
    %% plotColorPalette colorea las series en el orden de declaración: el primer color es bar, el segundo es line
    %% Comandos: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal dibuja las barras como filas; vertical es el predeterminado y puede omitirse
    %% title "Título del gráfico"
    %% x-axis [clase, "clase con espacio"] — categorías; la longitud de la lista coincide con cada serie
    %% x-axis "Título X" [clase1, clase2] — categorías con un título de eje
    %% x-axis "Título X" min --> max — eje X numérico
    %% y-axis "Título Y" min --> max — título y rango
    %% y-axis "Título Y" — solo el título, el rango se ajusta a los datos
    %% y-axis min --> max — rango sin título
    %% bar [n, n, n] — una serie de barras; varias líneas bar [...] — varias series
    %% bar "Nombre de la serie" [n, n, n] — el nombre se muestra en la leyenda
    %% line [n, n, n] — una línea en los mismos ejes
    %% line "Nombre de la serie" [n, n, n]
    %% line [n "Etiqueta del punto", n] — una etiqueta en un punto de la línea; bar acepta la sintaxis e ignora la etiqueta
    %% accTitle: título breve para lectores de pantalla
    %% accDescr: descripción para lectores de pantalla
    %% Colores de serie: directiva init, themeVariables.xyChart.plotColorPalette = "#color1, #color2"
    %% Claves de tema xyChart: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% Claves de config.xyChart: width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% Claves de xAxis y yAxis: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["Web"]:2
    api["API"]
    space
    db[("Base de datos")]
    queue["Cola"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title Contexto de la tienda
    Person(customer, "Cliente", "Hace pedidos")
    Person_Ext(admin, "Administrador", "Mantiene el catálogo")
    Enterprise_Boundary(studio, "Estudio") {
      System(shop, "Tienda", "Recibe pedidos")
    }
    System_Ext(mail, "Correo", "Mensajes al cliente")
    SystemDb(bank, "Banco", "Pagos")
    Rel(customer, shop, "Hace un pedido", "HTTPS")
    Rel(admin, shop, "Edita el catálogo", "HTTPS")
    Rel(shop, mail, "Envía un mensaje", "SMTP")
    Rel(shop, bank, "Cobra", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "Un comprador hace un pedido"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "El catálogo responde en menos de 200 ms"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "El pago pasa por el banco"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title Prioridades del lanzamiento
    x-axis Valor bajo --> Valor alto
    y-axis Riesgo bajo --> Riesgo alto
    quadrant-1 Hacer primero
    quadrant-2 Validar
    quadrant-3 Después
    quadrant-4 Victorias rápidas
    Editor: [0.85, 0.35]
    Exportación: [0.7, 0.8]
    Temas: [0.25, 0.2]
    Sin conexión: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[Borde]
    group core(server)["Núcleo"]
    service web(internet)[Web] in edge
    service api(server)[API] in core
    service db(database)["Base de datos"] in core
    service queue(disk)[Cola] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title Encabezado del pedido
    0-15: "Origen"
    16-31: "Destino"
    32-47: "Tipo"
    48-63: "Longitud"
    64-95: "Total"`,
  },
  zh: {
    component: `C4Component
title API 组件
Container_Boundary(api, "API", "Java") {
  Component(orders, "订单", "Spring", "创建订单")
  Component(catalog, "目录", "Spring", "返回商品")
  ComponentDb(cache, "缓存", "Redis", "热门卡片")
  ComponentQueue(events, "事件", "Kafka", "订单事实")
}
ContainerDb(db, "数据库", "PostgreSQL", "订单与商品")
Rel(orders, catalog, "请求商品", "JSON")
Rel(orders, db, "保存", "JDBC")
Rel(catalog, cache, "读取", "Redis")
Rel(orders, events, "发布", "async")`,
    activity: `flowchart LR
    %% 活动：泳道、判断与并行分支
    subgraph 客户
      A([开始]) --> B[选择商品]
    end
    subgraph 商店
      B --> C{有库存吗?}
      C -->|是| D[预留]
      C -->|否| E[报告缺货]
      D --> F[付款]
      F --> G[收据]
    end
    subgraph 仓库
      D --> H[拣货]
      H --> I([发货])
    end
    E --> J([停止])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    编辑器
      代码
      预览
      主题
    语言
      PlantUML
      Mermaid
      D2
    导出
      SVG
      PNG
      图库`,
    pie: `${PIE_INIT}
pie showData
    title 示例中各语言占比
    accTitle: 示例中各语言占比
    accDescr: Code2Graph 示例中各语言占比的饼图
${PIE_SLICES}
    %% 第一行是 pie。showData 可选：图例会显示 “Mermaid [24]”；没有它时只显示名称。
    %% 标题写在同一行：pie title 文本    或    pie showData title 文本
    %% 标题单独一行：title 图表标题。标题周围的引号不是必需的。
    %% 扇区是 "标签" : 数字。引号是必需的。小数用点：10.25（文档：最多两位）。
    %% 不要写百分号。角度 = 值 / 所有值之和；总和不必须是 100。
    %% 负值是错误。小于总和 1% 的扇区留在图例中，不画成弧。
    %% 重复的标签会被忽略。扇区按源码顺序顺时针排列。
    %% 注释是 %% 行。%%{ ... }%% 行是配置指令，不是注释。
    %% config.pie.textPosition 把扇区标签放在半径上：0 在中心，1 在外缘。默认 0.75。
    %% config.pie.donutHole 是孔的比例，从 0 到 0.9。0 是实心圆。
    %% config.pie.legendPosition 为 top、bottom、left、right 或 center。默认 right。
    %% config.pie.highlightSlice 是要强调的扇区的准确标签。hover 强调指针下的扇区。
    %% 自定义颜色 pie1..pie12 在 base 主题上生效：pie1 填充第一个扇区，pie2 填充第二个，直到 pie12。
${PIE_THEME_KEYS}
    %% accTitle: 屏幕阅读器的简短标题
    %% accDescr: 屏幕阅读器的描述。多行：accDescr { 文本 }`,
    journey: `journey
    title 商店购物
    section 浏览
      打开目录: 5: 买家
      比较商品: 3: 买家
    section 付款
      登录: 4: 买家
      刷卡支付: 2: 买家, 银行
    section 配送
      获取物流: 5: 买家, 仓库`,
    gitgraph: `gitGraph
    %% 脚手架、编辑器、预览与构建
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title Code2Graph 的历史
    section 编辑器
      2024 : 离线 PlantUML
           : SVG 预览
    section 语言
      2025 : Mermaid
           : D2 与 GraphML
    section 现在
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% 商店漏斗：多个入口、分流与汇合。
%% 一行是三列 CSV：来源,去向,权重。
%% 权重是正数；允许小数 (10.5)。没有表头行。
%% 组与组之间的空行是允许的，而且不会画出来。
%% 名称里有逗号或引号：用引号包住名称，内部引号写两遍。
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% 只有 %% 而没有文字的行会破坏解析：在 %% 后面写上文字。
%% 节点名只能是 ASCII：sankey-beta 解析器拒绝其他字符。
%% 选项不是 CSV 列。把它们写在 sankey-beta 之上的 YAML 头里
%% （或写在 mermaid.initialize 里）。下面的块是注释：复制时去掉 %%。
${SANKEY_CONFIG}
%%     showValues: true       节点上的数字：true | false（默认 true）
%%     prefix: ""             数字前面的文字，例如 "$"
%%     suffix: ""             数字后面的文字，例如 " pcs"
%%     linkColor: gradient    source | target | gradient | CSS 颜色，例如 "#aabbcc"
%%     nodeAlignment: justify 其中之一：justify, left, right, center
%%     width: 600             宽度，像素（默认 600）
%%     height: 400            高度，像素（默认 400）
%%     useMaxWidth: false     true — 使用可用宽度（默认 false）
%%     nodeWidth: 10          节点厚度，像素（Mermaid 11.15+，默认 10）
%%     nodePadding: 12        节点之间的垂直间隙，像素（11.15+，默认 12）
%%     labelStyle: legacy     legacy | outlined — 标签背后的描边（11.15+）
%%     nodeColors:            按节点上色；其余节点保持主题（11.15+）
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — 入口在左，没有出边的节点在最右（默认）
%%   left — 所有节点靠左
%%   right — 出口靠右
%%   center — 像 left，但没有入边的节点向右移
%% linkColor:
%%   gradient — 从来源颜色过渡到去向颜色（默认）
%%   source — 来源节点的颜色
%%   target — 去向节点的颜色
%%   #hex 或 CSS 颜色名 — 所有连线用同一种颜色

%% 进入网站：90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% 网站分流到目录、搜索和跳出
${SANKEY_ROWS_SITE}

%% 目录和搜索在商品与比较处汇合
${SANKEY_ROWS_FIND}

%% 商品与比较：购物车、心愿单、离开
${SANKEY_ROWS_CHOOSE}

%% 心愿单把一部分流量送回购物车
${SANKEY_ROWS_WISH}

%% 购物车、结账与结果
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "按月订单"
    x-axis ["1月", "2月", "3月", "4月", "5月", "6月"]
    y-axis "订单" 0 --> 120
${XY_SERIES}
    %% plotColorPalette 按声明顺序给系列上色：第一个颜色是 bar，第二个是 line
    %% 命令：xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal 把柱画成行；vertical 是默认方向，可以省略
    %% title "图表标题"
    %% x-axis [类, "带空格的类"] — 类别；列表长度与每个系列相同
    %% x-axis "X 标题" [类1, 类2] — 带轴标题的类别
    %% x-axis "X 标题" min --> max — 数值 X 轴
    %% y-axis "Y 标题" min --> max — 标题和范围
    %% y-axis "Y 标题" — 只有标题，范围按数据拟合
    %% y-axis min --> max — 没有标题的范围
    %% bar [n, n, n] — 一个柱系列；多行 bar [...] — 多个系列
    %% bar "系列名称" [n, n, n] — 名称显示在图例中
    %% line [n, n, n] — 同一组坐标上的线
    %% line "系列名称" [n, n, n]
    %% line [n "点标签", n] — 线上某点的标签；bar 接受该语法并忽略标签
    %% accTitle: 屏幕阅读器的简短标题
    %% accDescr: 屏幕阅读器的描述
    %% 系列颜色：init 指令，themeVariables.xyChart.plotColorPalette = "#颜色1, #颜色2"
    %% xyChart 主题键：backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% config.xyChart 键：width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% xAxis 与 yAxis 键：showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["网站"]:2
    api["API"]
    space
    db[("数据库")]
    queue["队列"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title 商店上下文
    Person(customer, "顾客", "下订单")
    Person_Ext(admin, "管理员", "维护目录")
    Enterprise_Boundary(studio, "工作室") {
      System(shop, "商店", "接收订单")
    }
    System_Ext(mail, "邮件", "给顾客的消息")
    SystemDb(bank, "银行", "支付")
    Rel(customer, shop, "下订单", "HTTPS")
    Rel(admin, shop, "编辑目录", "HTTPS")
    Rel(shop, mail, "发送消息", "SMTP")
    Rel(shop, bank, "扣款", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "买家提交订单"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "目录在 200 毫秒内响应"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "付款经由银行"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title 发布优先级
    x-axis 低价值 --> 高价值
    y-axis 低风险 --> 高风险
    quadrant-1 优先做
    quadrant-2 验证
    quadrant-3 以后
    quadrant-4 速赢
    编辑器: [0.85, 0.35]
    导出: [0.7, 0.8]
    主题: [0.25, 0.2]
    离线: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[边缘]
    group core(server)[核心]
    service web(internet)[网站] in edge
    service api(server)[API] in core
    service db(database)[数据库] in core
    service queue(disk)[队列] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title 订单头
    0-15: "源"
    16-31: "目的"
    32-47: "类型"
    48-63: "长度"
    64-95: "合计"`,
  },
  ja: {
    component: `C4Component
title API コンポーネント
Container_Boundary(api, "API", "Java") {
  Component(orders, "注文", "Spring", "注文を作成する")
  Component(catalog, "カタログ", "Spring", "商品を返す")
  ComponentDb(cache, "キャッシュ", "Redis", "ホットカード")
  ComponentQueue(events, "イベント", "Kafka", "注文の事実")
}
ContainerDb(db, "データベース", "PostgreSQL", "注文と商品")
Rel(orders, catalog, "商品を要求する", "JSON")
Rel(orders, db, "保存する", "JDBC")
Rel(catalog, cache, "読み取る", "Redis")
Rel(orders, events, "公開する", "async")`,
    activity: `flowchart LR
    %% アクティビティ: レーン、判断、並行分岐
    subgraph 顧客
      A([開始]) --> B[商品を選ぶ]
    end
    subgraph 店舗
      B --> C{在庫あり?}
      C -->|はい| D[確保]
      C -->|いいえ| E[欠品を知らせる]
      D --> F[支払い]
      F --> G[レシート]
    end
    subgraph 倉庫
      D --> H[ピック]
      H --> I([出荷])
    end
    E --> J([停止])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    エディタ
      コード
      プレビュー
      テーマ
    言語
      PlantUML
      Mermaid
      D2
    書き出し
      SVG
      PNG
      ライブラリ`,
    pie: `${PIE_INIT}
pie showData
    title サンプルにおける言語の割合
    accTitle: サンプルにおける言語の割合
    accDescr: Code2Graph のサンプルにおける言語割合の円グラフ
${PIE_SLICES}
    %% 最初の行は pie。showData は任意: 凡例は "Mermaid [24]" になり、なければ名前だけ。
    %% 同じ行のタイトル: pie title テキスト    または    pie showData title テキスト
    %% 独立した行のタイトル: title グラフのタイトル。タイトルを引用符で囲む必要はない。
    %% 扇形は "ラベル" : 数値。引用符は必須。小数は点: 10.25（ドキュメント: 小数第2位まで）。
    %% パーセント記号は書かない。角度は値 / すべての値の合計。合計は 100 でなくてよい。
    %% 負の値はエラー。合計の 1% 未満の扇形は凡例に残り、弧としては描かれない。
    %% 同じラベルの繰り返しは無視される。扇形はソース順に時計回り。
    %% コメントは %% 行。%%{ ... }%% 行は設定ディレクティブであり、コメントではない。
    %% config.pie.textPosition は扇形ラベルを半径上に置く: 0 が中心、1 が外縁。既定は 0.75。
    %% config.pie.donutHole は穴の比率で 0 から 0.9。0 は塗りつぶした円。
    %% config.pie.legendPosition は top、bottom、left、right、center。既定は right。
    %% config.pie.highlightSlice は強調する扇形の正確なラベル。hover はポインタ下の扇形を強調する。
    %% 独自の pie1..pie12 色は base テーマで効く: pie1 が最初の扇形、pie2 が次、pie12 まで。
${PIE_THEME_KEYS}
    %% accTitle: スクリーンリーダー向けの短いタイトル
    %% accDescr: スクリーンリーダー向けの説明。複数行: accDescr { テキスト }`,
    journey: `journey
    title 店舗での購入
    section 閲覧
      カタログを開く: 5: 購入者
      商品を比べる: 3: 購入者
    section 支払い
      サインイン: 4: 購入者
      カードで支払う: 2: 購入者, 銀行
    section 配送
      追跡番号を受け取る: 5: 購入者, 倉庫`,
    gitgraph: `gitGraph
    %% 足場、エディタ、プレビュー、ビルド
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title Code2Graph の歴史
    section エディタ
      2024 : オフライン PlantUML
           : SVG プレビュー
    section 言語
      2025 : Mermaid
           : D2 と GraphML
    section 現在
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% 店舗のファネル: 複数の入口、分岐、合流。
%% 行は3列の CSV: ソース,ターゲット,値。
%% 値は正の数。小数も可 (10.5)。ヘッダー行はない。
%% グループ間の空行は許され、何も描かない。
%% 名前にカンマや引用符があるとき: 名前を引用符で囲み、内側の引用符は重ねる。
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% %% だけの行はパーサーを壊す: %% の後にテキストを置く。
%% ノード名は ASCII のみ: sankey-beta のパーサーはそれ以外を拒否する。
%% オプションは CSV の列ではない。sankey-beta の上の YAML ヘッダーで設定する
%% （または mermaid.initialize）。下のブロックはコメント: %% を外してコピーする。
${SANKEY_CONFIG}
%%     showValues: true       ノード上の数値: true | false（既定 true）
%%     prefix: ""             数値の前のテキスト。例 "$"
%%     suffix: ""             数値の後のテキスト。例 " pcs"
%%     linkColor: gradient    source | target | gradient | CSS 色。例 "#aabbcc"
%%     nodeAlignment: justify 次のいずれか: justify, left, right, center
%%     width: 600             幅、px（既定 600）
%%     height: 400            高さ、px（既定 400）
%%     useMaxWidth: false     true — 使える幅を使う（既定 false）
%%     nodeWidth: 10          ノードの厚さ、px（Mermaid 11.15+、既定 10）
%%     nodePadding: 12        ノード間の垂直間隔、px（11.15+、既定 12）
%%     labelStyle: legacy     legacy | outlined — ラベル背後の線（11.15+）
%%     nodeColors:            ノードごとの色。他のノードはテーマのまま（11.15+）
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — 入口は左、出るリンクのないノードは右端（既定）
%%   left — すべてのノードを左に詰める
%%   right — 出口を右に詰める
%%   center — left と同じだが、入るリンクのないノードは右へ動く
%% linkColor:
%%   gradient — ソースの色からターゲットの色へ混ぜる（既定）
%%   source — ソースノードの色
%%   target — ターゲットノードの色
%%   #hex または CSS 色名 — すべてのリンクを一色に

%% サイトへの入口: 90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% サイトはカタログ、検索、直帰に分かれる
${SANKEY_ROWS_SITE}

%% カタログと検索は商品と比較で会う
${SANKEY_ROWS_FIND}

%% 商品と比較: カート、ウィッシュリスト、離脱
${SANKEY_ROWS_CHOOSE}

%% ウィッシュリストは流れの一部をカートへ戻す
${SANKEY_ROWS_WISH}

%% カート、会計、結果
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "月別の注文"
    x-axis ["1月", "2月", "3月", "4月", "5月", "6月"]
    y-axis "注文" 0 --> 120
${XY_SERIES}
    %% plotColorPalette は宣言順に系列を塗る: 最初の色が bar、次が line
    %% コマンド: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal は棒を行として描く。vertical は既定で省略できる
    %% title "グラフのタイトル"
    %% x-axis [項目, "空白を含む項目"] — カテゴリ。リスト長は各系列と一致する
    %% x-axis "X の見出し" [項目1, 項目2] — 軸タイトル付きのカテゴリ
    %% x-axis "X の見出し" min --> max — 数値の X 軸
    %% y-axis "Y の見出し" min --> max — タイトルと範囲
    %% y-axis "Y の見出し" — タイトルのみ。範囲はデータに合わせる
    %% y-axis min --> max — タイトルのない範囲
    %% bar [n, n, n] — 1つの棒系列。複数の bar [...] 行 — 複数系列
    %% bar "系列名" [n, n, n] — 名前は凡例に出る
    %% line [n, n, n] — 同じ軸上の線
    %% line "系列名" [n, n, n]
    %% line [n "点のラベル", n] — 線の点のラベル。bar はこの構文を受け取りラベルを無視する
    %% accTitle: スクリーンリーダー向けの短いタイトル
    %% accDescr: スクリーンリーダー向けの説明
    %% 系列の色: init ディレクティブ、themeVariables.xyChart.plotColorPalette = "#色1, #色2"
    %% xyChart のテーマキー: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% config.xyChart のキー: width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% xAxis と yAxis のキー: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["ウェブ"]:2
    api["API"]
    space
    db[("データベース")]
    queue["キュー"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title 店舗のコンテキスト
    Person(customer, "顧客", "注文する")
    Person_Ext(admin, "管理者", "カタログを保守する")
    Enterprise_Boundary(studio, "スタジオ") {
      System(shop, "店舗", "注文を受け付ける")
    }
    System_Ext(mail, "メール", "顧客へのメッセージ")
    SystemDb(bank, "銀行", "支払い")
    Rel(customer, shop, "注文する", "HTTPS")
    Rel(admin, shop, "カタログを編集する", "HTTPS")
    Rel(shop, mail, "メッセージを送る", "SMTP")
    Rel(shop, bank, "請求する", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "購入者が注文する"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "カタログは 200 ms 以内に応答する"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "支払いは銀行を経由する"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title リリースの優先度
    x-axis 低い価値 --> 高い価値
    y-axis 低いリスク --> 高いリスク
    quadrant-1 最初に行う
    quadrant-2 検証する
    quadrant-3 後で
    quadrant-4 すぐ成果
    エディタ: [0.85, 0.35]
    書き出し: [0.7, 0.8]
    テーマ: [0.25, 0.2]
    オフライン: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[エッジ]
    group core(server)[コア]
    service web(internet)[ウェブ] in edge
    service api(server)[API] in core
    service db(database)[データベース] in core
    service queue(disk)[キュー] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title 注文ヘッダー
    0-15: "送信元"
    16-31: "宛先"
    32-47: "種別"
    48-63: "長さ"
    64-95: "合計"`,
  },
  hi: {
    component: `C4Component
title API घटक
Container_Boundary(api, "API", "Java") {
  Component(orders, "ऑर्डर", "Spring", "ऑर्डर बनाता है")
  Component(catalog, "कैटलॉग", "Spring", "उत्पाद लौटाता है")
  ComponentDb(cache, "कैश", "Redis", "गर्म कार्ड")
  ComponentQueue(events, "घटनाएँ", "Kafka", "ऑर्डर तथ्य")
}
ContainerDb(db, "डेटाबेस", "PostgreSQL", "ऑर्डर और उत्पाद")
Rel(orders, catalog, "उत्पाद माँगता है", "JSON")
Rel(orders, db, "सहेजता है", "JDBC")
Rel(catalog, cache, "पढ़ता है", "Redis")
Rel(orders, events, "प्रकाशित करता है", "async")`,
    activity: `flowchart LR
    %% गतिविधि: लेन, निर्णय और समानांतर शाखाएँ
    subgraph ग्राहक
      A([प्रारंभ]) --> B[उत्पाद चुनें]
    end
    subgraph दुकान
      B --> C{स्टॉक में है?}
      C -->|हाँ| D[आरक्षित करें]
      C -->|नहीं| E[अनुपस्थिति बताएँ]
      D --> F[भुगतान]
      F --> G[रसीद]
    end
    subgraph गोदाम
      D --> H[चुनना]
      H --> I([भेजें])
    end
    E --> J([रोकें])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    संपादक
      कोड
      पूर्वावलोकन
      थीम
    भाषाएँ
      PlantUML
      Mermaid
      D2
    निर्यात
      SVG
      PNG
      लाइब्रेरी`,
    pie: `${PIE_INIT}
pie showData
    title नमूनों में भाषाओं का हिस्सा
    accTitle: नमूनों में भाषाओं का हिस्सा
    accDescr: Code2Graph नमूनों में भाषाओं के हिस्से का पाई चार्ट
${PIE_SLICES}
    %% पहली पंक्ति pie है। showData वैकल्पिक है: तब लेजेंड "Mermaid [24]" पढ़ता है; बिना इसके केवल नाम।
    %% उसी पंक्ति पर शीर्षक: pie title पाठ    या    pie showData title पाठ
    %% अपनी पंक्ति पर शीर्षक: title चार्ट शीर्षक। शीर्षक के चारों ओर उद्धरण आवश्यक नहीं।
    %% एक खंड "लेबल" : संख्या है। उद्धरण आवश्यक हैं। दशमलव बिंदु से: 10.25 (दस्तावेज़: दो स्थान तक)।
    %% प्रतिशत चिह्न न लिखें। कोण = मान / सभी मानों का योग; योग 100 होना आवश्यक नहीं।
    %% ऋणात्मक मान त्रुटि है। योग के 1% से छोटा खंड लेजेंड में रहता है और चाप के रूप में नहीं बनता।
    %% दोहराया लेबल अनदेखा होता है। खंड स्रोत क्रम में दक्षिणावर्त चलते हैं।
    %% टिप्पणी एक %% पंक्ति है। %%{ ... }%% पंक्ति विन्यास निर्देश है, टिप्पणी नहीं।
    %% config.pie.textPosition खंड लेबल को त्रिज्या पर रखता है: 0 केंद्र में, 1 बाहरी किनारे पर। डिफ़ॉल्ट 0.75।
    %% config.pie.donutHole छेद का अनुपात है, 0 से 0.9। 0 ठोस पाई है।
    %% config.pie.legendPosition top, bottom, left, right या center है। डिफ़ॉल्ट right।
    %% config.pie.highlightSlice वह सटीक खंड लेबल है जिसे उभारना है। hover सूचक के नीचे का खंड उभारता है।
    %% अपने pie1..pie12 रंग base थीम पर लागू होते हैं: pie1 पहला खंड भरता है, pie2 दूसरा, pie12 तक।
${PIE_THEME_KEYS}
    %% accTitle: स्क्रीन रीडर के लिए छोटा शीर्षक
    %% accDescr: स्क्रीन रीडर के लिए विवरण। कई पंक्तियाँ: accDescr { पाठ }`,
    journey: `journey
    title दुकान में खरीदारी
    section देखना
      कैटलॉग खोलें: 5: खरीदार
      उत्पाद तुलना करें: 3: खरीदार
    section भुगतान
      साइन इन: 4: खरीदार
      कार्ड से भुगतान: 2: खरीदार, बैंक
    section डिलीवरी
      ट्रैकिंग पाएँ: 5: खरीदार, गोदाम`,
    gitgraph: `gitGraph
    %% ढाँचा, संपादक, पूर्वावलोकन और निर्माण
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title Code2Graph का इतिहास
    section संपादक
      2024 : ऑफ़लाइन PlantUML
           : SVG पूर्वावलोकन
    section भाषाएँ
      2025 : Mermaid
           : D2 और GraphML
    section अब
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% दुकान की कीप: कई प्रवेश, विभाजन और मिलन।
%% एक पंक्ति तीन स्तंभों का CSV है: स्रोत,लक्ष्य,मान।
%% मान धनात्मक संख्या है; दशमलव चलते हैं (10.5)। शीर्षक पंक्ति नहीं है।
%% समूहों के बीच खाली पंक्ति चलती है और कुछ नहीं खींचती।
%% नाम में अल्पविराम या उद्धरण: नाम को उद्धरण में लपेटें, भीतरी उद्धरण दो बार लिखें।
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% केवल %% वाली पंक्ति पार्सर तोड़ती है: %% के बाद पाठ रखें।
%% नोड नाम केवल ASCII: sankey-beta पार्सर अन्य अक्षर अस्वीकार करता है।
%% विकल्प CSV स्तंभ नहीं हैं। उन्हें sankey-beta के ऊपर YAML शीर्ष में लिखें
%% (या mermaid.initialize में)। नीचे का ब्लॉक टिप्पणी है: %% के बिना कॉपी करें।
${SANKEY_CONFIG}
%%     showValues: true       नोड पर संख्याएँ: true | false (डिफ़ॉल्ट true)
%%     prefix: ""             संख्या से पहले का पाठ, उदाहरण "$"
%%     suffix: ""             संख्या के बाद का पाठ, उदाहरण " pcs"
%%     linkColor: gradient    source | target | gradient | एक CSS रंग, उदाहरण "#aabbcc"
%%     nodeAlignment: justify इनमें से एक: justify, left, right, center
%%     width: 600             चौड़ाई, px (डिफ़ॉल्ट 600)
%%     height: 400            ऊँचाई, px (डिफ़ॉल्ट 400)
%%     useMaxWidth: false     true — उपलब्ध चौड़ाई लें (डिफ़ॉल्ट false)
%%     nodeWidth: 10          नोड की मोटाई, px (Mermaid 11.15+, डिफ़ॉल्ट 10)
%%     nodePadding: 12        नोडों के बीच ऊर्ध्व अंतर, px (11.15+, डिफ़ॉल्ट 12)
%%     labelStyle: legacy     legacy | outlined — लेबल के पीछे रेखा (11.15+)
%%     nodeColors:            प्रति नोड रंग; शेष नोड थीम रखते हैं (11.15+)
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — प्रवेश बाएँ, बिना निकलने वाली कड़ी वाले नोड सबसे दाएँ (डिफ़ॉल्ट)
%%   left — हर नोड बाएँ सटा
%%   right — निकास दाएँ सटे
%%   center — left जैसा, पर बिना आने वाली कड़ी वाले नोड दाएँ खिसकते हैं
%% linkColor:
%%   gradient — स्रोत रंग से लक्ष्य रंग तक मिश्रण (डिफ़ॉल्ट)
%%   source — स्रोत नोड का रंग
%%   target — लक्ष्य नोड का रंग
%%   #hex या CSS रंग का नाम — हर कड़ी के लिए एक रंग

%% साइट में प्रवेश: 90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% साइट कैटलॉग, खोज और बाउंस में बँटती है
${SANKEY_ROWS_SITE}

%% कैटलॉग और खोज उत्पाद तथा तुलना पर मिलते हैं
${SANKEY_ROWS_FIND}

%% उत्पाद और तुलना: कार्ट, इच्छा-सूची, छोड़ना
${SANKEY_ROWS_CHOOSE}

%% इच्छा-सूची अपने प्रवाह का भाग कार्ट को लौटाती है
${SANKEY_ROWS_WISH}

%% कार्ट, चेकआउट और परिणाम
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "महीने के अनुसार ऑर्डर"
    x-axis ["जन", "फ़र", "मार", "अप्र", "मई", "जून"]
    y-axis "ऑर्डर" 0 --> 120
${XY_SERIES}
    %% plotColorPalette शृंखलाओं को घोषणा क्रम में रंगता है: पहला रंग bar, दूसरा line
    %% आदेश: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal स्तंभों को पंक्तियों की तरह खींचता है; vertical डिफ़ॉल्ट है और छोड़ा जा सकता है
    %% title "चार्ट शीर्षक"
    %% x-axis [श्रेणी, "रिक्त सहित श्रेणी"] — श्रेणियाँ; सूची की लंबाई हर शृंखला से मेल खाती है
    %% x-axis "X शीर्षक" [श्रेणी1, श्रेणी2] — अक्ष शीर्षक के साथ श्रेणियाँ
    %% x-axis "X शीर्षक" min --> max — संख्यात्मक X अक्ष
    %% y-axis "Y शीर्षक" min --> max — शीर्षक और सीमा
    %% y-axis "Y शीर्षक" — केवल शीर्षक, सीमा डेटा के अनुसार बनती है
    %% y-axis min --> max — बिना शीर्षक की सीमा
    %% bar [n, n, n] — एक स्तंभ शृंखला; कई bar [...] पंक्तियाँ — कई शृंखलाएँ
    %% bar "शृंखला का नाम" [n, n, n] — नाम लेजेंड में दिखता है
    %% line [n, n, n] — उन्हीं अक्षों पर एक रेखा
    %% line "शृंखला का नाम" [n, n, n]
    %% line [n "बिंदु का लेबल", n] — रेखा के बिंदु पर लेबल; bar वाक्य स्वीकार करता है और लेबल छोड़ देता है
    %% accTitle: स्क्रीन रीडर के लिए छोटा शीर्षक
    %% accDescr: स्क्रीन रीडर के लिए विवरण
    %% शृंखला रंग: init निर्देश, themeVariables.xyChart.plotColorPalette = "#रंग1, #रंग2"
    %% xyChart थीम कुंजियाँ: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% config.xyChart कुंजियाँ: width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% xAxis और yAxis कुंजियाँ: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["वेब"]:2
    api["API"]
    space
    db[("डेटाबेस")]
    queue["कतार"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title दुकान का संदर्भ
    Person(customer, "ग्राहक", "ऑर्डर देता है")
    Person_Ext(admin, "प्रशासक", "कैटलॉग रखता है")
    Enterprise_Boundary(studio, "स्टूडियो") {
      System(shop, "दुकान", "ऑर्डर लेती है")
    }
    System_Ext(mail, "मेल", "ग्राहक के संदेश")
    SystemDb(bank, "बैंक", "भुगतान")
    Rel(customer, shop, "ऑर्डर देता है", "HTTPS")
    Rel(admin, shop, "कैटलॉग संपादित करता है", "HTTPS")
    Rel(shop, mail, "संदेश भेजता है", "SMTP")
    Rel(shop, bank, "राशि काटता है", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "खरीदार ऑर्डर देता है"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "कैटलॉग 200 ms में उत्तर देता है"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "भुगतान बैंक से होता है"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title रिलीज़ प्राथमिकताएँ
    x-axis कम मूल्य --> उच्च मूल्य
    y-axis कम जोखिम --> उच्च जोखिम
    quadrant-1 पहले करें
    quadrant-2 जाँचें
    quadrant-3 बाद में
    quadrant-4 त्वरित लाभ
    संपादक: [0.85, 0.35]
    निर्यात: [0.7, 0.8]
    थीम: [0.25, 0.2]
    ऑफ़लाइन: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[किनारा]
    group core(server)[क्रोड]
    service web(internet)[वेब] in edge
    service api(server)[API] in core
    service db(database)[डेटाबेस] in core
    service queue(disk)[कतार] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title ऑर्डर हेडर
    0-15: "स्रोत"
    16-31: "गंतव्य"
    32-47: "प्रकार"
    48-63: "लंबाई"
    64-95: "योग"`,
  },
  pt: {
    component: `C4Component
title Componentes da API
Container_Boundary(api, "API", "Java") {
  Component(orders, "Pedidos", "Spring", "Cria um pedido")
  Component(catalog, "Catálogo", "Spring", "Devolve produtos")
  ComponentDb(cache, "Cache", "Redis", "Cartões quentes")
  ComponentQueue(events, "Eventos", "Kafka", "Fatos do pedido")
}
ContainerDb(db, "Banco de dados", "PostgreSQL", "Pedidos e produtos")
Rel(orders, catalog, "Solicita um produto", "JSON")
Rel(orders, db, "Salva", "JDBC")
Rel(catalog, cache, "Lê", "Redis")
Rel(orders, events, "Publica", "async")`,
    activity: `flowchart LR
    %% Atividade: raias, decisões e ramos paralelos
    subgraph Cliente
      A([Início]) --> B[Escolher um produto]
    end
    subgraph Loja
      B --> C{Em estoque?}
      C -->|sim| D[Reservar]
      C -->|não| E[Avisar falta]
      D --> F[Pagamento]
      F --> G[Recibo]
    end
    subgraph Armazém
      D --> H[Separar]
      H --> I([Enviar])
    end
    E --> J([Parar])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    Editor
      Código
      Prévia
      Temas
    Linguagens
      PlantUML
      Mermaid
      D2
    Exportação
      SVG
      PNG
      Biblioteca`,
    pie: `${PIE_INIT}
pie showData
    title Participação dos idiomas nos exemplos
    accTitle: Participação dos idiomas nos exemplos
    accDescr: Gráfico de pizza da participação dos idiomas nos exemplos do Code2Graph
${PIE_SLICES}
    %% A primeira linha é pie. showData é opcional: a legenda fica "Mermaid [24]"; sem ele, só o nome.
    %% Título na mesma linha: pie title Texto    ou    pie showData title Texto
    %% Título na própria linha: title Título do gráfico. Aspas em volta do título não são obrigatórias.
    %% Uma fatia é "Rótulo" : número. As aspas são obrigatórias. Decimais usam ponto: 10.25 (docs: até duas casas).
    %% Não escreva um sinal de porcentagem. O ângulo é valor / soma de todos os valores; a soma não precisa ser 100.
    %% Um valor negativo é um erro. Uma fatia abaixo de 1% da soma fica na legenda e não é desenhada como arco.
    %% Um rótulo repetido é ignorado. As fatias seguem no sentido horário na ordem da fonte.
    %% Um comentário é uma linha %%. Uma linha %%{ ... }%% é uma diretiva de configuração, não um comentário.
    %% config.pie.textPosition coloca o rótulo da fatia no raio: 0 no centro, 1 na borda externa. Padrão 0.75.
    %% config.pie.donutHole é a razão do furo de 0 a 0.9. 0 é uma pizza sólida.
    %% config.pie.legendPosition é top, bottom, left, right ou center. Padrão right.
    %% config.pie.highlightSlice é o rótulo exato da fatia a destacar. hover destaca a fatia sob o ponteiro.
    %% Cores próprias pie1..pie12 valem no tema base: pie1 preenche a primeira fatia, pie2 a segunda, até pie12.
${PIE_THEME_KEYS}
    %% accTitle: título curto para leitores de tela
    %% accDescr: descrição para leitores de tela. Várias linhas: accDescr { texto }`,
    journey: `journey
    title Compra na loja
    section Navegar
      Abrir o catálogo: 5: Comprador
      Comparar produtos: 3: Comprador
    section Pagamento
      Entrar: 4: Comprador
      Pagar no cartão: 2: Comprador, Banco
    section Entrega
      Obter o rastreio: 5: Comprador, Armazém`,
    gitgraph: `gitGraph
    %% Estrutura, editor, prévia e build
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title História do Code2Graph
    section Editor
      2024 : PlantUML offline
           : Prévia SVG
    section Linguagens
      2025 : Mermaid
           : D2 e GraphML
    section Agora
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% Funil da loja: várias entradas, divisões e junções.
%% Uma linha é CSV com três colunas: origem,destino,valor.
%% O valor é um número positivo; decimais são permitidos (10.5). Não há linha de cabeçalho.
%% Uma linha em branco entre grupos é permitida e não desenha nada.
%% Vírgula ou aspas em um nome: envolva o nome em aspas e duplique as aspas internas.
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% Uma linha que é só %% sem texto quebra o analisador: coloque texto depois de %%.
%% Nomes de nó são só ASCII: o analisador sankey-beta rejeita outros caracteres.
%% Opções não são colunas CSV. Defina-as num cabeçalho YAML ACIMA de sankey-beta
%% (ou em mermaid.initialize). O bloco abaixo é um comentário: copie sem %%.
${SANKEY_CONFIG}
%%     showValues: true       números nos nós: true | false (padrão true)
%%     prefix: ""             texto antes do número, por exemplo "$"
%%     suffix: ""             texto depois do número, por exemplo " pcs"
%%     linkColor: gradient    source | target | gradient | uma cor CSS, por exemplo "#aabbcc"
%%     nodeAlignment: justify um de: justify, left, right, center
%%     width: 600             largura em px (padrão 600)
%%     height: 400            altura em px (padrão 400)
%%     useMaxWidth: false     true — usar a largura disponível (padrão false)
%%     nodeWidth: 10          espessura do nó em px (Mermaid 11.15+, padrão 10)
%%     nodePadding: 12        vão vertical entre nós em px (11.15+, padrão 12)
%%     labelStyle: legacy     legacy | outlined — um traço atrás do rótulo (11.15+)
%%     nodeColors:            cores por nó; os outros nós mantêm o tema (11.15+)
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — entradas à esquerda, nós sem ligação de saída na extrema direita (padrão)
%%   left — todos os nós encostados à esquerda
%%   right — saídas encostadas à direita
%%   center — como left, mas nós sem ligação de entrada vão para a direita
%% linkColor:
%%   gradient — mistura da cor de origem até a cor de destino (padrão)
%%   source — a cor do nó de origem
%%   target — a cor do nó de destino
%%   #hex ou um nome de cor CSS — uma cor para cada ligação

%% Entradas no site: 90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% O site se divide em catálogo, busca e uma rejeição
${SANKEY_ROWS_SITE}

%% Catálogo e busca se encontram no produto e na comparação
${SANKEY_ROWS_FIND}

%% Produto e comparação: carrinho, lista de desejos, sair
${SANKEY_ROWS_CHOOSE}

%% A lista de desejos devolve parte do fluxo ao carrinho
${SANKEY_ROWS_WISH}

%% Carrinho, pagamento e resultado
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "Pedidos por mês"
    x-axis [Jan, Fev, Mar, Abr, Mai, Jun]
    y-axis "Pedidos" 0 --> 120
${XY_SERIES}
    %% plotColorPalette colore as séries na ordem de declaração: a primeira cor é bar, a segunda é line
    %% Comandos: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal desenha as barras como linhas; vertical é o padrão e pode ser omitido
    %% title "Título do gráfico"
    %% x-axis [tipo, "tipo com espaço"] — categorias; o tamanho da lista coincide com cada série
    %% x-axis "Título X" [tipo1, tipo2] — categorias com um título de eixo
    %% x-axis "Título X" min --> max — eixo X numérico
    %% y-axis "Título Y" min --> max — título e intervalo
    %% y-axis "Título Y" — só o título, o intervalo se ajusta aos dados
    %% y-axis min --> max — intervalo sem título
    %% bar [n, n, n] — uma série de barras; várias linhas bar [...] — várias séries
    %% bar "Nome da série" [n, n, n] — o nome aparece na legenda
    %% line [n, n, n] — uma linha nos mesmos eixos
    %% line "Nome da série" [n, n, n]
    %% line [n "Rótulo do ponto", n] — um rótulo num ponto da linha; bar aceita a sintaxe e ignora o rótulo
    %% accTitle: título curto para leitores de tela
    %% accDescr: descrição para leitores de tela
    %% Cores das séries: diretiva init, themeVariables.xyChart.plotColorPalette = "#cor1, #cor2"
    %% Chaves de tema xyChart: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% Chaves de config.xyChart: width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% Chaves de xAxis e yAxis: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["Web"]:2
    api["API"]
    space
    db[("Banco de dados")]
    queue["Fila"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title Contexto da loja
    Person(customer, "Cliente", "Faz pedidos")
    Person_Ext(admin, "Administrador", "Mantém o catálogo")
    Enterprise_Boundary(studio, "Estúdio") {
      System(shop, "Loja", "Recebe pedidos")
    }
    System_Ext(mail, "E-mail", "Mensagens ao cliente")
    SystemDb(bank, "Banco", "Pagamentos")
    Rel(customer, shop, "Faz um pedido", "HTTPS")
    Rel(admin, shop, "Edita o catálogo", "HTTPS")
    Rel(shop, mail, "Envia uma mensagem", "SMTP")
    Rel(shop, bank, "Cobra", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "Um comprador faz um pedido"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "O catálogo responde em até 200 ms"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "O pagamento passa pelo banco"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title Prioridades do lançamento
    x-axis Valor baixo --> Valor alto
    y-axis Risco baixo --> Risco alto
    quadrant-1 Fazer primeiro
    quadrant-2 Validar
    quadrant-3 Depois
    quadrant-4 Ganhos rápidos
    Editor: [0.85, 0.35]
    Exportação: [0.7, 0.8]
    Temas: [0.25, 0.2]
    Offline: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[Borda]
    group core(server)["Núcleo"]
    service web(internet)[Web] in edge
    service api(server)[API] in core
    service db(database)["Banco de dados"] in core
    service queue(disk)[Fila] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title Cabeçalho do pedido
    0-15: "Origem"
    16-31: "Destino"
    32-47: "Tipo"
    48-63: "Comprimento"
    64-95: "Total"`,
  },
  de: {
    component: `C4Component
title API-Komponenten
Container_Boundary(api, "API", "Java") {
  Component(orders, "Bestellungen", "Spring", "Erstellt eine Bestellung")
  Component(catalog, "Katalog", "Spring", "Liefert Produkte")
  ComponentDb(cache, "Cache", "Redis", "Heiße Karten")
  ComponentQueue(events, "Ereignisse", "Kafka", "Bestellfakten")
}
ContainerDb(db, "Datenbank", "PostgreSQL", "Bestellungen und Produkte")
Rel(orders, catalog, "Fordert ein Produkt an", "JSON")
Rel(orders, db, "Speichert", "JDBC")
Rel(catalog, cache, "Liest", "Redis")
Rel(orders, events, "Veröffentlicht", "async")`,
    activity: `flowchart LR
    %% Aktivität: Bahnen, Entscheidungen und parallele Zweige
    subgraph Kunde
      A([Start]) --> B[Produkt wählen]
    end
    subgraph Shop
      B --> C{Auf Lager?}
      C -->|ja| D[Reservieren]
      C -->|nein| E[Fehlmenge melden]
      D --> F[Zahlung]
      F --> G[Beleg]
    end
    subgraph Lager
      D --> H[Kommissionieren]
      H --> I([Versenden])
    end
    E --> J([Stopp])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    Editor
      Code
      Vorschau
      Themen
    Sprachen
      PlantUML
      Mermaid
      D2
    Export
      SVG
      PNG
      Bibliothek`,
    pie: `${PIE_INIT}
pie showData
    title Anteil der Beispielsprachen
    accTitle: Anteil der Beispielsprachen
    accDescr: Kreisdiagramm der Sprachanteile in den Code2Graph-Beispielen
${PIE_SLICES}
    %% Die erste Zeile ist pie. showData ist optional: die Legende lautet dann "Mermaid [24]"; ohne ihn nur der Name.
    %% Titel in derselben Zeile: pie title Text    oder    pie showData title Text
    %% Titel in einer eigenen Zeile: title Diagrammtitel. Anführungszeichen um den Titel sind nicht nötig.
    %% Ein Segment ist "Beschriftung" : Zahl. Anführungszeichen sind nötig. Dezimalstellen mit Punkt: 10.25 (Doku: bis zu zwei Stellen).
    %% Kein Prozentzeichen schreiben. Der Winkel ist Wert / Summe aller Werte; die Summe muss nicht 100 sein.
    %% Ein negativer Wert ist ein Fehler. Ein Segment unter 1% der Summe bleibt in der Legende und wird nicht als Bogen gezeichnet.
    %% Eine wiederholte Beschriftung wird ignoriert. Segmente laufen im Uhrzeigersinn in Quellreihenfolge.
    %% Ein Kommentar ist eine %% Zeile. Eine %%{ ... }%% Zeile ist eine Konfigurationsdirektive, kein Kommentar.
    %% config.pie.textPosition setzt die Segmentbeschriftung auf den Radius: 0 in der Mitte, 1 am Außenrand. Standard 0.75.
    %% config.pie.donutHole ist das Lochverhältnis von 0 bis 0.9. 0 ist ein voller Kreis.
    %% config.pie.legendPosition ist top, bottom, left, right oder center. Standard right.
    %% config.pie.highlightSlice ist die genaue Segmentbeschriftung zum Hervorheben. hover hebt das Segment unter dem Zeiger hervor.
    %% Eigene Farben pie1..pie12 gelten im Thema base: pie1 füllt das erste Segment, pie2 das zweite, bis pie12.
${PIE_THEME_KEYS}
    %% accTitle: kurzer Titel für Screenreader
    %% accDescr: Beschreibung für Screenreader. Mehrere Zeilen: accDescr { Text }`,
    journey: `journey
    title Einkauf im Shop
    section Stöbern
      Katalog öffnen: 5: Käufer
      Produkte vergleichen: 3: Käufer
    section Zahlung
      Anmelden: 4: Käufer
      Mit Karte zahlen: 2: Käufer, Bank
    section Lieferung
      Sendung verfolgen: 5: Käufer, Lager`,
    gitgraph: `gitGraph
    %% Gerüst, Editor, Vorschau und Build
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title Geschichte von Code2Graph
    section Editor
      2024 : PlantUML offline
           : SVG-Vorschau
    section Sprachen
      2025 : Mermaid
           : D2 und GraphML
    section Jetzt
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% Shop-Trichter: mehrere Eingänge, Teilungen und Zusammenführungen.
%% Eine Zeile ist CSV mit drei Spalten: Quelle,Ziel,Wert.
%% Der Wert ist eine positive Zahl; Dezimalstellen sind erlaubt (10.5). Keine Kopfzeile.
%% Eine Leerzeile zwischen Gruppen ist erlaubt und zeichnet nichts.
%% Komma oder Anführungszeichen im Namen: Namen in Anführungszeichen setzen, inneres Zeichen verdoppeln.
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% Eine Zeile, die nur %% ohne Text ist, bricht den Parser: Text nach %% setzen.
%% Knotennamen sind nur ASCII: der sankey-beta-Parser lehnt andere Zeichen ab.
%% Optionen sind keine CSV-Spalten. Sie stehen in einem YAML-Kopf ÜBER sankey-beta
%% (oder in mermaid.initialize). Der Block darunter ist ein Kommentar: ohne %% kopieren.
${SANKEY_CONFIG}
%%     showValues: true       Zahlen an Knoten: true | false (Standard true)
%%     prefix: ""             Text vor der Zahl, zum Beispiel "$"
%%     suffix: ""             Text nach der Zahl, zum Beispiel " pcs"
%%     linkColor: gradient    source | target | gradient | eine CSS-Farbe, zum Beispiel "#aabbcc"
%%     nodeAlignment: justify eines von: justify, left, right, center
%%     width: 600             Breite in px (Standard 600)
%%     height: 400            Höhe in px (Standard 400)
%%     useMaxWidth: false     true — die verfügbare Breite nutzen (Standard false)
%%     nodeWidth: 10          Knotendicke in px (Mermaid 11.15+, Standard 10)
%%     nodePadding: 12        senkrechter Abstand zwischen Knoten in px (11.15+, Standard 12)
%%     labelStyle: legacy     legacy | outlined — ein Strich hinter der Beschriftung (11.15+)
%%     nodeColors:            Farben je Knoten; andere Knoten behalten das Thema (11.15+)
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — Eingänge links, Knoten ohne ausgehende Kante ganz rechts (Standard)
%%   left — jeder Knoten nach links gepackt
%%   right — Ausgänge nach rechts gepackt
%%   center — wie left, aber Knoten ohne eingehende Kante rücken nach rechts
%% linkColor:
%%   gradient — Übergang von der Quellfarbe zur Zielfarbe (Standard)
%%   source — die Farbe des Quellknotens
%%   target — die Farbe des Zielknotens
%%   #hex oder ein CSS-Farbname — eine Farbe für jede Kante

%% Eingänge in die Site: 90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% Die Site teilt sich in Katalog, Suche und Absprung
${SANKEY_ROWS_SITE}

%% Katalog und Suche treffen sich beim Produkt und beim Vergleich
${SANKEY_ROWS_FIND}

%% Produkt und Vergleich: Warenkorb, Wunschliste, verlassen
${SANKEY_ROWS_CHOOSE}

%% Die Wunschliste schickt einen Teil des Flusses zurück in den Warenkorb
${SANKEY_ROWS_WISH}

%% Warenkorb, Kasse und Ergebnis
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "Bestellungen nach Monat"
    x-axis [Jan, Feb, "Mär", Apr, Mai, Jun]
    y-axis "Bestellungen" 0 --> 120
${XY_SERIES}
    %% plotColorPalette färbt Serien in der Deklarationsreihenfolge: erste Farbe ist bar, zweite ist line
    %% Befehle: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal zeichnet Balken als Zeilen; vertical ist der Standard und kann entfallen
    %% title "Diagrammtitel"
    %% x-axis [Kat, "Kat mit Leerzeichen"] — Kategorien; die Listenlänge entspricht jeder Serie
    %% x-axis "X-Titel" [Kat1, Kat2] — Kategorien mit einem Achsentitel
    %% x-axis "X-Titel" min --> max — numerische X-Achse
    %% y-axis "Y-Titel" min --> max — Titel und Bereich
    %% y-axis "Y-Titel" — nur der Titel, der Bereich wird an die Daten angepasst
    %% y-axis min --> max — Bereich ohne Titel
    %% bar [n, n, n] — eine Balkenserie; mehrere Zeilen bar [...] — mehrere Serien
    %% bar "Serienname" [n, n, n] — der Name steht in der Legende
    %% line [n, n, n] — eine Linie auf denselben Achsen
    %% line "Serienname" [n, n, n]
    %% line [n "Punktbeschriftung", n] — eine Beschriftung an einem Linienpunkt; bar akzeptiert die Syntax und ignoriert die Beschriftung
    %% accTitle: kurzer Titel für Screenreader
    %% accDescr: Beschreibung für Screenreader
    %% Serienfarben: init-Direktive, themeVariables.xyChart.plotColorPalette = "#farbe1, #farbe2"
    %% xyChart-Themenschlüssel: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% Schlüssel von config.xyChart: width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% Schlüssel von xAxis und yAxis: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["Web"]:2
    api["API"]
    space
    db[("Datenbank")]
    queue["Warteschlange"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title Shop-Kontext
    Person(customer, "Kunde", "Gibt Bestellungen auf")
    Person_Ext(admin, "Administrator", "Pflegt den Katalog")
    Enterprise_Boundary(studio, "Studio") {
      System(shop, "Shop", "Nimmt Bestellungen an")
    }
    System_Ext(mail, "E-Mail", "Nachrichten an Kunden")
    SystemDb(bank, "Bank", "Zahlungen")
    Rel(customer, shop, "Gibt eine Bestellung auf", "HTTPS")
    Rel(admin, shop, "Bearbeitet den Katalog", "HTTPS")
    Rel(shop, mail, "Sendet eine Nachricht", "SMTP")
    Rel(shop, bank, "Belastet", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "Ein Käufer gibt eine Bestellung auf"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "Der Katalog antwortet innerhalb von 200 ms"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "Die Zahlung läuft über die Bank"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title Release-Prioritäten
    x-axis Niedriger Wert --> Hoher Wert
    y-axis Niedriges Risiko --> Hohes Risiko
    quadrant-1 Zuerst
    quadrant-2 Prüfen
    quadrant-3 Später
    quadrant-4 Schnelle Erfolge
    Editor: [0.85, 0.35]
    Export: [0.7, 0.8]
    Themen: [0.25, 0.2]
    Offline: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[Rand]
    group core(server)[Kern]
    service web(internet)[Web] in edge
    service api(server)[API] in core
    service db(database)[Datenbank] in core
    service queue(disk)[Warteschlange] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title Bestellkopf
    0-15: "Quelle"
    16-31: "Ziel"
    32-47: "Typ"
    48-63: "Länge"
    64-95: "Summe"`,
  },
  ar: {
    component: `C4Component
title مكوّنات API
Container_Boundary(api, "API", "Java") {
  Component(orders, "الطلبات", "Spring", "ينشئ طلباً")
  Component(catalog, "الفهرس", "Spring", "يعيد المنتجات")
  ComponentDb(cache, "التخزين المؤقت", "Redis", "البطاقات الساخنة")
  ComponentQueue(events, "الأحداث", "Kafka", "وقائع الطلب")
}
ContainerDb(db, "قاعدة البيانات", "PostgreSQL", "الطلبات والمنتجات")
Rel(orders, catalog, "يطلب منتجاً", "JSON")
Rel(orders, db, "يحفظ", "JDBC")
Rel(catalog, cache, "يقرأ", "Redis")
Rel(orders, events, "ينشر", "async")`,
    activity: `flowchart LR
    %% النشاط: المسارات والقرارات والفروع المتوازية
    subgraph العميل
      A([البدء]) --> B[اختيار منتج]
    end
    subgraph المتجر
      B --> C{متوفر؟}
      C -->|نعم| D[حجز]
      C -->|لا| E[الإبلاغ عن النقص]
      D --> F[الدفع]
      F --> G[إيصال]
    end
    subgraph المستودع
      D --> H[تجهيز]
      H --> I([شحن])
    end
    E --> J([إيقاف])
    G --> I

${ACTIVITY_STYLE}`,
    mindmap: `mindmap
  root((Code2Graph))
    المحرر
      الرمز
      المعاينة
      السمات
    اللغات
      PlantUML
      Mermaid
      D2
    التصدير
      SVG
      PNG
      المكتبة`,
    pie: `${PIE_INIT}
pie showData
    title حصة اللغات في الأمثلة
    accTitle: حصة اللغات في الأمثلة
    accDescr: مخطط دائري لحصص اللغات في أمثلة Code2Graph
${PIE_SLICES}
    %% السطر الأول هو pie. و showData اختياري: تعرض وسيلة الإيضاح حينها "Mermaid [24]"، ومن دونه الاسم فقط.
    %% العنوان في السطر نفسه: pie title نص    أو    pie showData title نص
    %% العنوان في سطر مستقل: title عنوان المخطط. علامات الاقتباس حول العنوان غير مطلوبة.
    %% القطاع هو "تسمية" : عدد. علامات الاقتباس مطلوبة. الكسور بالنقطة: 10.25 (الوثائق: حتى منزلتين).
    %% لا تكتب علامة النسبة المئوية. الزاوية = القيمة / مجموع كل القيم، ولا يلزم أن يكون المجموع 100.
    %% القيمة السالبة خطأ. القطاع الأقل من 1% من المجموع يبقى في وسيلة الإيضاح ولا يُرسم قوساً.
    %% التسمية المكررة تُهمل. القطاعات تسير مع عقارب الساعة حسب ترتيب المصدر.
    %% التعليق سطر %%. السطر %%{ ... }%% توجيه إعداد وليس تعليقاً.
    %% config.pie.textPosition يضع تسمية القطاع على نصف القطر: 0 في المركز، 1 عند الحافة الخارجية. الافتراضي 0.75.
    %% config.pie.donutHole نسبة الثقب من 0 إلى 0.9. 0 دائرة مصمتة.
    %% config.pie.legendPosition هو top أو bottom أو left أو right أو center. الافتراضي right.
    %% config.pie.highlightSlice هو تسمية القطاع الدقيقة المراد إبرازها. hover يبرز القطاع تحت المؤشر.
    %% ألوان pie1..pie12 الخاصة تُطبق على سمة base: pie1 يملأ القطاع الأول، و pie2 الثاني، حتى pie12.
${PIE_THEME_KEYS}
    %% accTitle: عنوان قصير لقارئات الشاشة
    %% accDescr: وصف لقارئات الشاشة. عدة أسطر: accDescr { نص }`,
    journey: `journey
    title شراء من المتجر
    section التصفح
      فتح الفهرس: 5: المشتري
      مقارنة المنتجات: 3: المشتري
    section الدفع
      تسجيل الدخول: 4: المشتري
      الدفع بالبطاقة: 2: المشتري, البنك
    section التسليم
      الحصول على التتبع: 5: المشتري, المستودع`,
    gitgraph: `gitGraph
    %% الهيكل والمحرر والمعاينة والبناء
    commit id: "Scaffold"
    branch develop
    checkout develop
    commit id: "Editor"
    commit id: "Preview"
    checkout main
    merge develop
    branch release
    checkout release
    commit id: "Build"
    checkout main
    merge release`,
    timeline: `timeline
    title تاريخ Code2Graph
    section المحرر
      2024 : PlantUML دون اتصال
           : معاينة SVG
    section اللغات
      2025 : Mermaid
           : D2 و GraphML
    section الآن
      2026 : Structurizr
           : WireMark`,
    sankey: `sankey-beta
%% قمع المتجر: عدة مداخل وتفرعات واندماجات.
%% الصف CSV من ثلاثة أعمدة: مصدر,هدف,قيمة.
%% القيمة عدد موجب، والكسور مسموحة (10.5). لا صف ترويسة.
%% السطر الفارغ بين المجموعات مسموح ولا يرسم شيئاً.
%% فاصلة أو علامة اقتباس في الاسم: لفّ الاسم بعلامتي اقتباس وضاعف علامة الاقتباس الداخلية.
%%   "Pay, card",Paid,48
%%   "Drop, ""no pay""",Lost,1
%% السطر الذي هو %% فقط بلا نص يكسر المحلل: ضع نصاً بعد %%.
%% أسماء العقد ASCII فقط: محلّل sankey-beta يرفض ما عداها.
%% الخيارات ليست أعمدة CSV. تُضبط في ترويسة YAML فوق sankey-beta
%% (أو في mermaid.initialize). الكتلة أدناه تعليق: انسخها بلا %%.
${SANKEY_CONFIG}
%%     showValues: true       أرقام على العقد: true | false (الافتراضي true)
%%     prefix: ""             نص قبل الرقم، مثلاً "$"
%%     suffix: ""             نص بعد الرقم، مثلاً " pcs"
%%     linkColor: gradient    source | target | gradient | لون CSS، مثلاً "#aabbcc"
%%     nodeAlignment: justify واحد من: justify, left, right, center
%%     width: 600             العرض بالبكسل (الافتراضي 600)
%%     height: 400            الارتفاع بالبكسل (الافتراضي 400)
%%     useMaxWidth: false     true — استخدم العرض المتاح (الافتراضي false)
%%     nodeWidth: 10          سماكة العقدة بالبكسل (Mermaid 11.15+، الافتراضي 10)
%%     nodePadding: 12        الفجوة الرأسية بين العقد بالبكسل (11.15+، الافتراضي 12)
%%     labelStyle: legacy     legacy | outlined — خط خلف التسمية (11.15+)
%%     nodeColors:            ألوان لكل عقدة؛ بقية العقد تبقى على السمة (11.15+)
${SANKEY_NODE_COLORS}
%% nodeAlignment:
%%   justify — المداخل يساراً، والعقد بلا رابط خارج عند أقصى اليمين (الافتراضي)
%%   left — كل العقد ملاصقة لليسار
%%   right — المخارج ملاصقة لليمين
%%   center — مثل left، لكن العقد بلا رابط داخل تتحرك يميناً
%% linkColor:
%%   gradient — مزج من لون المصدر إلى لون الهدف (الافتراضي)
%%   source — لون عقدة المصدر
%%   target — لون عقدة الهدف
%%   #hex أو اسم لون CSS — لون واحد لكل رابط

%% المداخل إلى الموقع: 90+40+25+15 = 170
${SANKEY_ROWS_ENTRY}

%% الموقع يتفرع إلى الفهرس والبحث والارتداد
${SANKEY_ROWS_SITE}

%% الفهرس والبحث يلتقيان عند المنتج وعند المقارنة
${SANKEY_ROWS_FIND}

%% المنتج والمقارنة: السلة وقائمة الأمنيات والمغادرة
${SANKEY_ROWS_CHOOSE}

%% قائمة الأمنيات تعيد جزءاً من التدفق إلى السلة
${SANKEY_ROWS_WISH}

%% السلة والدفع والنتيجة
${SANKEY_ROWS_PAY}`,
    xychart: `${XY_INIT}
xychart-beta
    title "الطلبات حسب الشهر"
    x-axis ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو"]
    y-axis "الطلبات" 0 --> 120
${XY_SERIES}
    %% plotColorPalette يلوّن السلاسل حسب ترتيب الإعلان: اللون الأول لـ bar والثاني لـ line
    %% الأوامر: xychart, xychart-beta, horizontal, vertical, title, x-axis, y-axis, bar, line, accTitle, accDescr
    %% xychart-beta horizontal يرسم الأعمدة صفوفاً؛ vertical هو الاتجاه الافتراضي ويمكن حذفه
    %% title "عنوان المخطط"
    %% x-axis [فئة, "فئة بمسافة"] — فئات؛ طول القائمة يطابق كل سلسلة
    %% x-axis "عنوان X" [فئة1, فئة2] — فئات مع عنوان للمحور
    %% x-axis "عنوان X" min --> max — محور X عددي
    %% y-axis "عنوان Y" min --> max — عنوان ونطاق
    %% y-axis "عنوان Y" — العنوان فقط، والنطاق يُحسب من البيانات
    %% y-axis min --> max — نطاق بلا عنوان
    %% bar [n, n, n] — سلسلة أعمدة واحدة؛ عدة أسطر bar [...] — عدة سلاسل
    %% bar "اسم السلسلة" [n, n, n] — يظهر الاسم في وسيلة الإيضاح
    %% line [n, n, n] — خط على المحاور نفسها
    %% line "اسم السلسلة" [n, n, n]
    %% line [n "تسمية النقطة", n] — تسمية على نقطة الخط؛ bar يقبل الصيغة ويتجاهل التسمية
    %% accTitle: عنوان قصير لقارئات الشاشة
    %% accDescr: وصف لقارئات الشاشة
    %% ألوان السلاسل: توجيه init، themeVariables.xyChart.plotColorPalette = "#لون1, #لون2"
    %% مفاتيح سمة xyChart: backgroundColor, titleColor, dataLabelColor, legendTextColor, plotColorPalette
${XY_AXIS_KEYS}
    %% مفاتيح config.xyChart: width, height, titlePadding, titleFontSize, showTitle, showLegend
${XY_CONFIG_KEY_LINES}
    %% مفاتيح xAxis و yAxis: showLabel, labelFontSize, labelPadding, showTitle, titleFontSize, titlePadding
${XY_TICK_KEYS}`,
    block: `block-beta
    columns 3
    web["الويب"]:2
    api["API"]
    space
    db[("قاعدة البيانات")]
    queue["الطابور"]
    web --> api
    api --> db
    api --> queue`,
    c4_context: `C4Context
    title سياق المتجر
    Person(customer, "العميل", "يُنشئ الطلبات")
    Person_Ext(admin, "المدير", "يصون الفهرس")
    Enterprise_Boundary(studio, "الاستوديو") {
      System(shop, "المتجر", "يتلقى الطلبات")
    }
    System_Ext(mail, "البريد", "رسائل إلى العميل")
    SystemDb(bank, "البنك", "المدفوعات")
    Rel(customer, shop, "يُنشئ طلباً", "HTTPS")
    Rel(admin, shop, "يعدّل الفهرس", "HTTPS")
    Rel(shop, mail, "يرسل رسالة", "SMTP")
    Rel(shop, bank, "يخصم", "API")`,
    requirement: `requirementDiagram
    functionalRequirement orderReq {
      id: 1
      text: "يُنشئ المشتري طلباً"
      risk: high
      verifymethod: test
    }
    performanceRequirement speedReq {
      id: 2
      text: "يستجيب الفهرس خلال 200 ms"
      risk: medium
      verifymethod: analysis
    }
    interfaceRequirement payReq {
      id: 3
      text: "يمر الدفع عبر البنك"
      risk: low
      verifymethod: demonstration
    }
    element shop {
      type: system
    }
    element api {
      type: service
    }
    shop - satisfies -> orderReq
    api - satisfies -> speedReq
    shop - traces -> payReq
    orderReq - contains -> speedReq`,
    quadrant: `quadrantChart
    title أولويات الإصدار
    x-axis قيمة منخفضة --> قيمة عالية
    y-axis خطر منخفض --> خطر عالٍ
    quadrant-1 افعل أولاً
    quadrant-2 تحقق
    quadrant-3 لاحقاً
    quadrant-4 مكاسب سريعة
    المحرر: [0.85, 0.35]
    التصدير: [0.7, 0.8]
    السمات: [0.25, 0.2]
    دون اتصال: [0.4, 0.65]`,
    architecture: `architecture-beta
    group edge(cloud)[الحافة]
    group core(server)[النواة]
    service web(internet)[الويب] in edge
    service api(server)[API] in core
    service db(database)[قاعدة البيانات] in core
    service queue(disk)[الطابور] in core
    web:R --> L:api
    api:B --> T:db
    api:R --> L:queue`,
    packet: `packet-beta
    title ترويسة الطلب
    0-15: "المصدر"
    16-31: "الوجهة"
    32-47: "النوع"
    48-63: "الطول"
    64-95: "المجموع"`,
  },
} satisfies Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<MermaidRichExtraId, string>
>;

export const MERMAID_RICH_EXTRA: Record<
  Exclude<AppLocale, "ru" | "en">,
  Record<string, string>
> = MERMAID_RICH_EXTRA_DATA;
