import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "从剪贴板粘贴表格",
  "editor.pasteTableHistory": "粘贴表格",
  "tablePaste.modalTitle": "无法从剪贴板粘贴表格",
  "tablePaste.reasonLabel": "出了什么问题",
  "tablePaste.expectedLabel": "期望的表格格式（{type}）",
  "tablePaste.columnsLabel": "列：",
  "tablePaste.rulesLabel": "转换规则：",
  "tablePaste.sampleLabel": "可复制的示例表格（Excel / Google 表格 / TSV）：",
  "tablePaste.error.emptyClipboard":
    "剪贴板是空的。请从 Excel 或 Google 表格复制一块单元格，或复制用制表符/分号分隔的表格。",
  "tablePaste.error.clipboardReadFailed":
    "无法读取剪贴板。请在浏览器中授予剪贴板权限后重试。",
  "tablePaste.error.notATable":
    "剪贴板内容不是表格（至少需要 2 列，并以制表符、';' 或 '|' 分隔）。",
  "tablePaste.error.tooManyColumns":
    "列太多：剪贴板中有 {actual} 列，此图表期望 {expected} 列。",
  "tablePaste.error.tooFewColumns":
    "列太少：剪贴板中有 {actual} 列，此图表期望 {expected} 列。",
  "tablePaste.error.tooFewColumnsMin":
    "列太少：剪贴板中有 {actual} 列，至少需要 {min} 列。",
  "tablePaste.error.tooFewRowsMin":
    "行太少：剪贴板中有 {actual} 行，至少需要 {min} 行。",
  "tablePaste.error.expectedColumnRange":
    "列数无效：剪贴板中有 {actual} 列，期望在 {min} 到 {max} 列之间。",
  "tablePaste.error.waterfallColumns":
    "期望 2 列：一列是文本标签，一列是数字（合计为 '=' 时单元格可为空）。",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "第一行数据（第 {row} 行）必须有起始数值（'=数字'），不能是空单元格。",
  "tablePaste.error.noNumericColumn":
    "两列都不包含数值。",
  "tablePaste.error.invalidNumberAtRow":
    "第 {row} 行：值“{value}”不是有效数字。",
  "tablePaste.error.negativeNotAllowedAtRow":
    "第 {row} 行：饼图不允许负值“{value}”。",
  "tablePaste.error.noDataRows":
    "复制的表格没有数据行。",
  "tablePaste.type.waterfall": "瀑布图",
  "tablePaste.type.pie": "饼图",
  "tablePaste.type.heatmap": "热力图",
  "tablePaste.type.bubble": "气泡图",
  "tablePaste.type.ev": "挣值（EV）",
  "tablePaste.type.boxplot": "箱线图",
  "tablePaste.type.treemap": "矩形树图",
  "tablePaste.type.radar": "雷达图",
  "tablePaste.type.voronoi": "沃罗诺伊图",
  "tablePaste.type.clustered": "系列图",
  "tablePaste.type.xychart": "XY 图（柱状 / 折线）",
  "tablePaste.type.quadrant": "四象限图",
  "tablePaste.type.sankey": "桑基图",
  "tablePaste.type.orgchart": "组织结构图",
  "tablePaste.type.gantt": "甘特图",
  "tablePaste.type.timeline": "时间线",
  "tablePaste.type.journey": "用户旅程",
  "tablePaste.type.packet": "报文头",
  "tablePaste.type.wbs": "工作分解（WBS）",
  "tablePaste.type.mindmap": "思维导图",
  "tablePaste.type.nwdiag": "网络图（Nwdiag）",
  "tablePaste.type.wireframe": "WireMark 表格",
  "tablePaste.expected.waterfall.columns":
    "2 列，顺序不限：'标签' 和 '值'（或 '值' 和 '标签'）。",
  "tablePaste.expected.waterfall.rules":
    "第一个数字成为起始柱（=N），正数成为增加（+N），负数成为减少（-N），空单元格（或 '='）成为累计合计（= : 标签）。",
  "tablePaste.expected.waterfall.headers": "标签|值",
  "tablePaste.expected.pie.columns":
    "2 列，顺序不限：'类别' 和 '非负数字'。",
  "tablePaste.expected.pie.rules":
    "每一行成为一个扇区：\"类别\" : 值。",
  "tablePaste.expected.pie.headers": "类别|份额",
  "tablePaste.expected.heatmap.columns":
    "至少 2×2 的矩阵：第一行是 X 列表头，第一列是 Y 行标签，内部单元格是数字（或空单元格）。",
  "tablePaste.expected.heatmap.rules":
    "x 和 y 行会插入到色标块之前。如果没有色标，会按最小值到最大值添加一条从蓝到红的色标。空单元格成为空位。",
  "tablePaste.expected.heatmap.headers": "期间|周一|周二|周三",
  "tablePaste.expected.bubble.columns":
    "4 或 5 列：'标签'、'X（数字）'、'Y（数字）'、'大小（数字）'、['分组（可选）']。",
  "tablePaste.expected.bubble.rules":
    "每一行成为一个气泡点：标签 : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "产品|X|Y|大小|分组",
  "tablePaste.expected.ev.columns":
    "4 列：'期间（天）'、'PV（计划）'、'EV（挣值）'、'AC（实际）'（或 4 行：days、pv、ev、ac）。",
  "tablePaste.expected.ev.rules":
    "为挣值图生成 days、pv、ev 和 ac 系列。",
  "tablePaste.expected.ev.headers": "期间|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 列（'类别'、'最小值'、'Q1'、'中位数'、'Q3'、'最大值'），或 4 列及以上的原始观测（'类别'、'样本 1'、'样本 2'、'样本 3'…）。",
  "tablePaste.expected.boxplot.rules":
    "五数概括生成 min=...、q1=...、median=...、q3=...、max=...，原始样本观测生成 values=...。",
  "tablePaste.expected.boxplot.headers": "类别|最小值|Q1|中位数|Q3|最大值",
  "tablePaste.expected.treemap.columns":
    "2 到 4 列：'条目 | 权重' 或 '分组 | 条目 | 权重 [| 颜色]'。",
  "tablePaste.expected.treemap.rules":
    "生成层级块 '分组 / 条目 : 权重'（权重必须大于 0）。",
  "tablePaste.expected.treemap.headers": "分组|条目|权重",
  "tablePaste.expected.radar.columns":
    "至少 4 列的矩阵：第一行是轴名称（至少 3 条轴），第一列是系列名称，内部单元格是数字。",
  "tablePaste.expected.radar.rules":
    "由表头行生成 axes 指令，以及 'series 名称 : v1, v2, ...' 行。",
  "tablePaste.expected.radar.headers": "系列|速度|可靠性|易用性|安全性",
  "tablePaste.expected.voronoi.columns":
    "3 到 5 列：'站点'、'X（数字）'、'Y（数字）'、['分组']、['颜色']。",
  "tablePaste.expected.voronoi.rules":
    "每一行成为一个沃罗诺伊站点：站点 : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "站点|X|Y|分组",
  "tablePaste.expected.clustered.columns":
    "至少 2×2 的矩阵：第一列是类别，第一行是系列名称（表头以 '系列' 开头时则转置）。",
  "tablePaste.expected.clustered.rules":
    "生成 categories 和 series 行，并保留 rotate 90、invert y 和颜色指令。",
  "tablePaste.expected.clustered.headers": "类别|北部|南部|出口",
  "tablePaste.expected.xychart.columns":
    "1 列或更多。一列数字用于柱 [值 1, ..., 值 n]。两列是 'X 类别' 和 '柱值'。三列或更多是 'X 类别'，再加上每个额外列对应的一个柱系列。",
  "tablePaste.expected.xychart.rules":
    "一列会替换已有的 bar [数值] 行。两列或更多会替换 x 轴和所有 bar 行，每个数值列对应一个 bar [...] 系列。如果图表还没有 y 轴，会添加 y-axis \"\" min --> max。",
  "tablePaste.expected.xychart.headers": "月份|计划|实际|预测",
  "tablePaste.expected.quadrant.columns":
    "3 列：'点标签'、'X（0..1 或 0..100%）'、'Y（0..1 或 0..100%）'。",
  "tablePaste.expected.quadrant.rules":
    "大于 1 的坐标会自动从百分比（0..100）归一化到 [0..1]。",
  "tablePaste.expected.quadrant.headers": "条目|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 列：'来源'、'目标'、'流量值（数字）'。",
  "tablePaste.expected.sankey.rules":
    "每一行成为一条流量：来源,目标,值。",
  "tablePaste.expected.sankey.headers": "来源|目标|流量",
  "tablePaste.expected.orgchart.columns":
    "2 或 3 列：'上级'、'直接下属'、['边样式（虚线）或职务']。",
  "tablePaste.expected.orgchart.rules":
    "生成组织结构节点，以及实线（->）或虚线（-.->）汇报线。",
  "tablePaste.expected.orgchart.headers": "上级|下属|连线",
  "tablePaste.expected.gantt.columns":
    "2 到 4 列：'任务'、'开始日期或时长'、['时长（5d）']、['分区']。",
  "tablePaste.expected.gantt.rules":
    "生成甘特图任务行（在 Mermaid 中按分区归组）。",
  "tablePaste.expected.gantt.headers": "任务|开始|时长|分区",
  "tablePaste.expected.timeline.columns":
    "2 或 3 列：'期间 / 日期'、'事件'、['分区（可选）']。",
  "tablePaste.expected.timeline.rules":
    "每一行成为一条时间线记录 '期间 : 事件'。",
  "tablePaste.expected.timeline.headers": "期间|事件|分区",
  "tablePaste.expected.journey.columns":
    "2 到 4 列：'步骤'、'分数（1–5）'、['参与者']、['分区']。",
  "tablePaste.expected.journey.rules":
    "生成用户旅程步骤 '步骤: 分数: 参与者'。",
  "tablePaste.expected.journey.headers": "步骤|分数|参与者|分区",
  "tablePaste.expected.packet.columns":
    "2 列，顺序不限：'位范围（0-15）或位长度（16）' 和 '字段名'。",
  "tablePaste.expected.packet.rules":
    "生成报文字段 '0-15: \"字段\"'（位长度会自动累加成范围）。",
  "tablePaste.expected.packet.headers": "位数|字段",
  "tablePaste.expected.wbs.columns":
    "2 列或更多，表示层级：'第 1 层（根）'、'第 2 层'、'第 3 层' 等。",
  "tablePaste.expected.wbs.rules":
    "构建 WBS 树（*、**、***），并自动合并相同的父单元格。",
  "tablePaste.expected.wbs.headers": "第 1 层|第 2 层|第 3 层",
  "tablePaste.expected.mindmap.columns":
    "2 列或更多，表示树的深度：'根'、'分支'、'子分支' 等。",
  "tablePaste.expected.mindmap.rules":
    "构建思维导图树，并合并相同的父节点。粘贴的节点会替换全部导图节点。图例、标题、页眉、页脚、题注、样式和注释会保留。",
  "tablePaste.expected.mindmap.headers": "根|分支|叶子",
  "tablePaste.expected.nwdiag.columns":
    "2 或 3 列：'节点'、'IP 地址'、['网络（可选）']。",
  "tablePaste.expected.nwdiag.rules":
    "按网络把节点归入 network { node [address = \"...\"] } 块。",
  "tablePaste.expected.nwdiag.headers": "节点|IP 地址|网络",
  "tablePaste.expected.wireframe.columns":
    "任意至少 2 列的表格（第一行是表头，其余行是表体）。",
  "tablePaste.expected.wireframe.rules":
    "生成带 TableHead 和 TableBody 的 WireMark Table 组件（数字列右对齐）。",
  "tablePaste.expected.wireframe.headers": "名称|作者|状态|浏览",
  "tablePaste.type.powermap": "权力图",
  "tablePaste.expected.powermap.columns": "姓名、职务、上级、角色、影响力、行动需求、态度、对接人和关系（solid、dotted 或关系名）。",
  "tablePaste.expected.powermap.rules": "每一行是一个人。solid 和 dotted 是汇报线。其他名称是影响箭头。",
  "tablePaste.expected.powermap.headers": "姓名|职务|上级|角色|影响力|行动|态度|对接人|关系",

} as const satisfies LocaleMessages;
