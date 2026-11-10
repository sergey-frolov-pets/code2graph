import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "أنواع الشاشات من أدلة WireMark: إطار واحد، وصدفة تطبيق، ونموذج، وقائمة إعدادات، وبطاقة، وتدفق، وإطار مشترك.",
  "site.wiremark.keywordsLead":
    "الكلمات المفتاحية من أدلة WireMark: جذر الإطار، والتخطيط، والنص، والمكونات، وقواعد السطر. قائمة المكونات الكاملة ومعرض الأيقونات في الوثائق.",
  "site.wiremark.docsComponents": "مرجع المكونات",
  "site.wiremark.docsIcons": "معرض الأيقونات",

  "site.wiremark.type.login.title": "شاشة تسجيل الدخول",
  "site.wiremark.type.login.text":
    "إطار هاتف. علامات تبويب، وحقول بأيقونات، وتنبيه معلومات، وزر ممتلئ بعرض الإطار يفتح إطارًا آخر عبر to=#id.",
  "site.wiremark.type.dashboard.title": "صدفة التطبيق",
  "site.wiremark.type.dashboard.text":
    "إطار أفقي: شريط قوائم، وشريط تطبيق كثيف، ودرج مثبت، وبطاقات مخططات، وجدول بشريط تمرير.",
  "site.wiremark.type.form.title": "نموذج",
  "site.wiremark.type.form.text":
    "إطار طويل. خطوات، وحقول مطلوبة، وvalue=، ومنطقة متعددة الأسطر، وقائمة اختيار، ومنزلق، وتقييم، وتقويم، ومربع اتفاق.",
  "site.wiremark.type.settings.title": "قائمة الإعدادات",
  "site.wiremark.type.settings.text":
    "شريط تطبيق، وتنبيه خطأ، وقائمة صفوف بـ to=#id، ولوحة مطوية، وتنقل سفلي، وحوار تأكيد.",
  "site.wiremark.type.product.title": "بطاقة منتج",
  "site.wiremark.type.product.text":
    "بطاقة عريضة. يستخدم Img النسبة ratio=16:9، ثم شارات، وخريطة، وجدول مواصفات، وCardActions مع مجموعة أزرار.",
  "site.wiremark.type.flow.title": "تدفق الشاشات",
  "site.wiremark.type.flow.text":
    "يربط Flow LR شاشتين. تُسحب صدفة مخفية (visible=false) عبر background=#id، ويجلس المحتوى في Anchor #content. يعلن Icons عن علامة مخصصة.",
  "site.wiremark.type.chrome.title": "الإطار المشترك",
  "site.wiremark.type.chrome.text":
    "الصدفة ذات visible=false لا تُرسم وحدها. تسحبها الإطارات الأخرى عبر background=#id وتضع محتواها في منطقة Anchor عبر anchor=#id.",

  "site.wiremark.group.frame": "الإطار والتدفق",
  "site.wiremark.group.layout": "التخطيط",
  "site.wiremark.group.text": "النص والحشو",
  "site.wiremark.group.ui": "مكونات الشاشة",
  "site.wiremark.group.syntax": "الصياغة",

  "site.wiremark.keyword.wireframe":
    "جذر الشاشة. كل ما يُزاح تحته يكون على تلك الشاشة. أضف #id كي تستطيع الإطارات الأخرى الربط إلى هنا، مع إعداد حجم جاهز أو كل من w= وh=.",
  "site.wiremark.keyword.frameId":
    "يسمّي إطارًا على Wireframe، أو منطقة على Anchor. يطابق to= وbackground=#id الإطارات فقط. يطابق anchor= المناطق فقط.",
  "site.wiremark.keyword.mobile": "إعداد حجم بعرض الهاتف على جذر Wireframe.",
  "site.wiremark.keyword.landscape":
    "إعداد حجم عريض. استخدمه لصدفة تطبيق أو لوحة معلومات.",
  "site.wiremark.keyword.portrait": "إعداد حجم طويل على جذر Wireframe.",
  "site.wiremark.keyword.frameSize":
    "حجم إطار مخصص. على جذر Wireframe اضبط w= وh= معًا. عطّل الإعداد الجاهز عندما يحدّد anchor= حجم الإطار.",
  "site.wiremark.keyword.visible":
    "يخفي visible=false الإطار من مخطط التدفق ويبقى صالحًا هدفًا لـ background=. الافتراضي هو الإظهار.",
  "site.wiremark.keyword.frameBackground":
    "على Wireframe يرسم background=#id إطارًا آخر تحته. على عنصر عادي يكون background= تظليلًا: hatch أو crosshatch أو none.",
  "site.wiremark.keyword.anchor":
    "منطقة غير مرئية داخل صدفة. بلا حجم تملأ المساحة المتبقية. امنحها #id كي يستهدفها إطار أمامي.",
  "site.wiremark.keyword.anchorAt":
    "يضع إطارًا أماميًا داخل منطقة من خلفيته. الاسم البديل هو at=. لا تضف إعدادًا جاهزًا أو w=/h= على ذلك الإطار. المرساة هي التي تُعتمد.",
  "site.wiremark.keyword.flow":
    "توجيه في المستوى الأعلى، لا داخل إطار. Flow TD من الأعلى إلى الأسفل وهو الافتراضي. Flow LR يسير من اليسار إلى اليمين.",
  "site.wiremark.keyword.to":
    "على أي عنصر، يربط to=#id ذلك العنصر بإطار. يُبنى رسم التنقل من هذه الروابط. الاسم البديل هو href=. الأهداف إطارات فقط.",
  "site.wiremark.keyword.stack":
    "يرصّ الأبناء على محور واحد. الاتجاه الافتراضي هو column. يضبط gap= (اسم بديل لـ spacing=) الفراغ بينها. لا يرسم Stack المجرد شيئًا من نفسه.",
  "site.wiremark.keyword.column":
    "اتجاه Stack بلا مفتاح. يتراكم الأبناء من الأعلى إلى الأسفل. يقلب column-reverse هذا الترتيب.",
  "site.wiremark.keyword.row":
    "اتجاه Stack بلا مفتاح. يسير الأبناء من اليسار إلى اليمين. يقلب row-reverse هذا الترتيب.",
  "site.wiremark.keyword.gap":
    "اسم بديل لـ spacing=. الفراغ بين الأبناء بوحدات التباعد. اكتب gap=2. الرقم بين علامتي اقتباس خطأ.",
  "site.wiremark.keyword.box":
    "حاوية عامة. الرموز بلا مفتاح هي العرض ثم الارتفاع: Box 240px *. يرسم outline (solid أو dashed أو dotted) وelevation= لوحة ظاهرة.",
  "site.wiremark.keyword.grid":
    "شبكة منتظمة. تتدفق الأبناء إلى الخلايا. يضبط cols= عدد الأعمدة، وgap= التباعد.",
  "site.wiremark.keyword.cols": "عدد الأعمدة في Grid. بمفتاح فقط: cols=3.",
  "site.wiremark.keyword.spacer":
    "فراغ مرن يدفع إخوته بعيدًا على طول الرصّ.",
  "site.wiremark.keyword.divider":
    "خط أفقي بلا خصائص. على Stack يرسم العلم المجرد divider خطًا في كل فراغ.",
  "site.wiremark.keyword.sizing":
    "حجم موضعي: العرض ثم الارتفاع. 240px بالبكسل، و30% حصة من المساحة الحرة، و* يملأ ذلك المحور، والرقم المجرد وزن مرن. يُرفض width= بمفتاح.",
  "site.wiremark.keyword.typography":
    "ورقة نص. السلسلة بين علامتي اقتباس هي الكلمات على الشاشة. بلا نص يرسم Typography المجرد سطرًا واحدًا من الحشو.",
  "site.wiremark.keyword.typeVariant":
    "دور نص بلا مفتاح: h1–h6 وsubtitle1 وsubtitle2 وbody1 (الافتراضي) وbody2 وcaption وoverline وbutton. العناوين h1–h6 عريضة. caption باهت.",
  "site.wiremark.keyword.textField":
    "حقل نص. السلسلة بين علامتي اقتباس هي التسمية. الأشكال هي outlined (الافتراضي) وfilled وstandard.",
  "site.wiremark.keyword.fillerAmount":
    "مقدار نص العنصر النائب عندما لا توجد تسمية حقيقية. ~3 نحو ثلاثة أسطر، و~5w نحو خمس كلمات، و~2l نحو سطرين. _ و__ و___ قصيرة ومتوسطة وطويلة.",
  "site.wiremark.keyword.fillerStyle":
    "مظهر نص العنصر النائب: squiggle (الافتراضي) أو lorem أو blocks. اضبطه على جذر Wireframe أو على عنصر نص واحد. لا يغيّر الألوان.",
  "site.wiremark.keyword.required":
    "علم منطقي. على TextField يضيف * بعد التسمية.",
  "site.wiremark.keyword.value":
    "نص بمفتاح داخل حقل. السلسلة المجردة بين علامتي اقتباس هي التسمية، لذا يجب أن يكون المحتوى value=\"...\".",
  "site.wiremark.keyword.multiline":
    "علم منطقي. يكبّر TextField إلى منطقة نص. يضبط rows=4 الارتفاع. بلا rows يكون الحقل المتعدد الأسطر بارتفاع 3 صفوف.",
  "site.wiremark.keyword.noWrap":
    "علم منطقي على Typography. يبقى السطر واحدًا وينتهي الفائض بنقاط حذف.",
  "site.wiremark.keyword.button":
    "إجراء. السلسلة بين علامتي اقتباس هي التسمية. يُقرأ Button المجرد على أنه Button. الأشكال هي text (الافتراضي) وoutlined وcontained.",
  "site.wiremark.keyword.contained":
    "شكل Button بلا مفتاح: تظليل ممتلئ، وهو الإجراء الأساسي. لا توجد كلمة primary.",
  "site.wiremark.keyword.outlined":
    "شكل بلا مفتاح. على Button هو حد بلا تعبئة. على TextField يكون outlined الشكل الافتراضي.",
  "site.wiremark.keyword.link":
    "رابط نصي ضمن السطر. السلسلة بين علامتي اقتباس هي التسمية. ينتقل to=#id إلى إطار.",
  "site.wiremark.keyword.list":
    "رصّ رأسي من صفوف ListItem. يضيّق dense الصفوف. يضيف subheader= عنوانًا صغيرًا.",
  "site.wiremark.keyword.listItem":
    "صف واحد. السلسلة بين علامتي اقتباس هي التسمية. يجعل to=#id الصف رابطًا. لا يقبل ListItem أبناء.",
  "site.wiremark.keyword.appBar":
    "الشريط عبر أعلى الشاشة. عادةً يغلّف Toolbar.",
  "site.wiremark.keyword.toolbar":
    "صف أفقي داخل AppBar: العنوان والأيقونات والإجراءات.",
  "site.wiremark.keyword.icon":
    "رمز Material واحد. Icon Search وIcon \"Search\" الاسم نفسه. الاسم غير المعروف يرسم عنصرًا نائبًا ويحذّر. fontSize= أو size= يكون small أو medium أو large.",
  "site.wiremark.keyword.startIcon":
    "اسم أيقونة بمفتاح يُرسم قبل التسمية: startIcon=Email. يرسم endIcon= بعد التسمية. لا تضع اسم الخاصية بين علامتي اقتباس.",
  "site.wiremark.keyword.iconsBlock":
    "كتلة Icons في المستوى الأعلى، بجانب الإطارات لا داخل أحدها. كل مدخل اسم مع بيانات مسار SVG. أيقونة المستند تستبدل أيقونة مدمجة بالاسم نفسه.",
  "site.wiremark.keyword.card":
    "سطح. الأبناء بلا CardContent هي المتن. يجعل to=#id البطاقة كلها رابطًا.",
  "site.wiremark.keyword.cardContent":
    "منطقة النص في Card عندما ينفصل الترويسة والوسائط والإجراءات.",
  "site.wiremark.keyword.cardActions": "صف الأزرار أسفل Card.",
  "site.wiremark.keyword.img":
    "عنصر نائب متقاطع لصورة. يضبط ratio=16:9 النسبة. src= بيانات وصفية. ما يزال الرسم يُظهر العنصر النائب.",
  "site.wiremark.keyword.control":
    "مربع اختيار أو زر راديو أو مفتاح. Control checkbox هو الافتراضي. يفعّله checked. يختار Control radio وControl switch الرمزين الآخرين.",
  "site.wiremark.keyword.indent":
    "الإزاحة هي الاحتواء. مسافتان لكل مستوى، والمسافات فقط. السطر الأعمق ابن. علامة الجدولة خطأ.",
  "site.wiremark.keyword.quotes":
    "السلسلة بين علامتي اقتباس نص يُرسم، وعلامتا الاقتباس لازمتان. الكلمة المجردة إعداد: تعداد أو علم أو رقم أو حجم أو اسم أيقونة. لا تضع تعدادًا أو رقمًا بين علامتي اقتباس أبدًا.",
  "site.wiremark.keyword.keyed":
    "يضبط key=value خاصية مسماة. القيمة بلا مفتاح تُترك بلا مفتاح وتُختار حسب نوعها. الترتيب حر، إلا العرض ثم الارتفاع للحجم.",
  "site.wiremark.keyword.comment":
    "تمتد تعليقات // إلى نهاية السطر. تبدأ # مرساة، فهي ليست تعليقًا.",
} as const satisfies LocaleMessages;
