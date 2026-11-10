import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "WireMark 指南中的屏幕种类：单个画框、应用外壳、表单、设置列表、卡片、流程，以及共用框架。",
  "site.wiremark.keywordsLead":
    "WireMark 指南中的关键字：画框根、布局、文本、组件，以及行规则。完整组件列表和图标库在文档中。",
  "site.wiremark.docsComponents": "组件参考",
  "site.wiremark.docsIcons": "图标库",

  "site.wiremark.type.login.title": "登录屏幕",
  "site.wiremark.type.login.text":
    "手机画框。标签页、带图标的字段、信息提示，以及一个填色的全宽按钮，用 to=#id 打开另一个画框。",
  "site.wiremark.type.dashboard.title": "应用外壳",
  "site.wiremark.type.dashboard.text":
    "横向画框：菜单栏、紧凑的应用栏、停靠的抽屉、图表卡片，以及带滚动条的表格。",
  "site.wiremark.type.form.title": "表单",
  "site.wiremark.type.form.text":
    "较高的画框。步骤、必填字段、value=、多行区域、下拉选择、滑块、评分、日历，以及同意复选框。",
  "site.wiremark.type.settings.title": "设置列表",
  "site.wiremark.type.settings.text":
    "应用栏、错误提示、带 to=#id 的行列表、手风琴、底部导航，以及确认对话框。",
  "site.wiremark.type.product.title": "产品卡片",
  "site.wiremark.type.product.text":
    "宽卡片。Img 使用 ratio=16:9，然后是标签芯片、地图、规格表，以及带按钮组的 CardActions。",
  "site.wiremark.type.flow.title": "屏幕流程",
  "site.wiremark.type.flow.text":
    "Flow LR 连接两个屏幕。隐藏外壳（visible=false）用 background=#id 引入，内容放在 Anchor #content 中。Icons 声明自定义标记。",
  "site.wiremark.type.chrome.title": "共用框架",
  "site.wiremark.type.chrome.text":
    "visible=false 的外壳本身不会绘制。其他画框用 background=#id 引入它，并用 anchor=#id 把内容放到 Anchor 区域中。",

  "site.wiremark.group.frame": "画框与流程",
  "site.wiremark.group.layout": "布局",
  "site.wiremark.group.text": "文本与占位",
  "site.wiremark.group.ui": "屏幕组件",
  "site.wiremark.group.syntax": "语法",

  "site.wiremark.keyword.wireframe":
    "屏幕的根。缩进在它下面的内容都属于这块屏幕。加上 #id，其他画框才能链到这里，并指定尺寸预设，或同时写 w= 和 h=。",
  "site.wiremark.keyword.frameId":
    "Wireframe 上的画框名，或 Anchor 上的区域名。to= 和 background=#id 只匹配画框。anchor= 只匹配区域。",
  "site.wiremark.keyword.mobile": "Wireframe 根上的手机宽度尺寸预设。",
  "site.wiremark.keyword.landscape":
    "宽尺寸预设。用于应用外壳或仪表盘。",
  "site.wiremark.keyword.portrait": "Wireframe 根上的高尺寸预设。",
  "site.wiremark.keyword.frameSize":
    "自定义画框尺寸。在 Wireframe 根上同时设置 w= 和 h=。当 anchor= 决定尺寸时，不要写预设。",
  "site.wiremark.keyword.visible":
    "visible=false 会把画框从流程图中隐藏，但仍可作为 background= 的目标。默认是可见的。",
  "site.wiremark.keyword.frameBackground":
    "在 Wireframe 上，background=#id 会把另一个画框画在下面。在普通元素上，background= 是一种填充线：hatch、crosshatch 或 none。",
  "site.wiremark.keyword.anchor":
    "外壳内的不可见区域。不设尺寸时会填满剩余空间。给它 #id，前景画框才能指向它。",
  "site.wiremark.keyword.anchorAt":
    "把前景画框放进其背景的某个区域。别名是 at=。该画框不要再加预设或 w=/h=。锚点优先。",
  "site.wiremark.keyword.flow":
    "顶层指令，不写在画框内部。Flow TD 是从上到下，也是默认值。Flow LR 是从左到右。",
  "site.wiremark.keyword.to":
    "在任意元素上，to=#id 把该元素链接到一个画框。导航图由这些链接构成。别名是 href=。目标只能是画框。",
  "site.wiremark.keyword.stack":
    "把子元素排在同一条轴上。默认方向是 column。gap=（spacing= 的别名）设置它们之间的间距。单独的 Stack 本身不绘制任何东西。",
  "site.wiremark.keyword.column":
    "不带键的 Stack 方向。子元素从上到下排列。column-reverse 会反转这个顺序。",
  "site.wiremark.keyword.row":
    "不带键的 Stack 方向。子元素从左到右排列。row-reverse 会反转这个顺序。",
  "site.wiremark.keyword.gap":
    "spacing= 的别名。子元素之间的间距，以间距单位计。写成 gap=2。给数字加引号会报错。",
  "site.wiremark.keyword.box":
    "通用容器。不带键的标记依次是宽度和高度：Box 240px *。outline（solid、dashed、dotted）和 elevation= 会画出可见面板。",
  "site.wiremark.keyword.grid":
    "均匀网格。子元素流入单元格。cols= 设置列数，gap= 设置间距。",
  "site.wiremark.keyword.cols": "Grid 的列数。只能写成键值：cols=3。",
  "site.wiremark.keyword.spacer":
    "一段可伸缩的空隙，沿堆叠方向把两侧元素推开。",
  "site.wiremark.keyword.divider":
    "没有属性的水平分隔线。在 Stack 上，单独的标记 divider 会在每个间隙画一条线。",
  "site.wiremark.keyword.sizing":
    "按位置指定尺寸：先宽度，后高度。240px 是像素，30% 是剩余空间的份额，* 填满该轴，单独的数字是弹性权重。写成键值的 width= 会被拒绝。",
  "site.wiremark.keyword.typography":
    "文本叶子节点。引号中的字符串是屏幕上的文字。没有文本时，单独的 Typography 会画一行占位文字。",
  "site.wiremark.keyword.typeVariant":
    "不带键的文本角色：h1–h6、subtitle1、subtitle2、body1（默认）、body2、caption、overline 或 button。标题 h1–h6 为粗体。caption 颜色较淡。",
  "site.wiremark.keyword.textField":
    "文本输入。引号中的字符串是标签。变体有 outlined（默认）、filled 和 standard。",
  "site.wiremark.keyword.fillerAmount":
    "没有真实标签时要画多少占位文字。~3 大约三行，~5w 大约五个词，~2l 大约两行。_、__ 和 ___ 分别是短、中、长。",
  "site.wiremark.keyword.fillerStyle":
    "占位文字的外观：squiggle（默认）、lorem 或 blocks。可设在 Wireframe 根上，或设在单个文本元素上。它不改变颜色。",
  "site.wiremark.keyword.required":
    "布尔标记。在 TextField 上会在标签后加上 *。",
  "site.wiremark.keyword.value":
    "字段内的键值文本。单独的引号字符串是标签，因此内容必须写成 value=\"...\"。",
  "site.wiremark.keyword.multiline":
    "布尔标记。它把 TextField 变成文本区域。rows=4 设置高度。不写 rows 时，多行字段高 3 行。",
  "site.wiremark.keyword.noWrap":
    "Typography 上的布尔标记。文字保持单行，溢出部分以省略号结束。",
  "site.wiremark.keyword.button":
    "一个操作。引号中的字符串是标签。单独的 Button 读作 Button。变体有 text（默认）、outlined 和 contained。",
  "site.wiremark.keyword.contained":
    "不带键的 Button 变体：填充线框，表示主要操作。没有 primary 关键字。",
  "site.wiremark.keyword.outlined":
    "不带键的变体。在 Button 上是无填充的边框。在 TextField 上，outlined 是默认外观。",
  "site.wiremark.keyword.link":
    "行内文本链接。引号中的字符串是标签。to=#id 导航到一个画框。",
  "site.wiremark.keyword.list":
    "由 ListItem 行组成的纵向堆叠。dense 使行更紧凑。subheader= 添加一个小标题。",
  "site.wiremark.keyword.listItem":
    "一行。引号中的字符串是标签。to=#id 使该行成为链接。ListItem 不能包含子元素。",
  "site.wiremark.keyword.appBar":
    "屏幕顶部的横条。通常包住一个 Toolbar。",
  "site.wiremark.keyword.toolbar":
    "AppBar 内的横向一行：标题、图标和操作。",
  "site.wiremark.keyword.icon":
    "一个 Material 字形。Icon Search 和 Icon \"Search\" 是同一个名称。未知名称会画出占位并给出警告。fontSize= 或 size= 取 small、medium 或 large。",
  "site.wiremark.keyword.startIcon":
    "画在标签前面的键值图标名：startIcon=Email。endIcon= 画在标签后面。不要给属性名加引号。",
  "site.wiremark.keyword.iconsBlock":
    "顶层 Icons 块，与画框并列，不写在画框内部。每一项是名称加上 SVG 路径数据。文档图标会覆盖同名的内置图标。",
  "site.wiremark.keyword.card":
    "一块表面。没有 CardContent 的子元素是正文。to=#id 使整张卡片成为链接。",
  "site.wiremark.keyword.cardContent":
    "当页眉、媒体和操作分开时，Card 的文本区域。",
  "site.wiremark.keyword.cardActions": "Card 底部的按钮行。",
  "site.wiremark.keyword.img":
    "图片的交叉占位。ratio=16:9 设置宽高比。src= 是元数据。草图仍然只画占位。",
  "site.wiremark.keyword.control":
    "复选框、单选框或开关。Control checkbox 是默认值。checked 将其打开。Control radio 和 Control switch 选择另外两种字形。",
  "site.wiremark.keyword.indent":
    "缩进表示包含关系。每一级两个空格，只能用空格。更深的一行是子元素。制表符会报错。",
  "site.wiremark.keyword.quotes":
    "引号字符串是要绘制的文本，引号是必需的。单独的词是设置：枚举、标记、数字、尺寸或图标名。不要给枚举或数字加引号。",
  "site.wiremark.keyword.keyed":
    "key=value 设置命名属性。不带键的值省略键名，并按其类型选用。顺序自由，但尺寸必须先宽度后高度。",
  "site.wiremark.keyword.comment":
    "// 注释一直到行尾。# 表示锚点，因此它不是注释。",
} as const satisfies LocaleMessages;
