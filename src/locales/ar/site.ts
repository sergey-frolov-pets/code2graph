import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "استوديو المخططات كنص",
  "site.nav.features": "المزايا",
  "site.nav.converter": "المحوّل والذكاء الاصطناعي",
  "site.nav.pwa": "PWA / دون اتصال",
  "site.nav.formats": "التنسيقات",
  "site.nav.faq": "الأسئلة الشائعة",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "النقاشات",
  "site.hero.askQuestion": "💬 اطرح سؤالًا",
  "site.github.star": "نجمة",
  "site.github.starLabel": "منح نجمة لـ code2graph على GitHub",
  "site.hero.viewOnGithub": "العرض على GitHub",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "استوديو PWA لـ PlantUML وMermaid وGraphML وWireMark وD2 وStructurizr. يعيد MCP للوكلاء مصدر المخطط وصورة.",
  "site.landingCtaApp": "فتح المحرر",
  "site.landingCtaInstallPwa": "📲 تثبيت PWA",
  "site.landingCtaRegister": "إنشاء حساب",
  "site.landingCtaLogin": "تسجيل الدخول",
  "site.landingCtaTryFree": "جرّب مجانًا",
  "site.landingCtaDemo": "عرض تجريبي",

  "site.hero.title": "مخططات نصية في المتصفح",
  "site.hero.subtitle":
    "اكتب مخططًا وشاهده فورًا. PlantUML وMermaid وGraphML وWireMark وD2 وStructurizr — بما في ذلك دون اتصال. يمنح MCP الوكيل المصدر والصورة.",
  "site.offlineNote": "يعمل التحرير والمعاينة بلا شبكة.",
  "site.languages.title": "اللغات",
  "site.language.sites": "المواقع",
  "site.language.libraries": "المكتبات المستخدمة في التطبيق",
  "site.language.types": "أنواع المخططات الرئيسة",
  "site.language.diagramTypes": "أنواع المخططات",
  "site.language.keywords": "الكلمات المفتاحية",
  "site.language.example": "مثال",
  "site.language.syntax": "الصياغة",
  "site.language.preview": "كيف يبدو: {title}",
  "site.language.previewFailed": "تعذر رسم المثال",
  "site.primer.graphml.type.directed.title": "رسم موجه",
  "site.primer.graphml.type.directed.summary":
    "تسير الحواف من مصدر إلى هدف. هكذا يرسم Code2Graph ملفات GraphML افتراضيًا.",
  "site.primer.graphml.type.undirected.title": "رسم غير موجه",
  "site.primer.graphml.type.undirected.summary":
    "الحواف تصل العقد فقط، بلا اتجاه.",
  "site.primer.wiremark.type.flow.title": "شاشات مترابطة",
  "site.primer.wiremark.type.flow.summary":
    "عدة إطارات سلكية في ملف واحد، مع قفزات to=#anchor بينها.",
  "site.primer.plantuml.kw.startuml":
    "يفتحان @startuml و@enduml المخطط ويغلقانه.",
  "site.primer.plantuml.kw.participant":
    "خط حياة مسمّى. يمنحه as اسمًا مختصرًا.",
  "site.primer.plantuml.kw.arrow": "رسالة: -> نحو مشارك، و--> للرد.",
  "site.primer.plantuml.kw.alt":
    "فروع متنافية. else هو الفرع الآخر، وend يغلق الكتلة.",
  "site.primer.plantuml.kw.note": "ملاحظة إلى اليسار أو اليمين أو فوق المشاركين.",
  "site.primer.plantuml.kw.if":
    "قرار نشاط: then وelse، ويُغلق بـ endif.",
  "site.primer.plantuml.kw.skinparam":
    "إعداد نمط مشترك، مثل لون الخلفية.",
  "site.primer.plantuml.syntax.sequence":
    "يسمّي actor وparticipant خط حياة، وas هو الاسم المختصر. الرسالة ->، والرد -->، والتسمية بعد النقطتين.",
  "site.primer.plantuml.syntax.class":
    "يفتح class صنفًا؛ وتجلس الحقول والدوال داخل الأقواس. الرابط --> مع التعددية بين علامتي اقتباس.",
  "site.primer.plantuml.syntax.activity":
    "start وstop هما الطرفان. الخطوة :نص;. القرار هو if () then () وelse وendif.",
  "site.primer.plantuml.syntax.state":
    "[*] هي البداية والنهاية. الانتقال -->، وتسمية الحدث بعد النقطتين.",
  "site.primer.plantuml.syntax.usecase":
    "يعلنان actor وusecase عن الممثل والحالة. الرابط -->، والاتجاه left to right direction.",
  "site.primer.plantuml.syntax.c4_context":
    "تصف Person() وSystem() وRel() الأشخاص والنظام والرابط. تُجلب المكتبة بـ !include.",
  "site.primer.mermaid.kw.participant":
    "مشارك في التسلسل. يستبدل as التسمية الظاهرة.",
  "site.primer.mermaid.kw.arrow":
    "رسالة: ->> سهم متصل، و-->> رد منقط.",
  "site.primer.mermaid.kw.alt":
    "فروع التسلسل. else هو الفرع الآخر، وend يغلق الكتلة.",
  "site.primer.mermaid.kw.note": "ملاحظة إلى يمين مشارك، أو فوق عدة مشاركين.",
  "site.primer.mermaid.kw.subgraph": "مجموعة عقد في المخطط التدفقي. أغلقها بـ end.",
  "site.primer.mermaid.kw.class": "صنف بحقول ودوال داخل classDiagram.",
  "site.primer.mermaid.kw.section": "مجموعة مهام في مخطط غانت.",
  "site.primer.mermaid.syntax.flowchart":
    "يضبط flowchart TD الاتجاه. الخطوة [نص]، والقرار {text}، والبداية ([نص]). السهم -->، وتسمية الفرع |نعم|.",
  "site.primer.mermaid.syntax.sequence":
    "يفتح sequenceDiagram المخطط. يسمّي actor وparticipant مع as خط حياة. الطلب ->>، والرد -->>.",
  "site.primer.mermaid.syntax.class":
    "يفتح classDiagram المخطط. يضم class Name { } حقول +name type والدوال. الرابط -->.",
  "site.primer.mermaid.syntax.state":
    "يفتح stateDiagram-v2 المخطط. [*] هي البداية. الانتقال -->، والتسمية بعد النقطتين.",
  "site.primer.mermaid.syntax.er":
    "يفتح erDiagram المخطط. تُقرأ ||--o{ واحدًا إلى متعدد، والدور بعد النقطتين.",
  "site.primer.mermaid.syntax.gantt":
    "يفتح gantt المخطط. title هو العنوان، وdateFormat نمط التاريخ، وsection مجموعة. المهمة هي الاسم :id، التاريخ، المدة.",
  "site.primer.mermaid.syntax.mindmap":
    "يفتح mindmap الخريطة. الجذر root((الموضوع)). الإزاحة تحدد التداخل.",
  "site.primer.mermaid.syntax.pie":
    "تطبع pie showData الأرقام. title هو العنوان. الشريحة \"الاسم\" : رقم.",
  "site.primer.mermaid.syntax.journey":
    "يفتح journey المسار. title هو العنوان، وsection مرحلة. المهمة هي الاسم: الدرجة: الدور.",
  "site.primer.mermaid.syntax.gitgraph":
    "يفتح gitGraph التاريخ. commit إيداع، وbranch فرع، وcheckout تبديل، وmerge دمج.",
  "site.primer.mermaid.syntax.timeline":
    "يفتح timeline المقياس. title هو العنوان، وsection فترة. الأحداث بعد النقطتين.",
  "site.primer.mermaid.syntax.sankey":
    "يفتح sankey-beta التدفقات. كل سطر هو source,target,weight. أسماء العقد ASCII؛ ضع بين علامتي اقتباس الاسم الذي يحتوي فاصلة. الخيارات ليست أعمدة CSV: اضبطها في ترويسة YAML من config.sankey قبل الكلمة المفتاحية (showValues وprefix وsuffix وlinkColor وnodeAlignment وwidth وheight وuseMaxWidth وnodeWidth وnodePadding وlabelStyle وnodeColors).",
  "site.primer.mermaid.syntax.xychart":
    "يفتح xychart-beta المخطط. x-axis هي الفئات، وy-axis المدى، وbar وline سلسلتان.",
  "site.primer.mermaid.syntax.block":
    "يفتح block-beta الكتل. يضبط columns عدد الأعمدة. الكتلة id[\"التسمية\"]، والرابط -->.",
  "site.primer.mermaid.syntax.c4_context":
    "يفتح C4Context السياق. يعلنان Person() وSystem() عن العناصر، وRel() رابط.",
  "site.primer.mermaid.syntax.requirement":
    "يفتح requirementDiagram المخطط. requirement { } متطلب، وelement { } عنصر، والرابط satisfies.",
  "site.primer.mermaid.syntax.quadrant":
    "يفتح quadrantChart الأرباع. x-axis وy-axis هما المحوران، وquadrant-1 … quadrant-4 الأسماء، والنقطة هي الاسم: [x, y].",
  "site.primer.mermaid.syntax.architecture":
    "يفتح architecture-beta المخطط. group مجموعة، وservice خدمة، والرابط service:R --> L:service.",
  "site.primer.mermaid.syntax.packet":
    "يفتح packet-beta الحزمة. title هو العنوان. الحقل نطاق بتات وتسمية، مثل 0-15: \"المصدر\".",
  "site.ext.mermaid.title": "امتداد Mermaid Ext",
  "site.ext.mermaid.lead":
    "خمسة أنواع مخططات لا يملكها Mermaid العادي: الشلالي، والفقاعي، والخريطة الحرارية، والمخطط التنظيمي، والقيمة المكتسبة. يرسمها محرك مدمج، بلا خدمات خارجية.",
  "site.ext.mermaid.note":
    "تُرسم الأنواع الخمسة كلها بالمحرك المدمج، بلا خدمات خارجية. إذا لم يُعرض المثال أدناه في المحرر، فهذا البناء صُنع بلا الامتداد.",
  "site.ext.mermaid.type.waterfall": "شلالي",
  "site.ext.mermaid.type.bubble": "فقاعي",
  "site.ext.mermaid.type.heatmap": "خريطة حرارية",
  "site.ext.mermaid.type.orgchart": "مخطط تنظيمي",
  "site.ext.mermaid.type.ev": "القيمة المكتسبة",
  "site.ext.mermaid.type.boxplot": "مخطط صندوقي",
  "site.ext.mermaid.type.treemap": "خريطة شجرية",
  "site.ext.mermaid.type.radar": "مخطط راداري",
  "site.ext.mermaid.type.voronoi": "تقسيم فورونوي",
  "site.ext.mermaid.type.clustered": "مخطط سلاسل",
  "site.ext.mermaid.desc.waterfall":
    "كيف تتحول قيمة البداية إلى إجمالي عبر خطوات + و−. الأعمدة المطلقة تبدأ بـ =، وتُعلَن عدة سيناريوهات بـ series. تُدعم فواصل المحور، والوضع الأبيض والأسود (mono وmono invert)، والألوان المخصصة.",
  "site.ext.mermaid.desc.bubble":
    "ثلاثة أبعاد دفعة واحدة: x وy وحجم الفقاعة. وأرباع BCG ومجموعات الألوان اختيارية.",
  "site.ext.mermaid.desc.heatmap":
    "مصفوفة قيم بمقياس ألوان. نطاقات المقياس صريحة، والخلية الفارغة (فاصلان متتاليان) تُرسم رمادية.",
  "site.ext.mermaid.desc.orgchart":
    "شجرة تبعية بحواف صريحة: المتصل هو الخط الرئيس، والمنقط -.-> مدير ثانوي. يمكن للكتلة ضبط تعبئتها (color) وحدّها (border وstyle). تُجمع عدة جذور تحت جذر غير مرئي. يعرض avatar صورة أو صورة ظلية: ذكر أو أنثى أو جنس غير معروف.",
  "site.ext.mermaid.desc.ev":
    "ثلاثة منحنيات تراكمية حسب اليوم: القيمة المخططة PV، والقيمة المكتسبة EV، والتكلفة الفعلية AC. بالإضافة إلى انحرافَي SV وCV في وسيلة الإيضاح.",
  "site.ext.mermaid.desc.boxplot":
    "التوزيع عبر الفئات: الأدنى، والربيعين الأدنى والأعلى (Q1 وQ3)، والوسيط، والأقصى، والمتوسط، والقيم الشاذة. يقبل إما ملخص الأعداد الخمسة الصريح أو مشاهدات خام (values=).",
  "site.ext.mermaid.desc.treemap":
    "تقسيم مستطيلات هرمي عبر المجموعات والعناصر بما يتناسب مع الوزن الرقمي، مع حصص مئوية تلقائية وتظليل لوني.",
  "site.ext.mermaid.desc.radar":
    "يقارن عدة سلاسل عبر محاور شعاعية من مركز مشترك، مع حلقات شبكة قابلة للضبط وعتامة تعبئة وألوان مخصصة.",
  "site.ext.mermaid.desc.voronoi":
    "تقسيم هندسي للمستوى إلى خلايا محدبة لأقرب جار، مع مجموعات ألوان وتسميات المراكز.",
  "site.ext.mermaid.desc.clustered":
    "أشرطة لعدة سلاسل عبر الفئات، جنبًا إلى جنب أو متراكمة، مع خطوط متراكبة ومستويات أفقية وفاصل محور ووسائل CAGR وتدوير 90 درجة (rotate 90) ومحور رأسي مقلوب (invert y) ووضع أبيض وأسود (mono وmono invert).",
  "site.ext.mermaid.syntax.waterfall":
    "يفتح waterfall المخطط. يضبط y المحور. = عمود مطلق، و+ و- خطوة، والتسمية بعد النقطتين. يكسر \\n في التسمية السطر.",
  "site.ext.mermaid.syntax.bubble":
    "يفتح bubble المخطط. تضبط x وy وsize المحاور والحجم. داخل data تكون النقطة الاسم : x=، y=، size=. يكسر \\n في الاسم السطر.",
  "site.ext.mermaid.syntax.heatmap":
    "يفتح heatmap الخريطة. x وy تسميتا المحورين. داخل data يكون الصف الاسم : أرقام مفصولة بفواصل. يكسر \\n في التسمية السطر.",
  "site.ext.mermaid.syntax.orgchart":
    "يفتح orgchart الشجرة. العقدة هي id [الدور\\nالاسم] (يكسر \\n السطر، وينطبق الصندوق على النص)؛ يضبط color=#hex التعبئة، ويضبط border=#hex وstyle=solid|dash|dot|dashdot لون الحد ونمطه. يعرض avatar 48 مربع الصورة؛ يختار gender=m|f|? الصورة الظلية، ويضع photo= الصورة، ويخفي avatar off المربع. الحافة المتصلة ->، والمدير الثانوي -.->.",
  "site.ext.mermaid.syntax.ev":
    "يفتح ev المخطط. days هي الأيام، وpv الخطة، وev القيمة المكتسبة، وac التكلفة الفعلية. يكسر \\n في تسمية اليوم السطر.",
  "site.ext.mermaid.syntax.boxplot":
    "يفتح boxplot المخطط. صف الفئة: الاسم : min=، q1=، median=، q3=، max= (أو values=v1, v2, …) مع color=#hex اختياري. يكسر \\n في الاسم السطر.",
  "site.ext.mermaid.syntax.treemap":
    "يفتح treemap الخريطة. الصف: المجموعة / العنصر : الوزن [color=#hex]. يتحكم labels في عرض القيمة والنسبة. يكسر \\n في الاسم السطر.",
  "site.ext.mermaid.syntax.radar":
    "يفتح radar المخطط. يسرد axes تسميات المحاور، ويعرّف series الاسم : v1, v2, … سلسلة بيانات. يكسر \\n في التسمية السطر.",
  "site.ext.mermaid.syntax.voronoi":
    "يفتح voronoi التقسيم. داخل data يكون الموقع الاسم : x=، y=، group=، color=#hex. يكسر \\n في الاسم السطر.",
  "site.ext.mermaid.syntax.clustered":
    "يفتح series المخطط. يسرد categories الفئات، ويرسم series الاسم : v1, v2, … الأشرطة، ويمكن حذف الاسم (`series : v1, v2`)؛ والخلية الفارغة أو \"-\" أو null تتجاوز شريطًا. يرسم line التسمية : v1, v2, … خطًا، ويمكن حذف التسمية (`line : v1, v2`) (الفجوة المتروكة تصل النقطتين على الجانبين) وتظهر تسميته يمين الرسم؛ ويضبط color وstyle=solid|dash|dot|dashdot شكل الخط. يرسم line 160 \"plan\" مستوى أفقيًا (بلا نقطتين). يقطع break 200 --> 700 نطاقًا من المحور. cagr هو CAGR من أول شريط إلى آخره، ويصل cagr 2, 7 بين هذين الشريطين؛ وتتحكم format وprefix وlabel في الشكل البيضوي. يضيف format=\"±0.0%\" علامة زائد فقط عندما تكون القيمة موجبة. الأسهم التي لا تتداخل تشترك في مستوى واحد. تنطبق أسطر cagr المتتالية على سلسلة واحدة. يكدّس stacked السلاسل، ويضع stacked off الأشرطة جنبًا إلى جنب، ويدير rotate 90 المخطط. يضع invert y مع rotate 90 الفئة الأولى في الأسفل، ويعيد invert y off الترتيب من الأعلى إلى الأسفل. يكسر y2 \"تسمية\" 0 --> 40 يرسم مقياسًا ثانيًا (على اليمين، وفي الأعلى مع rotate 90)، و axis=y2 يربط سلسلة أو خطًا أو مستوى به. \\n في التسمية السطر.",
  "site.primer.graphml.kw.graphml":
    "جذر المستند. فضاء أسماء GraphML لازم.",
  "site.primer.graphml.kw.graph":
    "الرسم نفسه. edgedefault يكون directed أو undirected.",
  "site.primer.graphml.kw.node": "رأس. يجب أن يكون id فريدًا.",
  "site.primer.graphml.kw.edge": "حافة. يشير source وtarget إلى معرفات العقد.",
  "site.primer.graphml.kw.key": "يعلن عن خاصية للعقد أو الحواف.",
  "site.primer.graphml.kw.data":
    "قيمة خاصية. التسمية الظاهرة هنا، لا في id.",
  "site.primer.graphml.syntax.directed":
    "graphml هو الجذر، وgraph edgedefault=\"directed\" رسم موجه. node رأس، وedge source وtarget حافة، وdata التسمية.",
  "site.primer.graphml.syntax.undirected":
    "الشكل نفسه، مع edgedefault=\"undirected\": الحافة تصل العقد فقط.",
  "site.primer.wiremark.kw.wireframe":
    "شاشة واحدة. الاسم بعد # هو المرساة التي تربط إليها الشاشات الأخرى.",
  "site.primer.wiremark.kw.flow":
    "يربط عدة شاشات. يرسم LR الروابط من اليسار إلى اليمين.",
  "site.primer.wiremark.kw.stack":
    "عمود أو صف. يضبط gap التباعد، والإزاحة تحدد التداخل.",
  "site.primer.wiremark.kw.typography":
    "نص. يختاران h4 وbody1 المستوى، والسلسلة بين علامتي اقتباس هي التسمية.",
  "site.primer.wiremark.kw.textfield":
    "حقل إدخال. التسمية بين علامتي اقتباس، والإعدادات مثل required ليست كذلك.",
  "site.primer.wiremark.kw.button":
    "زر. يملؤه contained، ويقفز to=#id إلى شاشة أخرى.",
  "site.primer.wiremark.syntax.wireframe":
    "يفتح Wireframe #anchor شاشة. يبني Stack عمودًا، وTypography نص، وTextField إدخال، وButton زر.",
  "site.primer.wiremark.syntax.flow":
    "يربط Flow LR الشاشات من اليسار إلى اليمين. يقفز to=#anchor على زر إلى Wireframe آخر.",
  "site.primer.d2.kw.direction":
    "اتجاه التخطيط: down أو right أو left أو up.",
  "site.primer.d2.kw.shape":
    "شكل العقدة: person أو cylinder أو class أو sql_table أو sequence_diagram.",
  "site.primer.d2.kw.arrow": "رابط بين العقد. التسمية بعد النقطتين.",
  "site.primer.d2.kw.style": "تنسيق العقدة: التعبئة والحد والخط.",
  "site.primer.d2.kw.constraint":
    "قيد عمود SQL: primary_key أو foreign_key أو unique.",
  "site.primer.d2.syntax.flowchart":
    "يضبط direction التخطيط. shape: person وshape: cylinder شكلان للعقدة. الرابط -> مع تسمية بعد النقطتين.",
  "site.primer.d2.syntax.sequence":
    "يحوّل shape: sequence_diagram الكتلة إلى تسلسل. المشاركون عقد متداخلة، والرسالة ->.",
  "site.primer.d2.syntax.class":
    "يحوّل shape: class الكتلة إلى صنف. الحقول والدوال أسطر داخل الكتلة، والرابط ->.",
  "site.primer.d2.syntax.er":
    "يحوّل shape: sql_table الكتلة إلى جدول. يعلّمان constraint: primary_key وforeign_key المفاتيح، والرابط field -> field.",
  "site.primer.d2.syntax.architecture":
    "تجمّع الكتل المتداخلة العقد. يضبط shape الشكل، و-> رابط مُسمّى.",
  "site.primer.structurizr.kw.workspace":
    "جذر المستند: اسم ووصف قصير للنموذج.",
  "site.primer.structurizr.kw.person": "شخص يستخدم النظام.",
  "site.primer.structurizr.kw.softwareSystem": "نظام برمجي في النموذج.",
  "site.primer.structurizr.kw.container":
    "تطبيق أو مخزن بيانات داخل نظام. الوسيط الثالث هو التقنية.",
  "site.primer.structurizr.kw.arrow":
    "من يستدعي من. تسمية العلاقة بين علامتي اقتباس.",
  "site.primer.structurizr.kw.views": "أي العروض تُرسم من النموذج.",
  "site.primer.structurizr.kw.autolayout":
    "تخطيط العرض تلقائيًا: tb من الأعلى إلى الأسفل، وlr من اليسار إلى اليمين.",
  "site.primer.structurizr.syntax.c4_context":
    "يفتح workspace المستند. يصف person وsoftwareSystem النموذج، و-> علاقة، ويبني systemContext وautolayout العرض.",
  "site.primer.structurizr.syntax.c4_container":
    "container داخل softwareSystem هو تطبيق. يجمع عرض الحاويات وinclude * الحاويات.",
  "site.primer.structurizr.syntax.component":
    "يصف component داخل container وحدة. يرسم عرض المكونات تلك الحاوية.",
  "site.primer.structurizr.syntax.deployment":
    "يصف deploymentEnvironment وdeploymentNode البيئة. يضع containerInstance حاوية على عقدة، ويرسم عرض النشر المخطط.",
  "site.stackLead": "الواجهة:",
  "site.hero.ctaPrimary": "فتح المحرر بلا تسجيل",
  "site.hero.ctaSecondary": "📲 التثبيت على سطح المكتب / الهاتف",
  "site.hero.trustOffline":
    "📶 يعمل دون اتصال: المزايا الأساسية والمحوّل متاحان بلا إنترنت.",
  "site.hero.trustAi":
    "🤖 الذكاء الاصطناعي والمعالج: ولّد المخططات من النص أو عبر مسار موجه خطوة بخطوة.",
  "site.hero.trustConverter":
    "🔄 محوّل 3 في 1: ترجمة فورية بين PlantUML وMermaid وGraphML.",
  "site.hero.trustPwa":
    "💻 تطبيق PWA: ثبّته على Windows وmacOS وLinux وiOS وAndroid.",

  "site.pillars.title": "كل ما يلزم للمخططات كنص في تطبيق مستقل واحد",
  "site.pillars.item1.title": "🤖 إنشاء ذكي (الذكاء الاصطناعي والمعالج)",
  "site.pillars.item1.text":
    "لا تريد كتابة الصياغة يدويًا؟ صِف بنيتك بنص عادي لمساعد الذكاء الاصطناعي أو أجب عن أسئلة المعالج خطوة بخطوة. احصل على رمز مخطط نظيف وصالح خلال ثوانٍ.",
  "site.pillars.item2.title": "⚡️ التحويل والتحرير (المحرر المباشر)",
  "site.pillars.item2.text":
    "محرر مناسب عبر الإنترنت بمعاينة فورية. حوّل PlantUML إلى Mermaid، وMermaid إلى GraphML، والعكس بنقرة واحدة. انسَ مشكلات التوافق بين Notion وGitHub وDraw.io.",
  "site.pillars.item3.title": "📲 PWA ووضع عدم الاتصال والتخزين",
  "site.pillars.item3.text":
    "ثبّت Code2Graph كتطبيق أصيل على حاسوبك المحمول أو جهازك اللوحي. يُحفظ عملك ومشاريعك محليًا وفي السحابة، فتصمّم البنية في الطائرة أو بلا اتصال.",

  "site.deepDive.title": "تحكم كامل في توثيق بنيتك",
  "site.deepDive.item1.title": "🔄 محوّل تنسيقات باتجاهين",
  "site.deepDive.item1.text":
    "انقل مخططات GraphML القديمة إلى معايير Mermaid أو PlantUML الحديثة دون فقدان الروابط أو العقد أو البنية المنطقية.",
  "site.deepDive.item2.title": "📝 محرر مباشر قوي",
  "site.deepDive.item2.text":
    "تمييز الصياغة، وتلميحات، وإكمال تلقائي. عرض فوري بلا تأخير.",
  "site.deepDive.item3.title": "☁️ التخزين والوصول المحلي",
  "site.deepDive.item3.text":
    "احفظ المخططات في مكتبة خاصة. تخزين PWA تلقائي للعمل الآمن دون اتصال.",
  "site.deepDive.item4.title": "📤 تصدير بنقرة واحدة",
  "site.deepDive.item4.text":
    "نزّل المخططات متجهة (SVG) أو نقطية (PNG). انسخ الرمز الجاهز إلى الحافظة لـ Markdown / Confluence.",

  "site.formats.title": "أداة واحدة لكل المعايير الرئيسة",
  "site.formats.colFormat": "التنسيق",
  "site.formats.colPurpose": "الغرض",
  "site.formats.colFeatures": "قدرات Code2Graph",
  "site.formats.plantuml.purpose": "مخططات UML المعقدة والتسلسل والأصناف والحالات",
  "site.formats.plantuml.features": "التحرير، والتوليد بالذكاء الاصطناعي، والتحويل إلى Mermaid/GraphML",
  "site.formats.plantuml.summary":
    "UML نصي للتسلسلات والأصناف والحالات وC4 وغيرها. يعرضه Code2Graph دون اتصال عبر @plantuml/core ومحرك تخطيط Smetana. تستخدم مخططات C4 وArchiMate مكتبات PlantUML القياسية المطابقة.",
  "site.formats.mermaid.purpose": "مخططات خفيفة لـ GitHub وNotion وObsidian وJira",
  "site.formats.mermaid.features": "معاينة مباشرة، وتوليد بالمعالج، وتصدير",
  "site.formats.mermaid.summary":
    "لغة مخططات مدمجة لـ Markdown وGitHub والملاحظات. يعرض المحرر Mermaid في المتصفح؛ ويمكن لوضع الإنترنت استخدام mermaid.ink أيضًا.",
  "site.formats.graphml.purpose": "رسوم الطوبولوجيا لـ yEd وDraw.io وأنظمة التصوير",
  "site.formats.graphml.features": "الاستيراد، والتصوير، والأمثلة، والتحويل إلى رمز",
  "site.formats.graphml.summary":
    "تنسيق XML للرسوم البيانية تستخدمه yEd وأدوات أخرى. يقرأ Code2Graph ملفات GraphML ويرتّب الرسم بـ dagre.",
  "site.formats.wiremark.purpose": "إطارات واجهة مرسومة باليد داخل Markdown",
  "site.formats.wiremark.features": "التحرير، والمعاينة المباشرة، وشاشات نموذجية",
  "site.formats.wiremark.summary":
    "إطارات سلكية نصية تبدو كرسم تخطيطي. تُرسم المعاينة في التطبيق عبر @wiremark/core.",
  "site.formats.d2.purpose": "مخططات حديثة: البنية والتسلسل والأصناف وSQL",
  "site.formats.d2.features": "التحرير، والمعاينة دون اتصال، وأمثلة للغة المختارة",
  "site.formats.d2.summary":
    "لغة مخططات حديثة للبنية والتسلسلات والأصناف وSQL. تُجمَّع المعاينة دون اتصال عبر @d2lang/d2.",
  "site.formats.structurizr.purpose": "بنية C4 كنص: السياق والحاويات والمكونات والنشر",
  "site.formats.structurizr.features": "التحرير، ومعاينة C4 دون اتصال، وأمثلة للغة المختارة",
  "site.formats.structurizr.summary":
    "بنية C4 كنص: المشهد والسياق والحاويات والمكونات والنشر. يُبقي المحرر على Structurizr DSL ويرسم العروض بـ PlantUML C4.",

  "site.audience.title": "يسرّع فريق الهندسة كله",
  "site.audience.architect.title": "🏛 معماريو البرمجيات",
  "site.audience.architect.item1": "ارسم نماذج C4 والمخططات المفاهيمية بسرعة بالذكاء الاصطناعي.",
  "site.audience.architect.item2": "اجمع توثيق الشركة كله على معيار واحد.",
  "site.audience.dev.title": "👨‍💻 المطوّرون وقادة الفرق",
  "site.audience.dev.item1": "أنشئ مخططات تسلسل أثناء تصميم المهام.",
  "site.audience.dev.item2": "عامل المخططات كنص، وخزّنها في Git، وحرّرها دون اتصال.",
  "site.audience.writer.title": "📝 الكتّاب التقنيون ومحللو الأعمال",
  "site.audience.writer.item1": "استخدم المعالج خطوة بخطوة لوصف عمليات الأعمال.",
  "site.audience.writer.item2":
    "حوّل المخططات بسهولة لمنصات مختلفة (Notion/Confluence).",

  "site.gettingStarted.title": "ابدأ خلال 10 ثوانٍ — بلا إعداد معقد",
  "site.gettingStarted.browser.title": "الخيار أ: في المتصفح",
  "site.gettingStarted.browser.text":
    "افتح Code2Graph.ru وابدأ إنشاء المخططات أو تحويلها فورًا.",
  "site.gettingStarted.pwa.title": "الخيار ب: كتطبيق PWA",
  "site.gettingStarted.pwa.text":
    "انقر تثبيت التطبيق في شريط عنوان المتصفح أو في الصفحة التعريفية. سيظهر Code2Graph على سطح المكتب أو الشاشة الرئيسية للهاتف.",

  "site.faq.title": "الأسئلة الشائعة",
  "site.faq.q1": "ما هو PWA وكيف يعمل وضع عدم الاتصال؟",
  "site.faq.a1":
    "يتيح تطبيق الويب التقدمي استخدام الموقع كبرنامج عادي على جهازك. بعد التحميل الأول يُخزَّن التطبيق محليًا فتتمكن من تحويل المخططات وتحريرها وعرضها بلا إنترنت.",
  "site.faq.q2": "هل يعمل التوليد بالذكاء الاصطناعي دون اتصال؟",
  "site.faq.a2":
    "يعمل التحرير اليدوي وتحويل التنسيقات والمعالج خطوة بخطوة والتخزين دون اتصال. طلبات الذكاء الاصطناعي تحتاج إلى اتصال بالشبكة.",
  "site.faq.q3": "هل يمكن تحويل مخططات PlantUML إلى Mermaid بلا فقدان للبيانات؟",
  "site.faq.a3":
    "نعم. يترجم المحوّل المدمج الصياغة والعقد للحفاظ على منطق المخطط الأصلي.",
  "site.faq.q4": "هل تخزين المخططات في Code2Graph آمن؟",
  "site.faq.a4":
    "بالتأكيد. تُحفظ المخططات محليًا في متصفحك / تطبيق PWA، ومع الحساب تُخزَّن بأمان في سحابتك الخاصة.",

  "site.finalCta.title": "أداتك المتكاملة للمخططات كنص",
  "site.finalCta.text":
    "ولّد بالذكاء الاصطناعي، وحرّر، وحوّل، وخزّن مخططات PlantUML وMermaid وGraphML في مكان واحد. متاح الآن على أي جهاز.",
  "site.finalCta.primary": "فتح Code2Graph",
  "site.finalCta.secondary": "📲 تثبيت PWA",

  "site.featureOffline": "يعمل دون اتصال وعبر file://",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "توليد المخططات وتحريرها بالذكاء الاصطناعي",
  "site.featureLibrary": "مكتبة مخططات سحابية",
  "site.featureLlmLocal": "تبقى مفاتيح نموذج اللغة التي تدخلها بنفسك في متصفحك",
  "site.loginTitle": "تسجيل الدخول",
  "site.loginSubtitle": "حساب شخصي ومكتبة سحابية",
  "site.registerTitle": "إنشاء حساب",
  "site.registerSubtitle": "إنشاء حساب على خادم Code2Graph",
  "site.accountTitle": "الحساب",
  "site.staticModeTitle": "الإصدار المحلي",
  "site.staticModeText":
    "يعمل هذا البناء بلا خادم أو قاعدة بيانات: تبقى المخططات في متصفحك. تسجيل الدخول والمكتبة السحابية متاحان في إصدار الخادم.",
  "site.username": "اسم المستخدم",
  "site.password": "كلمة المرور",
  "site.passwordConfirm": "تأكيد كلمة المرور",
  "site.rememberMe": "تذكّرني",
  "site.loginSubmit": "تسجيل الدخول",
  "site.registerSubmit": "إنشاء حساب",
  "site.logout": "تسجيل الخروج",
  "site.openEditor": "فتح المحرر",
  "site.backHome": "العودة إلى الرئيسية",
  "site.mcp.title": "MCP للوكلاء",
  "site.mcp.connected": "متصل",
  "site.mcp.disconnected": "غير متصل",
  "site.mcp.lead":
    "يصف الوكيل مخططًا بالكلمات. يختار Code2Graph اللغة ويعيد المصدر والصورة لـ PlantUML أو Mermaid أو GraphML أو WireMark أو D2 أو Structurizr.",
  "site.mcp.pointPlan": "يختار plan_diagram اللغة ونوع المخطط.",
  "site.mcp.pointGenerate": "يعيد generate_diagram مصدر المخطط وصورة.",
  "site.mcp.exampleCaption":
    "نتيجة generate_diagram هي مصدر يستطيع المحرر فتحه، بالإضافة إلى صورة معروضة للمخطط.",
  "site.mcp.exampleSource": "المصدر",
  "site.mcp.exampleImage": "الصورة",
  "site.mcp.pointLanguages": "اللغات الست نفسها كما في المحرر والمعالج.",
  "site.mcp.openPage": "كيفية الاتصال بـ MCP",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "يتيح خادم MCP لـ Cursor والوكلاء الآخرين أن يطلبوا مخططًا من Code2Graph. يختار لغة من الطلب ويعيد المصدر مع صورة المخطط.",
  "site.mcp.toolsTitle": "الأدوات",
  "site.mcp.toolList": "اللغات في الموقع وأنواع المخططات التي يقبلها كل منها.",
  "site.mcp.toolPlan": "اللغة والنوع لجملة، بلا مصدر.",
  "site.mcp.toolGenerate":
    "مصدر المخطط وصورة. مع CODE2GRAPH_API_URL يأتي المصدر من الخادم؛ وإلا يُبنى الهيكل نفسه محليًا. الصورة كتلة منفصلة: يرسم Kroki كلاً من PlantUML وD2 وStructurizr، ويرسم mermaid.ink مخططات Mermaid، ويُرسم GraphML وWireMark محليًا.",
  "site.mcp.connectTitle": "الاتصال في Cursor",
  "site.mcp.connectText":
    "شغّل البرنامج النصي من نسخة محلية لهذا المستودع. استبدل المسار بنسختك. اترك العنوان فارغًا للتوليد محليًا، أو وجّهه إلى إصدار الخادم.",
  "site.mcp.source": "حزمة MCP في المستودع",
  "site.mcp.apiTitle": "واجهة الخادم",
  "site.mcp.apiText":
    "يعرض إصدار الخادم هذه المسارات. إذا ضُبط AGENT_API_TOKEN، أرسل Authorization: Bearer بالقيمة نفسها التي في CODE2GRAPH_API_TOKEN.",
  "site.mcp.apiFormats": "اللغات والأنواع",
  "site.mcp.apiPlan": "اختيار لغة",
  "site.mcp.apiScaffold": "اللغة والنوع والمصدر",
  "site.mcp.staticNote":
    "GitHub Pages محرر ثابت ولا يقدّم /api/agent. تعمل الواجهة على إصدار الخادم، مثل www.code2graph.ru.",
  "site.mcp.catalogTitle": "فهرس الإمكانات",
  "site.mcp.catalogText":
    "فهرس الإمكانات على /llm/ في هذا المضيف نفسه. يقرأ MCP المحلي الصفحات نفسها من القرص ولا يتصل بخادم آخر من أجل الصياغة. الجواب هو مصدر الرسم للمحرر، بلا صورة وبلا عارض خارجي.",
  "site.mcp.toolCapabilities":
    "صفحة فهرس للغات، أو للغة واحدة إذا حُددت. متون البطاقات غير مضمّنة.",
  "site.mcp.toolSyntax":
    "صفحة صياغة واحدة بالكلمات المفتاحية أو بمسار من رابط سابق. الصفحات المرتبطة لا تُدمج.",
  "site.noAccount": "ليس لديك حساب؟",
  "site.hasAccount": "لديك حساب بالفعل؟",
  "site.role": "الدور",
  "site.loginError": "اسم المستخدم أو كلمة المرور غير صالحة",
  "site.registerError": "فشل التسجيل",
  "site.registerDisabled": "عطّل المسؤول التسجيل",
  "site.registerStatusError":
    "تعذر التحقق من حالة الخادم. تحقق من الاتصال وحاول مرة أخرى.",
  "site.registerMismatch": "كلمتا المرور غير متطابقتين",
  "site.registerRequired": "املأ كل الحقول",
  "site.welcomeUser": "تم تسجيل الدخول باسم {username}",
  "site.versionHint": "إصدار الموقع — قارنه بعد التحديث أو إعادة تحميل الصفحة",
  "site.footer.links": "روابط المشروع",
  "site.license.title": "الترخيص",
  "site.license.summary":
    "المصدر متاح بموجب Prosperity Public License 3.0.0. مجاني للاستخدام غير التجاري.",
  "site.license.commercial":
    "الاستخدام التجاري مجاني خلال تجربة مدتها 30 يومًا، وبعدها يلزم ترخيص مدفوع.",
  "site.license.read": "قراءة الترخيص",
  "site.license.commercialLink": "ترخيص تجاري",
  "site.landing.showcaseTitle": "شاهد، انقر، حرّر",
  "site.landing.showcaseHint": "كل صورة أدناه تُفتح في المحرر",
  "site.landing.tryScenario": "جرّب هذا السيناريو",
  "site.landing.openInEditor": "افتح في المحرر",
  "site.landing.allFormats": "٦ لغات — محرر واحد",
  "site.landing.privacyTitle": "خاص على جهازك",
  "site.landing.privacyLocal": "تُرسم المخططات في متصفحك",
  "site.landing.privacyKey": "مفتاح الذكاء الاصطناعي يبقى في متصفحك",
  "site.landing.privacyCloud": "السحابة مع الحساب فقط؛ والذكاء الاصطناعي يستخدم شبكة مزوّدك",
  "site.landing.platformTitle": "أينما تعمل",
  "site.landing.platformDevices": "Windows · macOS · Linux · iOS · Android",
  "site.landing.platformSame": "المتصفح أو التطبيق المثبّت — المحرر نفسه",
  "site.landing.platformOffline": "يعمل دون اتصال بعد أول تحميل",
  "site.landing.heroAlt": "يُكتب رمز المخطط ويُبنى المخطط مباشرة",
  "site.landing.converterAlt": "تحويل PlantUML إلى Mermaid بنقرة، والمخطط لا يتغير",
  "site.landing.mcpAlt": "طلب مخطط من وكيل ذكاء اصطناعي في Cursor والحصول عليه جاهزًا",
  "site.landing.audience.developers": "المطوّرون",
  "site.landing.audience.analysts": "المحلّلون",
  "site.landing.audience.managers": "المديرون",
  "site.landing.audience.students": "الطلاب",
  "site.landing.audience.vibecoders": "مبرمجو الفايب",
  "site.landing.usp.developers": "التسلسل وC4 أثناء المراجعة — المخطط كرمز، في Git وفي فرق الطلب",
  "site.landing.usp.analysts": "عملية بلا صياغة: المعالج يسأل والمخطط يجهز",
  "site.landing.usp.managers": "الخطة والحالة في صورة واحدة: Gantt والرسوم إلى العرض بنقرة",
  "site.landing.usp.students": "مخطط في دقيقة: قوالب وتلميحات وبلا تثبيت",
  "site.landing.usp.vibecoders": "الوكيل يرسم وأنت تحرّر: MCP يعطي Cursor المصدر والصورة",
  "site.ext.mermaid.type.powermap": "خريطة النفوذ",
  "site.ext.mermaid.desc.powermap": "خريطة نفوذ على شجرة تبعية: الدور والتأثير والحاجة إلى الفعل والموقف، مع نظير الشركة. صور أو صور ظلية، ومفتاح، وأسهم مسماة مثل supporter و enemy.",
  "site.ext.mermaid.syntax.powermap": "powermap يفتح الخريطة. company اسم الشركة، legend on|off المفتاح، avatar 48 أو avatar off مربع الصورة. الشخص id [الاسم|المنصب] مع role و influence و action و attitude و counterpart و gender و photo. -> و -.-> خطّا تبعية. link اسم color=#hex style=solid|dash|dot|dashdot يعرّف سهمًا، و A -اسم-> B يرسمه.",
  "site.ext.mermaid.type.histogram": "مدرج تكراري",
  "site.ext.mermaid.desc.histogram": "العدد أو الكثافة حسب الفترة، مع منحنى توزيع مُقدَّر أو مُعطى، والمتوسط والوسيط وفاصل الثقة.",
  "site.ext.mermaid.syntax.histogram": "histogram يفتح الرسم (الأسماء البديلة hist وdist). series الاسم : v1, v2, … عينة واحدة. الخلية الفارغة وna وn/a وnull وnone وnan و- و— و. قيمة ناقصة. bins auto أو bins N أو binwidth W أو bins a --> b, b --> c تحدد الفترات. scale count أو scale density يحدد الارتفاع. fit normal يقدّر المنحنى، وcurve weibull shape=1.6 scale=28 يرسم المعاملات المعطاة. stats تسرد mean median sd var ci، وci 0.95 فاصل المتوسط. labels وgap وcolors وmono وrotate 90 وfontsize وratio وgrid وaxis وline تعمل كما في series.",
} as const satisfies LocaleMessages;
