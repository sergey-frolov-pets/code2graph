import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "代码即图表工作室",
  "site.nav.features": "功能",
  "site.nav.converter": "转换器与 AI",
  "site.nav.pwa": "PWA / 离线",
  "site.nav.formats": "格式",
  "site.nav.faq": "常见问题",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "讨论",
  "site.hero.askQuestion": "💬 提问",
  "site.github.star": "标星",
  "site.github.starLabel": "在 GitHub 上为 code2graph 标星",
  "site.hero.viewOnGithub": "在 GitHub 上查看",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "面向 PlantUML、Mermaid、GraphML、WireMark、D2 和 Structurizr 的 PWA 工作室。面向智能体的 MCP 返回图表源码和图像。",
  "site.landingCtaApp": "打开编辑器",
  "site.landingCtaInstallPwa": "📲 安装 PWA",
  "site.landingCtaRegister": "注册",
  "site.landingCtaLogin": "登录",
  "site.landingCtaTryFree": "免费试用",
  "site.landingCtaDemo": "演示",

  "site.hero.title": "在浏览器中编写文本图表",
  "site.hero.subtitle":
    "写下一张图表，立刻看到结果。PlantUML、Mermaid、GraphML、WireMark、D2 和 Structurizr — 包括离线。MCP 把源码和图像交给智能体。",
  "site.offlineNote": "编辑和预览无需网络。",
  "site.languages.title": "语言",
  "site.language.sites": "网站",
  "site.language.libraries": "应用使用的库",
  "site.language.types": "主要图表类型",
  "site.language.diagramTypes": "图表类型",
  "site.language.keywords": "关键字",
  "site.language.example": "示例",
  "site.language.syntax": "语法",
  "site.language.preview": "效果：{title}",
  "site.language.previewFailed": "无法绘制该示例",
  "site.primer.graphml.type.directed.title": "有向图",
  "site.primer.graphml.type.directed.summary":
    "边从源指向目标。Code2Graph 默认这样绘制 GraphML。",
  "site.primer.graphml.type.undirected.title": "无向图",
  "site.primer.graphml.type.undirected.summary":
    "边只连接节点，没有方向。",
  "site.primer.wiremark.type.flow.title": "相互链接的屏幕",
  "site.primer.wiremark.type.flow.summary":
    "一个文件中有多块线框，并用 to=#anchor 在它们之间跳转。",
  "site.primer.plantuml.kw.startuml":
    "@startuml 和 @enduml 打开并关闭图表。",
  "site.primer.plantuml.kw.participant":
    "一条有名称的生命线。as 给它一个短别名。",
  "site.primer.plantuml.kw.arrow": "一条消息：-> 指向参与者，--> 表示回复。",
  "site.primer.plantuml.kw.alt":
    "互斥分支。else 是另一分支，end 关闭该块。",
  "site.primer.plantuml.kw.note": "写在参与者左侧、右侧或上方的注释。",
  "site.primer.plantuml.kw.if":
    "活动图决策：then 和 else，用 endif 关闭。",
  "site.primer.plantuml.kw.skinparam":
    "共享样式设置，例如背景色。",
  "site.primer.plantuml.syntax.sequence":
    "actor 和 participant 命名一条生命线，as 是短别名。消息是 ->，回复是 -->，标签写在冒号后面。",
  "site.primer.plantuml.syntax.class":
    "class 打开一个类；字段和方法写在花括号内。连线是 -->，重数写在引号中。",
  "site.primer.plantuml.syntax.activity":
    "start 和 stop 是两端。步骤是 :文本;。决策是 if () then ()、else 和 endif。",
  "site.primer.plantuml.syntax.state":
    "[*] 是开始和结束。转移是 -->，事件标签写在冒号后面。",
  "site.primer.plantuml.syntax.usecase":
    "actor 和 usecase 声明参与者和用例。连线是 -->，方向是从左到右的 direction。",
  "site.primer.plantuml.syntax.c4_context":
    "Person()、System() 和 Rel() 描述人、系统和连线。库通过 !include 引入。",
  "site.primer.mermaid.kw.participant":
    "时序图参与者。as 替换可见标签。",
  "site.primer.mermaid.kw.arrow":
    "一条消息：->> 是实线箭头，-->> 是虚线回复。",
  "site.primer.mermaid.kw.alt":
    "时序图分支。else 是另一分支，end 关闭该块。",
  "site.primer.mermaid.kw.note": "参与者右侧的注释，或跨多个参与者的注释。",
  "site.primer.mermaid.kw.subgraph": "一组流程图节点。用 end 关闭。",
  "site.primer.mermaid.kw.class": "classDiagram 中带字段和方法的类。",
  "site.primer.mermaid.kw.section": "甘特图上的一组任务。",
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD 设置方向。步骤是 [text]，决策是 {text}，开始是 ([text])。箭头是 -->，分支标签是 |yes|。",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram 打开图表。actor 和带 as 的 participant 命名一条生命线。请求是 ->>，回复是 -->>。",
  "site.primer.mermaid.syntax.class":
    "classDiagram 打开图表。class 名称 { } 容纳 +名称 类型 形式的字段和方法。连线是 -->。",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 打开图表。[*] 是开始。转移是 -->，标签写在冒号后面。",
  "site.primer.mermaid.syntax.er":
    "erDiagram 打开图表。||--o{ 读作一对多，角色写在冒号后面。",
  "site.primer.mermaid.syntax.gantt":
    "gantt 打开图表。title 是标题，dateFormat 是日期样式，section 是分组。任务是 名称 :id, 日期, 时长。",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap 打开导图。根是 root((主题))。缩进决定嵌套。",
  "site.primer.mermaid.syntax.pie":
    "pie showData 会打印数字。title 是标题。扇区是 \"名称\" : 数字。",
  "site.primer.mermaid.syntax.journey":
    "journey 打开路径。title 是标题，section 是阶段。任务是 名称: 分数: 角色。",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph 打开历史。commit 是一次提交，branch 是一个分支，checkout 切换，merge 合并。",
  "site.primer.mermaid.syntax.timeline":
    "timeline 打开时间刻度。title 是标题，section 是一段时间。事件写在冒号后面。",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta 打开流量图。每一行是 source,target,weight。节点名使用 ASCII；名称中含逗号时请加引号。选项不是 CSV 列：在关键字之前的 config.sankey YAML 头中设置（showValues、prefix、suffix、linkColor、nodeAlignment、width、height、useMaxWidth、nodeWidth、nodePadding、labelStyle、nodeColors）。",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta 打开图表。x-axis 是类别，y-axis 是范围，bar 和 line 是系列。",
  "site.primer.mermaid.syntax.block":
    "block-beta 打开块。columns 设置列数。块是 id[\"标签\"]，连线是 -->。",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context 打开上下文。Person() 和 System() 声明元素，Rel() 是连线。",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram 打开图表。requirement { } 是需求，element { } 是元素，连线是 satisfies。",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart 打开象限。x-axis 和 y-axis 是坐标轴，quadrant-1 … quadrant-4 是名称，点是 名称: [x, y]。",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta 打开图表。group 是分组，service 是服务，连线是 service:R --> L:service。",
  "site.primer.mermaid.syntax.packet":
    "packet-beta 打开报文。title 是标题。字段是位范围和标签，例如 0-15: \"源\"。",
  "site.ext.mermaid.title": "Mermaid Ext 扩展",
  "site.ext.mermaid.lead":
    "普通 Mermaid 没有的五种图表：瀑布图、气泡图、热力图、组织结构图和挣值。由内置引擎绘制，不依赖外部服务。",
  "site.ext.mermaid.note":
    "这五种都由内置引擎绘制，不依赖外部服务。如果下面的示例在编辑器中无法渲染，说明此构建未包含该扩展。",
  "site.ext.mermaid.type.waterfall": "瀑布图",
  "site.ext.mermaid.type.bubble": "气泡图",
  "site.ext.mermaid.type.heatmap": "热力图",
  "site.ext.mermaid.type.orgchart": "组织结构图",
  "site.ext.mermaid.type.ev": "挣值",
  "site.ext.mermaid.type.boxplot": "箱线图",
  "site.ext.mermaid.type.treemap": "矩形树图",
  "site.ext.mermaid.type.radar": "雷达图",
  "site.ext.mermaid.type.voronoi": "沃罗诺伊镶嵌",
  "site.ext.mermaid.type.clustered": "系列图",
  "site.ext.mermaid.desc.waterfall":
    "起始值如何经过 + 和 − 步骤变成合计。绝对柱以 = 开头，多个情景用 series 声明。支持坐标轴断开、黑白模式（mono 和 mono invert）以及自定义颜色。",
  "site.ext.mermaid.desc.bubble":
    "同时呈现三个维度：x、y 和气泡大小。可选 BCG 象限和颜色分组。",
  "site.ext.mermaid.desc.heatmap":
    "带色标的数值矩阵。刻度范围是显式的，空单元格（连续两个分隔符）画成灰色。",
  "site.ext.mermaid.desc.orgchart":
    "带显式边的汇报树：实线是主线，虚线 -.-> 是次要上级。块可以设置填充（color）和边框（border、style）。多个根会汇集到一个不可见的根下面。",
  "site.ext.mermaid.desc.ev":
    "按天的三条累计曲线：计划值 PV、挣值 EV 和实际成本 AC。图例中还有 SV 和 CV 偏差。",
  "site.ext.mermaid.desc.boxplot":
    "各类别的分布：最小值、下四分位数和上四分位数（Q1、Q3）、中位数、最大值、均值和离群点。可以接受显式五数概括，或原始观测（values=）。",
  "site.ext.mermaid.desc.treemap":
    "按数值权重在分组和条目之间划分层级矩形，并自动显示百分比份额和颜色深浅。",
  "site.ext.mermaid.desc.radar":
    "从同一中心沿径向轴比较多个系列，可配置网格环、填充不透明度和自定义颜色。",
  "site.ext.mermaid.desc.voronoi":
    "把平面几何划分成凸的最近邻单元，带颜色分组和质心标签。",
  "site.ext.mermaid.desc.clustered":
    "多个系列在各类别上的柱，可并排或堆叠，并带有叠加折线、水平线、坐标轴断开、CAGR 标注、90 度旋转（rotate 90）、翻转的纵轴（invert y），以及黑白模式（mono、mono invert）。",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall 打开图表。y 设置坐标轴。= 是绝对柱，+ 和 - 是一步，标签写在冒号后面。axis y off 隐藏数值轴及其网格，axis x off 隐藏列标签，grid off 只隐藏网格。gap 12 或 gap 20% 设置柱间距。标签中的 \\n 会换行。",
  "site.ext.mermaid.syntax.bubble":
    "bubble 打开图表。x、y 和 size 设置坐标轴和大小。在 data 内，一个点是 名称 : x=, y=, size=。名称中的 \\n 会换行。",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap 打开图。x 和 y 是坐标轴标签。在 data 内，一行是 名称 : 逗号分隔的数字。标签中的 \\n 会换行。",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart 打开树。节点是 id [角色\\n姓名]（\\n 换行，方框适应文字）；color=#hex 设置填充，border=#hex 和 style=solid|dash|dot|dashdot 设置边框颜色和样式。实线边是 ->，次要上级是 -.->。",
  "site.ext.mermaid.syntax.ev":
    "ev 打开图表。days 是日期，pv 是计划，ev 是挣值，ac 是实际成本。日期标签中的 \\n 会换行。",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot 打开图表。类别行：名称 : min=, q1=, median=, q3=, max=（或 values=v1, v2, …），可选 color=#hex。名称中的 \\n 会换行。",
  "site.ext.mermaid.syntax.treemap":
    "treemap 打开图。行：分组 / 条目 : 权重 [color=#hex]。labels 控制数值和百分比的显示。名称中的 \\n 会换行。",
  "site.ext.mermaid.syntax.radar":
    "radar 打开图表。axes 列出辐条标签，series 名称 : v1, v2, … 定义一个数据系列。标签中的 \\n 会换行。",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi 打开镶嵌。在 data 内，一个站点是 名称 : x=, y=, group=, color=#hex。名称中的 \\n 会换行。",
  "site.ext.mermaid.syntax.clustered":
    "series 打开图表。categories 列出类别，series 名称 : v1, v2, … 画出柱，名称可以省略（`series : v1, v2`）；空位、\"-\" 或 null 会跳过一根柱。line 标签 : v1, v2, … 画出折线，标签可以省略（`line : v1, v2`）（跳过的位置会把两侧的点连起来），标签显示在图的右侧；color 和 style=solid|dash|dot|dashdot 设置描边。line 160 \"计划\" 画出一条水平线（没有冒号）。break 200 --> 700 从坐标轴上切掉一段。cagr 是从第一根柱到最后一根柱的复合年增长率，cagr 2, 7 连接这两根柱；format、prefix 和 label 控制椭圆。format=\"±0.0%\" 只在值为正时加上正号。互不重叠的箭头共用一层。连续的 cagr 行作用于同一个系列。stacked 把系列堆叠起来，stacked off 让柱并排，rotate 90 旋转图表。invert y 与 rotate 90 一起使用时，把第一个类别放在底部，invert y off 恢复从上到下的顺序。标签中的 \\n 会换行。y2 \"标签\" 0 --> 40 绘制第二条刻度（在右侧，rotate 90 时在上方），axis=y2 将系列、折线或水平线绑定到它。axis y off、axis y2 off 和 axis x off 隐藏所选轴及其网格。grid y2 10 绘制第二轴网格。stacked area 画出面积，labels sum 在堆叠上方写出各部分之和，gap 12 或 gap 8% 设置间距。",
  "site.primer.graphml.kw.graphml":
    "文档根。必须有 GraphML 命名空间。",
  "site.primer.graphml.kw.graph":
    "图本身。edgedefault 为 directed 或 undirected。",
  "site.primer.graphml.kw.node": "一个顶点。id 必须唯一。",
  "site.primer.graphml.kw.edge": "一条边。source 和 target 引用节点 id。",
  "site.primer.graphml.kw.key": "为节点或边声明一个属性。",
  "site.primer.graphml.kw.data":
    "属性值。可见标签写在这里，不写在 id 中。",
  "site.primer.graphml.syntax.directed":
    "graphml 是根，graph edgedefault=\"directed\" 是有向图。node 是顶点，edge 的 source 和 target 是边，data 是标签。",
  "site.primer.graphml.syntax.undirected":
    "同样的结构，edgedefault=\"undirected\"：边只连接节点。",
  "site.primer.wiremark.kw.wireframe":
    "一块屏幕。# 后面的名称是其他屏幕链接到的锚点。",
  "site.primer.wiremark.kw.flow":
    "连接多块屏幕。LR 从左到右绘制连线。",
  "site.primer.wiremark.kw.stack":
    "一列或一行。gap 设置间距，缩进设置嵌套。",
  "site.primer.wiremark.kw.typography":
    "文本。h4 和 body1 选择级别，引号字符串是标签。",
  "site.primer.wiremark.kw.textfield":
    "一个输入。标签加引号，required 等设置不加引号。",
  "site.primer.wiremark.kw.button":
    "一个按钮。contained 将其填色，to=#id 跳到另一块屏幕。",
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #anchor 打开一块屏幕。Stack 构成一列，Typography 是文本，TextField 是输入，Button 是按钮。",
  "site.primer.wiremark.syntax.flow":
    "Flow LR 从左到右连接屏幕。按钮上的 to=#anchor 跳到另一个 Wireframe。",
  "site.primer.d2.kw.direction":
    "布局方向：down、right、left 或 up。",
  "site.primer.d2.kw.shape":
    "节点形状：person、cylinder、class、sql_table、sequence_diagram。",
  "site.primer.d2.kw.arrow": "节点之间的连线。标签写在冒号后面。",
  "site.primer.d2.kw.style": "节点样式：fill、stroke 和 font。",
  "site.primer.d2.kw.constraint":
    "SQL 列约束：primary_key、foreign_key 或 unique。",
  "site.primer.d2.syntax.flowchart":
    "direction 设置布局。shape: person 和 shape: cylinder 是节点形状。连线是 ->，标签写在冒号后面。",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram 把该块变成时序图。参与者是嵌套节点，消息是 ->。",
  "site.primer.d2.syntax.class":
    "shape: class 把该块变成类。字段和方法是块内的行，连线是 ->。",
  "site.primer.d2.syntax.er":
    "shape: sql_table 把该块变成表。constraint: primary_key 和 foreign_key 标记键，连线是 字段 -> 字段。",
  "site.primer.d2.syntax.architecture":
    "嵌套块对节点分组。shape 设置形状，-> 是带标签的连线。",
  "site.primer.structurizr.kw.workspace":
    "文档根：模型的名称和简短描述。",
  "site.primer.structurizr.kw.person": "使用系统的人。",
  "site.primer.structurizr.kw.softwareSystem": "模型中的软件系统。",
  "site.primer.structurizr.kw.container":
    "系统内的应用或数据存储。第三个参数是技术。",
  "site.primer.structurizr.kw.arrow":
    "谁调用谁。关系标签加引号。",
  "site.primer.structurizr.kw.views": "要从模型绘制哪些视图。",
  "site.primer.structurizr.kw.autolayout":
    "自动视图布局：tb 是从上到下，lr 是从左到右。",
  "site.primer.structurizr.syntax.c4_context":
    "workspace 打开文档。person 和 softwareSystem 描述模型，-> 是关系，systemContext 和 autolayout 构建视图。",
  "site.primer.structurizr.syntax.c4_container":
    "softwareSystem 内的 container 是一个应用。容器视图和 include * 收集这些容器。",
  "site.primer.structurizr.syntax.component":
    "container 内的 component 描述一个模块。组件视图绘制该容器。",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment 和 deploymentNode 描述环境。containerInstance 把容器放到节点上，部署视图绘制该图。",
  "site.stackLead": "界面：",
  "site.hero.ctaPrimary": "免注册打开编辑器",
  "site.hero.ctaSecondary": "📲 安装到桌面 / 手机",
  "site.hero.trustOffline":
    "📶 可离线使用：核心功能和转换器无需互联网。",
  "site.hero.trustAi":
    "🤖 AI 与向导：从文本生成图表，或按引导分步完成。",
  "site.hero.trustConverter":
    "🔄 三合一转换器：在 PlantUML、Mermaid 和 GraphML 之间即时转换。",
  "site.hero.trustPwa":
    "💻 PWA 应用：可安装到 Windows、macOS、Linux、iOS 和 Android。",

  "site.pillars.title": "一个独立应用，覆盖代码即图表的全部需要",
  "site.pillars.item1.title": "🤖 智能创建（AI 与向导）",
  "site.pillars.item1.text":
    "不想手写语法？用自然语言向 AI 助手描述架构，或回答分步向导的问题。几秒内得到干净、有效的图表代码。",
  "site.pillars.item2.title": "⚡️ 转换与编辑（实时编辑器）",
  "site.pillars.item2.text":
    "带即时预览的在线编辑器。一键把 PlantUML 转为 Mermaid、把 Mermaid 转为 GraphML，也可以转回去。不必再为 Notion、GitHub 和 Draw.io 之间的兼容问题操心。",
  "site.pillars.item3.title": "📲 PWA、离线模式与存储",
  "site.pillars.item3.text":
    "把 Code2Graph 作为原生应用安装到笔记本或平板。工作和项目保存在本地和云端，因此在飞机上或没有网络时也能设计架构。",

  "site.deepDive.title": "完全掌控您的架构文档",
  "site.deepDive.item1.title": "🔄 双向格式转换器",
  "site.deepDive.item1.text":
    "把旧的 GraphML 图表迁到现代的 Mermaid 或 PlantUML 标准，而不丢失连线、节点或逻辑结构。",
  "site.deepDive.item2.title": "📝 强大的实时编辑器",
  "site.deepDive.item2.text":
    "语法高亮、提示和自动补全。即时渲染，没有延迟。",
  "site.deepDive.item3.title": "☁️ 存储与本地访问",
  "site.deepDive.item3.text":
    "把图表保存在私人图表库中。自动的 PWA 缓存让离线工作更稳妥。",
  "site.deepDive.item4.title": "📤 一键导出",
  "site.deepDive.item4.text":
    "将图表下载为矢量（SVG）或位图（PNG）。把现成代码复制到剪贴板，用于 Markdown / Confluence。",

  "site.formats.title": "一个工具覆盖全部关键标准",
  "site.formats.colFormat": "格式",
  "site.formats.colPurpose": "用途",
  "site.formats.colFeatures": "Code2Graph 能力",
  "site.formats.plantuml.purpose": "复杂的 UML、时序图、类图和状态图",
  "site.formats.plantuml.features": "编辑、AI 生成、转换为 Mermaid/GraphML",
  "site.formats.plantuml.summary":
    "用于时序、类、状态、C4 等的文本 UML。Code2Graph 用 @plantuml/core 和 Smetana 布局引擎离线渲染。C4 和 ArchiMate 图表使用对应的 PlantUML 标准库。",
  "site.formats.mermaid.purpose": "用于 GitHub、Notion、Obsidian 和 Jira 的轻量图表",
  "site.formats.mermaid.features": "实时预览、向导生成、导出",
  "site.formats.mermaid.summary":
    "用于 Markdown、GitHub 和笔记的紧凑图表语言。编辑器在浏览器中渲染 Mermaid；在线模式也可以使用 mermaid.ink。",
  "site.formats.graphml.purpose": "用于 yEd、Draw.io 和可视化系统的拓扑图",
  "site.formats.graphml.features": "导入、可视化、示例、转换为代码",
  "site.formats.graphml.summary":
    "yEd 和其他工具使用的 XML 图格式。Code2Graph 读取 GraphML，并用 dagre 布局。",
  "site.formats.wiremark.purpose": "写在 Markdown 里的手绘界面线框",
  "site.formats.wiremark.features": "编辑、实时预览、示例屏幕",
  "site.formats.wiremark.summary":
    "看起来像草图的文本线框。应用内预览由 @wiremark/core 绘制。",
  "site.formats.d2.purpose": "现代图表：架构、时序、类和 SQL",
  "site.formats.d2.features": "编辑、离线预览、所选语言的示例",
  "site.formats.d2.summary":
    "用于架构、时序、类和 SQL 的现代图表语言。离线预览由 @d2lang/d2 编译。",
  "site.formats.structurizr.purpose": "以代码描述的 C4 架构：上下文、容器、组件、部署",
  "site.formats.structurizr.features": "编辑、离线 C4 预览、所选语言的示例",
  "site.formats.structurizr.summary":
    "以代码描述的 C4 架构：全景、上下文、容器、组件和部署。编辑器保留 Structurizr DSL，并用 PlantUML C4 绘制视图。",

  "site.audience.title": "加快整个工程团队的速度",
  "site.audience.architect.title": "🏛 软件架构师",
  "site.audience.architect.item1": "用 AI 快速勾画 C4 模型和概念图。",
  "site.audience.architect.item2": "把公司全部文档统一到同一标准。",
  "site.audience.dev.title": "👨‍💻 开发者和团队负责人",
  "site.audience.dev.item1": "在设计任务时创建时序图。",
  "site.audience.dev.item2": "把图表当作代码，存入 Git，并离线编辑。",
  "site.audience.writer.title": "📝 技术文档作者和业务分析师",
  "site.audience.writer.item1": "用分步向导描述业务流程。",
  "site.audience.writer.item2":
    "轻松为不同平台转换图表（Notion/Confluence）。",

  "site.gettingStarted.title": "10 秒开始 — 无需复杂设置",
  "site.gettingStarted.browser.title": "方式 A：在浏览器中",
  "site.gettingStarted.browser.text":
    "打开 Code2Graph.ru，马上开始创建或转换图表。",
  "site.gettingStarted.pwa.title": "方式 B：作为 PWA 应用",
  "site.gettingStarted.pwa.text":
    "点击浏览器地址栏或落地页上的“安装应用”。Code2Graph 会出现在桌面或手机主屏幕上。",

  "site.faq.title": "常见问题",
  "site.faq.q1": "什么是 PWA，离线模式如何工作？",
  "site.faq.a1":
    "渐进式 Web 应用让您像使用设备上的普通程序一样使用网站。首次加载后，应用会缓存在本地，因此没有互联网也能转换、编辑和查看图表。",
  "site.faq.q2": "AI 生成可以离线使用吗？",
  "site.faq.a2":
    "手动编辑、格式转换、分步向导和存储都可以离线使用。AI 请求需要网络连接。",
  "site.faq.q3": "可以把 PlantUML 图表转成 Mermaid 而不丢失数据吗？",
  "site.faq.a3":
    "可以。内置转换器会翻译语法和节点，以保留原图的逻辑。",
  "site.faq.q4": "把图表存在 Code2Graph 中安全吗？",
  "site.faq.a4":
    "安全。图表保存在您的浏览器 / PWA 应用本地；有账户时，会安全地存在您的私有云中。",

  "site.finalCta.title": "代码即图表的瑞士军刀",
  "site.finalCta.text":
    "在一个地方用 AI 生成、编辑、转换并存储 PlantUML、Mermaid 和 GraphML 图表。现在就能在任何设备上使用。",
  "site.finalCta.primary": "打开 Code2Graph",
  "site.finalCta.secondary": "📲 安装 PWA",

  "site.featureOffline": "可离线使用，也支持 file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "AI 生成和编辑图表",
  "site.featureLibrary": "云端图表库",
  "site.featureLlmLocal": "BYOK 的 LLM 密钥留在浏览器中",
  "site.loginTitle": "登录",
  "site.loginSubtitle": "个人账户与云端图表库",
  "site.registerTitle": "注册",
  "site.registerSubtitle": "在 Code2Graph 服务器上创建账户",
  "site.accountTitle": "账户",
  "site.staticModeTitle": "本地版",
  "site.staticModeText":
    "此构建不带服务器或数据库：图表留在您的浏览器中。登录和云端图表库在服务器版中可用。",
  "site.username": "用户名",
  "site.password": "密码",
  "site.passwordConfirm": "确认密码",
  "site.rememberMe": "记住我",
  "site.loginSubmit": "登录",
  "site.registerSubmit": "创建账户",
  "site.logout": "退出",
  "site.openEditor": "打开编辑器",
  "site.backHome": "返回首页",
  "site.mcp.title": "面向智能体的 MCP",
  "site.mcp.connected": "已连接",
  "site.mcp.disconnected": "未连接",
  "site.mcp.lead":
    "智能体用文字描述一张图表。Code2Graph 选择语言，并返回 PlantUML、Mermaid、GraphML、WireMark、D2 或 Structurizr 的源码和图像。",
  "site.mcp.pointPlan": "plan_diagram 选择语言和图表类型。",
  "site.mcp.pointGenerate": "generate_diagram 返回图表源码和图像。",
  "site.mcp.exampleCaption":
    "generate_diagram 的结果是编辑器可以打开的源码，加上渲染后的图表图像。",
  "site.mcp.exampleSource": "源码",
  "site.mcp.exampleImage": "图像",
  "site.mcp.pointLanguages": "与编辑器和向导相同的六种语言。",
  "site.mcp.openPage": "如何连接 MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "MCP 服务器让 Cursor 和其他智能体向 Code2Graph 请求图表。它根据请求选择语言，并返回源码和图表图像。",
  "site.mcp.toolsTitle": "工具",
  "site.mcp.toolList": "本站的语言，以及每种语言接受的图表类型。",
  "site.mcp.toolPlan": "一句话对应的语言和类型，不含源码。",
  "site.mcp.toolGenerate":
    "图表源码和一张图像。设置了 CODE2GRAPH_API_URL 时，源码来自服务器；否则在本地构建同样的脚手架。图片是单独的一块：Kroki 绘制 PlantUML、D2 和 Structurizr，mermaid.ink 绘制 Mermaid，GraphML 和 WireMark 在本地绘制。",
  "site.mcp.connectTitle": "在 Cursor 中连接",
  "site.mcp.connectText":
    "从本仓库的检出目录运行脚本。把路径换成您的检出路径。URL 留空则在本地生成，或指向服务器版。",
  "site.mcp.source": "仓库中的 MCP 包",
  "site.mcp.apiTitle": "服务器 API",
  "site.mcp.apiText":
    "服务器版公开这些路由。如果设置了 AGENT_API_TOKEN，请发送 Authorization: Bearer，其值与 CODE2GRAPH_API_TOKEN 相同。",
  "site.mcp.apiFormats": "语言和类型",
  "site.mcp.apiPlan": "选择一种语言",
  "site.mcp.apiScaffold": "语言、类型和源码",
  "site.mcp.staticNote":
    "GitHub Pages 是静态编辑器，不提供 /api/agent。API 运行在服务器版上，例如 www.code2graph.ru。",
  "site.mcp.catalogTitle": "能力目录",
  "site.mcp.catalogText":
    "能力目录在本站的 /llm/。本地 MCP 从磁盘读取同样的页面，不会为了语法去访问别的服务器。回答只是编辑器里的源码，没有图片，也没有外部渲染器。",
  "site.mcp.toolCapabilities":
    "一页语言索引；如果指定了语言，就只列该语言。不包含各卡片正文。",
  "site.mcp.toolSyntax":
    "按关键词或上一个链接里的路径返回一页语法。链接到的页面不会被拼进去。",
  "site.noAccount": "没有账户？",
  "site.hasAccount": "已经有账户？",
  "site.role": "角色",
  "site.loginError": "用户名或密码无效",
  "site.registerError": "注册失败",
  "site.registerDisabled": "管理员已禁用注册",
  "site.registerStatusError":
    "无法检查服务器状态。请确认连接后重试。",
  "site.registerMismatch": "两次输入的密码不一致",
  "site.registerRequired": "请填写所有字段",
  "site.welcomeUser": "已登录为 {username}",
  "site.versionHint": "网站版本 — 更新或重新加载页面后对照",
  "site.footer.links": "项目链接",
  "site.license.title": "许可证",
  "site.license.summary":
    "源代码以 Prosperity Public License 3.0.0 提供。非商业用途免费。",
  "site.license.commercial":
    "商业用途在 30 天试用期内免费；之后需要付费许可证。",
  "site.license.read": "阅读许可证",
  "site.license.commercialLink": "商业许可证",
  "site.landing.showcaseTitle": "看、点开、就能改",
  "site.landing.showcaseHint": "下面每张图都能在编辑器中打开",
  "site.landing.tryScenario": "试试这个场景",
  "site.landing.openInEditor": "在编辑器中打开",
  "site.landing.allFormats": "6 种语言 — 一个编辑器",
  "site.landing.privacyTitle": "隐私留在你的设备上",
  "site.landing.privacyLocal": "图表在你的浏览器里绘制",
  "site.landing.privacyKey": "AI 密钥只存在你的浏览器里",
  "site.landing.privacyCloud": "云端图库仅登录后使用；AI 使用你所选服务商的网络",
  "site.landing.platformTitle": "你在哪工作，它就在哪",
  "site.landing.platformDevices": "Windows · macOS · Linux · iOS · Android",
  "site.landing.platformSame": "浏览器或已安装应用 — 同一个编辑器",
  "site.landing.platformOffline": "首次加载后可离线使用",
  "site.landing.heroAlt": "输入图表代码，图表实时生成",
  "site.landing.converterAlt": "一键把 PlantUML 转成 Mermaid，图表不变",
  "site.landing.mcpAlt": "在 Cursor 里向 AI 智能体提问并拿到成品图表",
  "site.landing.audience.developers": "开发者",
  "site.landing.audience.analysts": "分析师",
  "site.landing.audience.managers": "管理者",
  "site.landing.audience.students": "学生",
  "site.landing.audience.vibecoders": "氛围编程者",
  "site.landing.usp.developers": "评审时的时序图与 C4 — 图表即代码，进 Git、进 PR 差异",
  "site.landing.usp.analysts": "不懂语法也能画流程：向导提问，图表就生成",
  "site.landing.usp.managers": "计划与状态一张图说清：甘特图和图表一键进演示文稿",
  "site.landing.usp.students": "一分钟做出图表：模板、提示、免安装",
  "site.landing.usp.vibecoders": "智能体画图，你来修改：MCP 给 Cursor 源码和图片",
} as const satisfies LocaleMessages;
