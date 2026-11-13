import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "لصق جدول من الحافظة",
  "editor.pasteTableHistory": "لصق جدول",
  "tablePaste.modalTitle": "يتعذر لصق الجدول من الحافظة",
  "tablePaste.reasonLabel": "ما الذي حدث",
  "tablePaste.expectedLabel": "تنسيق الجدول المتوقع ({type})",
  "tablePaste.columnsLabel": "الأعمدة:",
  "tablePaste.rulesLabel": "قواعد التحويل:",
  "tablePaste.sampleLabel": "جدول نموذجي للنسخ (Excel / Google Sheets / TSV):",
  "tablePaste.error.emptyClipboard":
    "الحافظة فارغة. انسخ نطاق خلايا من Excel أو Google Sheets، أو جدولًا مفصولًا بعلامات جدولة أو فواصل منقوطة.",
  "tablePaste.error.clipboardReadFailed":
    "تعذرت القراءة من الحافظة. امنح إذن الحافظة في المتصفح ثم أعد المحاولة.",
  "tablePaste.error.notATable":
    "محتوى الحافظة ليس جدولًا (المتوقع عمودان على الأقل مفصولان بعلامات جدولة أو ';' أو '|').",
  "tablePaste.error.tooManyColumns":
    "أعمدة أكثر من اللازم: وُجد {actual} في الحافظة، بينما يتوقع هذا المخطط {expected}.",
  "tablePaste.error.tooFewColumns":
    "أعمدة أقل من اللازم: وُجد {actual} في الحافظة، بينما يتوقع هذا المخطط {expected}.",
  "tablePaste.error.tooFewColumnsMin":
    "أعمدة أقل من اللازم: وُجد {actual} في الحافظة، والمطلوب {min} على الأقل.",
  "tablePaste.error.tooFewRowsMin":
    "صفوف أقل من اللازم: وُجد {actual} في الحافظة، والمطلوب {min} صفوف على الأقل.",
  "tablePaste.error.expectedColumnRange":
    "عدد أعمدة غير صالح: وُجد {actual} في الحافظة، والمتوقع بين {min} و{max} عمودًا.",
  "tablePaste.error.waterfallColumns":
    "المتوقع عمودان: أحدهما لتسميات نصية والآخر لأرقام (أو خلايا فارغة لإجماليات '=').",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "يجب أن يحتوي صف البيانات الأول (الصف {row}) على قيمة رقمية ابتدائية ('=رقم')، لا على خلية فارغة.",
  "tablePaste.error.noNumericColumn":
    "لا يحتوي أي عمود على قيم رقمية.",
  "tablePaste.error.invalidNumberAtRow":
    "الصف {row}: القيمة \"{value}\" ليست رقمًا صالحًا.",
  "tablePaste.error.negativeNotAllowedAtRow":
    "الصف {row}: القيمة السالبة \"{value}\" غير مسموحة في المخطط الدائري.",
  "tablePaste.error.noDataRows":
    "الجدول المنسوخ لا يحتوي على صفوف بيانات.",
  "tablePaste.type.waterfall": "شلالي",
  "tablePaste.type.pie": "مخطط دائري",
  "tablePaste.type.heatmap": "خريطة حرارية",
  "tablePaste.type.bubble": "مخطط فقاعي",
  "tablePaste.type.ev": "القيمة المكتسبة (EV)",
  "tablePaste.type.boxplot": "مخطط صندوقي",
  "tablePaste.type.treemap": "خريطة شجرية",
  "tablePaste.type.radar": "مخطط راداري",
  "tablePaste.type.voronoi": "مخطط فورونوي",
  "tablePaste.type.clustered": "مخطط سلاسل",
  "tablePaste.type.xychart": "مخطط XY (أعمدة / خط)",
  "tablePaste.type.quadrant": "مخطط الأرباع",
  "tablePaste.type.sankey": "مخطط سانكي",
  "tablePaste.type.orgchart": "مخطط تنظيمي",
  "tablePaste.type.gantt": "مخطط غانت",
  "tablePaste.type.timeline": "خط زمني",
  "tablePaste.type.journey": "رحلة المستخدم",
  "tablePaste.type.packet": "ترويسة الحزمة",
  "tablePaste.type.wbs": "هيكل تقسيم العمل (WBS)",
  "tablePaste.type.mindmap": "خريطة ذهنية",
  "tablePaste.type.nwdiag": "مخطط شبكة (Nwdiag)",
  "tablePaste.type.wireframe": "جدول WireMark",
  "tablePaste.expected.waterfall.columns":
    "عمودان بأي ترتيب: «التسمية» و«القيمة» (أو «القيمة» ثم «التسمية»).",
  "tablePaste.expected.waterfall.rules":
    "يصبح الرقم الأول شريط البداية (=N)، والأرقام الموجبة زيادات (+N)، والأرقام السالبة نقصانًا (-N)، والخلية الفارغة (أو '=') إجماليًا جاريًا (= : التسمية).",
  "tablePaste.expected.waterfall.headers": "التسمية|القيمة",
  "tablePaste.expected.pie.columns":
    "عمودان بأي ترتيب: «الفئة» و«رقم غير سالب».",
  "tablePaste.expected.pie.rules":
    "يصبح كل صف شريحة: \"الفئة\" : القيمة.",
  "tablePaste.expected.pie.headers": "الفئة|الحصة",
  "tablePaste.expected.heatmap.columns":
    "مصفوفة 2×2 على الأقل: الصف الأول عناوين أعمدة X، والعمود الأول تسميات صفوف Y، والخلايا الداخلية أرقام (أو خلايا فارغة).",
  "tablePaste.expected.heatmap.rules":
    "يُدرَج سطرا x وy قبل كتلة المقياس. إذا غاب المقياس يُضاف مقياس من القيمة الدنيا إلى القصوى، من الأزرق إلى الأحمر. الخلايا الفارغة تصبح مواضع null.",
  "tablePaste.expected.heatmap.headers": "الفترة|الإثنين|الثلاثاء|الأربعاء",
  "tablePaste.expected.bubble.columns":
    "4 أو 5 أعمدة: «التسمية»، «X (رقم)»، «Y (رقم)»، «الحجم (رقم)»، [«المجموعة (اختياري)»].",
  "tablePaste.expected.bubble.rules":
    "يصبح كل صف نقطة فقاعة: التسمية : x=...، y=...، size=...، group=...",
  "tablePaste.expected.bubble.headers": "المنتج|X|Y|الحجم|المجموعة",
  "tablePaste.expected.ev.columns":
    "4 أعمدة: «الفترة (أيام)»، «PV (المخططة)»، «EV (المكتسبة)»، «AC (الفعلية)» (أو 4 صفوف: days وpv وev وac).",
  "tablePaste.expected.ev.rules":
    "يولّد سلاسل days وpv وev وac لمخطط القيمة المكتسبة.",
  "tablePaste.expected.ev.headers": "الفترة|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 أعمدة («الفئة»، «الأدنى»، «Q1»، «الوسيط»، «Q3»، «الأقصى») أو 4 أعمدة فأكثر من المشاهدات الخام («الفئة»، «العينة 1»، «العينة 2»، «العينة 3»...).",
  "tablePaste.expected.boxplot.rules":
    "يولّد min=... وq1=... وmedian=... وq3=... وmax=... لملخصات الأعداد الخمسة، أو values=... لمشاهدات العينات الخام.",
  "tablePaste.expected.boxplot.headers": "الفئة|الأدنى|Q1|الوسيط|Q3|الأقصى",
  "tablePaste.expected.treemap.columns":
    "من 2 إلى 4 أعمدة: «العنصر | الوزن» أو «المجموعة | العنصر | الوزن [| اللون]».",
  "tablePaste.expected.treemap.rules":
    "يولّد كتلًا هرمية «المجموعة / العنصر : الوزن» (يجب أن يكون الوزن > 0).",
  "tablePaste.expected.treemap.headers": "المجموعة|العنصر|الوزن",
  "tablePaste.expected.radar.columns":
    "مصفوفة من 4 أعمدة على الأقل: الصف الأول أسماء المحاور (3 محاور على الأقل)، والعمود الأول أسماء السلاسل، والخلايا الداخلية أرقام.",
  "tablePaste.expected.radar.rules":
    "يولّد توجيه axes من صف العناوين وصفوف «series الاسم : v1, v2, ...».",
  "tablePaste.expected.radar.headers": "السلسلة|السرعة|الموثوقية|سهولة الاستخدام|الأمان",
  "tablePaste.expected.voronoi.columns":
    "من 3 إلى 5 أعمدة: «الموقع»، «X (رقم)»، «Y (رقم)»، [«المجموعة»]، [«اللون»].",
  "tablePaste.expected.voronoi.rules":
    "يصبح كل صف موقع فورونوي: الموقع : x=...، y=...، group=...",
  "tablePaste.expected.voronoi.headers": "الموقع|X|Y|المجموعة",
  "tablePaste.expected.clustered.columns":
    "مصفوفة 2×2 على الأقل: العمود الأول للفئات، والصف الأول لأسماء السلاسل (أو منقولًا عندما يبدأ العنوان بـ «Series»).",
  "tablePaste.expected.clustered.rules":
    "يولّد سطور categories وseries مع الإبقاء على توجيهات rotate 90 وinvert y وcolor.",
  "tablePaste.expected.clustered.headers": "الفئة|الشمال|الجنوب|التصدير",
  "tablePaste.expected.xychart.columns":
    "عمود واحد أو أكثر. العمود الواحد أرقام لـ bar [قيمة 1، ...، قيمة n]. العمودان هما «فئة X» و«قيمة العمود». ثلاثة أعمدة أو أكثر هي «فئة X» بالإضافة إلى سلسلة أعمدة لكل عمود إضافي.",
  "tablePaste.expected.xychart.rules":
    "العمود الواحد يستبدل أسطر bar [values] الموجودة. العمودان أو أكثر يستبدلان محور x وكل أسطر bar، مع سلسلة bar [...] واحدة لكل عمود قيم. إذا لم يكن للمخطط محور y بعد، يُضاف y-axis \"\" min --> max.",
  "tablePaste.expected.xychart.headers": "الشهر|الخطة|الفعلي|التوقع",
  "tablePaste.expected.quadrant.columns":
    "3 أعمدة: «تسمية النقطة»، «X (0..1 أو 0..100%)»، «Y (0..1 أو 0..100%)».",
  "tablePaste.expected.quadrant.rules":
    "الإحداثيات الأكبر من 1 تُطبَّع تلقائيًا من النسب المئوية (0..100) إلى [0..1].",
  "tablePaste.expected.quadrant.headers": "العنصر|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 أعمدة: «المصدر»، «الهدف»، «قيمة التدفق (رقم)».",
  "tablePaste.expected.sankey.rules":
    "يصبح كل صف سطر تدفق: المصدر،الهدف،القيمة.",
  "tablePaste.expected.sankey.headers": "المصدر|الهدف|التدفق",
  "tablePaste.expected.orgchart.columns":
    "عمودان أو 3: «المدير»، «المرؤوس المباشر»، [«نمط الحافة (منقط) أو المسمى الوظيفي»].",
  "tablePaste.expected.orgchart.rules":
    "يولّد عقد المخطط التنظيمي وخطوط التبعية المتصلة (->) أو المنقطة (-.->).",
  "tablePaste.expected.orgchart.headers": "المدير|المرؤوس|الرابط",
  "tablePaste.expected.gantt.columns":
    "من 2 إلى 4 أعمدة: «المهمة»، «تاريخ البدء أو المدة»، [«المدة (5d)»]، [«القسم»].",
  "tablePaste.expected.gantt.rules":
    "يولّد صفوف مهام غانت (مجمّعة حسب القسم في Mermaid).",
  "tablePaste.expected.gantt.headers": "المهمة|البداية|المدة|القسم",
  "tablePaste.expected.timeline.columns":
    "عمودان أو 3: «الفترة / التاريخ»، «الحدث»، [«القسم (اختياري)»].",
  "tablePaste.expected.timeline.rules":
    "يصبح كل صف مدخل خط زمني «الفترة : الحدث».",
  "tablePaste.expected.timeline.headers": "الفترة|الحدث|القسم",
  "tablePaste.expected.journey.columns":
    "من 2 إلى 4 أعمدة: «الخطوة»، «الدرجة (1–5)»، [«الممثلون»]، [«القسم»].",
  "tablePaste.expected.journey.rules":
    "يولّد خطوات رحلة المستخدم «الخطوة: الدرجة: الممثلون».",
  "tablePaste.expected.journey.headers": "الخطوة|الدرجة|الممثلون|القسم",
  "tablePaste.expected.packet.columns":
    "عمودان بأي ترتيب: «نطاق البتات (0-15) أو طول البتات (16)» و«اسم الحقل».",
  "tablePaste.expected.packet.rules":
    "يولّد حقول الحزمة «0-15: \"الحقل\"» (تُجمَّع أطوال البتات تلقائيًا في نطاقات).",
  "tablePaste.expected.packet.headers": "البتات|الحقل",
  "tablePaste.expected.wbs.columns":
    "عمودان أو أكثر تمثل مستويات التسلسل: «المستوى 1 (الجذر)»، «المستوى 2»، «المستوى 3»، وهكذا.",
  "tablePaste.expected.wbs.rules":
    "يبني شجرة WBS (* و** و***)، ويجمّع الخلايا الأب المتطابقة تلقائيًا.",
  "tablePaste.expected.wbs.headers": "المستوى 1|المستوى 2|المستوى 3",
  "tablePaste.expected.mindmap.columns":
    "عمودان أو أكثر تمثل عمق الشجرة: «الجذر»، «الفرع»، «الفرع الفرعي»، وهكذا.",
  "tablePaste.expected.mindmap.rules":
    "يبني شجرة خريطة ذهنية ويدمج الآباء المتطابقة. العقد الملصقة تستبدل كل عقد الخريطة. يُبقى على وسيلة الإيضاح والعنوان والترويسة والتذييل والتعليق والنمط والتعليقات.",
  "tablePaste.expected.mindmap.headers": "الجذر|الفرع|الورقة",
  "tablePaste.expected.nwdiag.columns":
    "عمودان أو 3: «العقدة»، «عنوان IP»، [«الشبكة (اختياري)»].",
  "tablePaste.expected.nwdiag.rules":
    "يجمّع العقد حسب الشبكة في كتل network { node [address = \"...\"] }.",
  "tablePaste.expected.nwdiag.headers": "العقدة|عنوان IP|الشبكة",
  "tablePaste.expected.wireframe.columns":
    "أي جدول من عمودين على الأقل (الصف الأول عنوان، وبقية الصفوف جسم الجدول).",
  "tablePaste.expected.wireframe.rules":
    "يولّد مكون جدول WireMark مع TableHead وTableBody (الأعمدة الرقمية تُحاذى إلى اليمين).",
  "tablePaste.expected.wireframe.headers": "الاسم|المؤلف|الحالة|المشاهدات",
  "tablePaste.type.powermap": "خريطة النفوذ",
  "tablePaste.expected.powermap.columns": "الاسم والمنصب والمدير والدور والتأثير والفعل والموقف والنظير والعلاقة (solid أو dotted أو اسم).",
  "tablePaste.expected.powermap.rules": "كل صف شخص. solid و dotted تبعية. أي اسم آخر سهم تأثير.",
  "tablePaste.expected.powermap.headers": "الاسم|المنصب|المدير|الدور|التأثير|الفعل|الموقف|النظير|العلاقة",
  "tablePaste.type.histogram": "مدرج تكراري",
  "tablePaste.expected.histogram.columns": "عمود لكل سلسلة. الصف الأول قد يسمي السلاسل. تبقى الخلايا كما هي، بما فيها الفارغة وna والرموز الخاطئة.",
  "tablePaste.expected.histogram.rules": "كل عمود يصبح series الاسم : v1, v2, …. تبقى الخلايا الفارغة وغير الرقمية حتى تعالجها missing وerrors وoutliers.",
  "tablePaste.expected.histogram.headers": "الصباح|المساء",
} as const satisfies LocaleMessages;
