import type { LocaleMessages } from "../types";

export const siteMessages = {
  "site.tagline": "कोड के रूप में आरेख स्टूडियो",
  "site.nav.features": "सुविधाएँ",
  "site.nav.converter": "कनवर्टर और AI",
  "site.nav.pwa": "PWA / ऑफ़लाइन",
  "site.nav.formats": "प्रारूप",
  "site.nav.faq": "प्रश्नोत्तर",
  "site.nav.mcp": "MCP",
  "site.nav.github": "GitHub",
  "site.nav.discussions": "चर्चाएँ",
  "site.hero.askQuestion": "💬 प्रश्न पूछें",
  "site.github.star": "स्टार",
  "site.github.starLabel": "GitHub पर code2graph को स्टार दें",
  "site.hero.viewOnGithub": "GitHub पर देखें",

  "site.landingTitle": "Code2Graph",
  "site.landingSubtitle":
    "PlantUML, Mermaid, GraphML, WireMark, D2 और Structurizr के लिए PWA स्टूडियो। एजेंटों के लिए MCP आरेख स्रोत और एक छवि लौटाता है।",
  "site.landingCtaApp": "संपादक खोलें",
  "site.landingCtaInstallPwa": "📲 PWA इंस्टॉल करें",
  "site.landingCtaRegister": "साइन अप",
  "site.landingCtaLogin": "साइन इन",
  "site.landingCtaTryFree": "मुफ़्त आज़माएँ",
  "site.landingCtaDemo": "डेमो",

  "site.hero.title": "ब्राउज़र में पाठ आरेख",
  "site.hero.subtitle":
    "आरेख लिखें और तुरंत देखें। PlantUML, Mermaid, GraphML, WireMark, D2 और Structurizr — ऑफ़लाइन भी। MCP एजेंट को स्रोत और एक छवि देता है।",
  "site.offlineNote": "संपादन और पूर्वावलोकन बिना नेटवर्क के काम करते हैं।",
  "site.languages.title": "भाषाएँ",
  "site.language.sites": "साइटें",
  "site.language.libraries": "ऐप में उपयोग की गई लाइब्रेरी",
  "site.language.types": "मुख्य आरेख प्रकार",
  "site.language.diagramTypes": "आरेख प्रकार",
  "site.language.keywords": "कीवर्ड",
  "site.language.example": "उदाहरण",
  "site.language.syntax": "सिंटैक्स",
  "site.language.preview": "यह कैसा दिखता है: {title}",
  "site.language.previewFailed": "नमूना नहीं बन सका",
  "site.primer.graphml.type.directed.title": "दिशात्मक ग्राफ़",
  "site.primer.graphml.type.directed.summary":
    "किनारे स्रोत से लक्ष्य की ओर जाते हैं। Code2Graph GraphML को डिफ़ॉल्ट रूप से ऐसे ही बनाता है।",
  "site.primer.graphml.type.undirected.title": "अदिशात्मक ग्राफ़",
  "site.primer.graphml.type.undirected.summary":
    "किनारे केवल नोड जोड़ते हैं, बिना दिशा के।",
  "site.primer.wiremark.type.flow.title": "जुड़ी स्क्रीन",
  "site.primer.wiremark.type.flow.summary":
    "एक फ़ाइल में कई वायरफ़्रेम, उनके बीच to=#anchor छलांग के साथ।",
  "site.primer.plantuml.kw.startuml":
    "@startuml और @enduml आरेख खोलते और बंद करते हैं।",
  "site.primer.plantuml.kw.participant":
    "एक नामित जीवनरेखा। as उसे छोटा उपनाम देता है।",
  "site.primer.plantuml.kw.arrow": "एक संदेश: प्रतिभागी की ओर ->, उत्तर के लिए -->।",
  "site.primer.plantuml.kw.alt":
    "परस्पर अनन्य शाखाएँ। else दूसरी शाखा है, end ब्लॉक बंद करता है।",
  "site.primer.plantuml.kw.note": "प्रतिभागियों के बाएँ, दाएँ या ऊपर एक नोट।",
  "site.primer.plantuml.kw.if":
    "गतिविधि निर्णय: then और else, endif से बंद।",
  "site.primer.plantuml.kw.skinparam":
    "साझा शैली सेटिंग, जैसे पृष्ठभूमि रंग।",
  "site.primer.plantuml.syntax.sequence":
    "actor और participant जीवनरेखा का नाम देते हैं, as छोटा उपनाम है। संदेश -> है, उत्तर --> है, और लेबल कोलन के बाद आता है।",
  "site.primer.plantuml.syntax.class":
    "class एक वर्ग खोलता है; फ़ील्ड और मेथड धनुकोष्ठक के अंदर होते हैं। कड़ी --> है, गुणक उद्धरणों में।",
  "site.primer.plantuml.syntax.activity":
    "start और stop छोर हैं। चरण :text; है। निर्णय if () then (), else और endif है।",
  "site.primer.plantuml.syntax.state":
    "[*] आरंभ और समाप्ति है। संक्रमण --> है, और घटना लेबल कोलन के बाद आता है।",
  "site.primer.plantuml.syntax.usecase":
    "actor और usecase ऐक्टर और मामला घोषित करते हैं। कड़ी --> है, दिशा left to right direction है।",
  "site.primer.plantuml.syntax.c4_context":
    "Person(), System() और Rel() लोगों, सिस्टम और कड़ी का वर्णन करते हैं। लाइब्रेरी !include से आती है।",
  "site.primer.mermaid.kw.participant":
    "अनुक्रम प्रतिभागी। as दृश्य लेबल बदलता है।",
  "site.primer.mermaid.kw.arrow":
    "एक संदेश: ->> ठोस तीर है, -->> बिंदुयुक्त उत्तर है।",
  "site.primer.mermaid.kw.alt":
    "अनुक्रम शाखाएँ। else दूसरी शाखा है, end ब्लॉक बंद करता है।",
  "site.primer.mermaid.kw.note": "प्रतिभागी के दाएँ एक नोट, या कई के ऊपर।",
  "site.primer.mermaid.kw.subgraph": "फ़्लोचार्ट नोडों का समूह। इसे end से बंद करें।",
  "site.primer.mermaid.kw.class": "classDiagram के अंदर फ़ील्ड और मेथड वाला वर्ग।",
  "site.primer.mermaid.kw.section": "गैंट चार्ट पर कार्यों का समूह।",
  "site.primer.mermaid.syntax.flowchart":
    "flowchart TD दिशा सेट करता है। चरण [text] है, निर्णय {text} है, आरंभ ([text]) है। तीर --> है, शाखा लेबल |yes| है।",
  "site.primer.mermaid.syntax.sequence":
    "sequenceDiagram आरेख खोलता है। as के साथ actor और participant जीवनरेखा का नाम देते हैं। अनुरोध ->> है, उत्तर -->> है।",
  "site.primer.mermaid.syntax.class":
    "classDiagram आरेख खोलता है। class Name { } में +name type फ़ील्ड और मेथड होते हैं। कड़ी --> है।",
  "site.primer.mermaid.syntax.state":
    "stateDiagram-v2 आरेख खोलता है। [*] आरंभ है। संक्रमण --> है, और लेबल कोलन के बाद आता है।",
  "site.primer.mermaid.syntax.er":
    "erDiagram आरेख खोलता है। ||--o{ एक-से-अनेक पढ़ा जाता है, और भूमिका कोलन के बाद आती है।",
  "site.primer.mermaid.syntax.gantt":
    "gantt चार्ट खोलता है। title शीर्षक है, dateFormat दिनांक पैटर्न है, section समूह है। कार्य name :id, date, duration है।",
  "site.primer.mermaid.syntax.mindmap":
    "mindmap मानचित्र खोलता है। मूल root((topic)) है। इंडेंट नेस्टिंग तय करता है।",
  "site.primer.mermaid.syntax.pie":
    "pie showData संख्याएँ छापता है। title शीर्षक है। स्लाइस \"name\" : number है।",
  "site.primer.mermaid.syntax.journey":
    "journey पथ खोलता है। title शीर्षक है, section एक चरण है। कार्य name: score: role है।",
  "site.primer.mermaid.syntax.gitgraph":
    "gitGraph इतिहास खोलता है। commit एक कमिट है, branch एक ब्रांच है, checkout बदलता है, merge जोड़ता है।",
  "site.primer.mermaid.syntax.timeline":
    "timeline स्केल खोलता है। title शीर्षक है, section एक अवधि है। घटनाएँ कोलन के बाद आती हैं।",
  "site.primer.mermaid.syntax.sankey":
    "sankey-beta प्रवाह खोलता है। हर पंक्ति source,target,weight है। नोड नाम ASCII हैं; अल्पविराम वाले नाम को उद्धृत करें। विकल्प CSV स्तंभ नहीं हैं: उन्हें कीवर्ड से पहले config.sankey YAML हेडर में सेट करें (showValues, prefix, suffix, linkColor, nodeAlignment, width, height, useMaxWidth, nodeWidth, nodePadding, labelStyle, nodeColors)।",
  "site.primer.mermaid.syntax.xychart":
    "xychart-beta चार्ट खोलता है। x-axis श्रेणियाँ हैं, y-axis सीमा है, bar और line शृंखलाएँ हैं।",
  "site.primer.mermaid.syntax.block":
    "block-beta ब्लॉक खोलता है। columns स्तंभों की संख्या सेट करता है। ब्लॉक id[\"label\"] है, कड़ी --> है।",
  "site.primer.mermaid.syntax.c4_context":
    "C4Context संदर्भ खोलता है। Person() और System() तत्व घोषित करते हैं, Rel() एक कड़ी है।",
  "site.primer.mermaid.syntax.requirement":
    "requirementDiagram आरेख खोलता है। requirement { } एक आवश्यकता है, element { } एक तत्व है, कड़ी satisfies है।",
  "site.primer.mermaid.syntax.quadrant":
    "quadrantChart क्वाड्रंट खोलता है। x-axis और y-axis अक्ष हैं, quadrant-1 … quadrant-4 नाम हैं, बिंदु name: [x, y] है।",
  "site.primer.mermaid.syntax.architecture":
    "architecture-beta आरेख खोलता है। group एक समूह है, service एक सेवा है, कड़ी service:R --> L:service है।",
  "site.primer.mermaid.syntax.packet":
    "packet-beta पैकेट खोलता है। title शीर्षक है। फ़ील्ड एक बिट सीमा और लेबल है, उदाहरण 0-15: \"स्रोत\"।",
  "site.ext.mermaid.title": "Mermaid Ext एक्सटेंशन",
  "site.ext.mermaid.lead":
    "पाँच आरेख प्रकार जो साधारण Mermaid में नहीं हैं: वॉटरफ़ॉल, बबल, हीटमैप, संगठन चार्ट और अर्जित मूल्य। अंतर्निहित इंजन से बने, बिना बाहरी सेवाओं के।",
  "site.ext.mermaid.note":
    "पाँचों प्रकार अंतर्निहित इंजन से बनते हैं, बिना बाहरी सेवाओं के। यदि नीचे का उदाहरण संपादक में नहीं बनता, तो यह बिल्ड एक्सटेंशन के बिना बना था।",
  "site.ext.mermaid.type.waterfall": "वॉटरफ़ॉल",
  "site.ext.mermaid.type.bubble": "बबल",
  "site.ext.mermaid.type.heatmap": "हीटमैप",
  "site.ext.mermaid.type.orgchart": "संगठन चार्ट",
  "site.ext.mermaid.type.ev": "अर्जित मूल्य",
  "site.ext.mermaid.type.boxplot": "बॉक्स प्लॉट",
  "site.ext.mermaid.type.treemap": "ट्री मैप",
  "site.ext.mermaid.type.radar": "रडार चार्ट",
  "site.ext.mermaid.type.voronoi": "वोरोनोई विभाजन",
  "site.ext.mermaid.type.clustered": "शृंखला चार्ट",
  "site.ext.mermaid.desc.waterfall":
    "आरंभिक मान + और − चरणों से कुल कैसे बनता है। निरपेक्ष स्तंभ = से शुरू होते हैं, कई परिदृश्य series से घोषित होते हैं। अक्ष विराम, श्याम-श्वेत मोड (mono और mono invert) और कस्टम रंग समर्थित हैं।",
  "site.ext.mermaid.desc.bubble":
    "एक साथ तीन आयाम: x, y और बबल आकार। वैकल्पिक BCG क्वाड्रंट और रंग समूह।",
  "site.ext.mermaid.desc.heatmap":
    "रंग स्केल वाली मान मैट्रिक्स। स्केल सीमाएँ स्पष्ट हैं, खाली कक्ष (लगातार दो विभाजक) धूसर बनता है।",
  "site.ext.mermaid.desc.orgchart":
    "स्पष्ट किनारों वाला रिपोर्टिंग वृक्ष: ठोस मुख्य रेखा है, बिंदुयुक्त -.-> द्वितीयक प्रबंधक है। ब्लॉक अपना भराव (color) और अपनी सीमा (border, style) सेट कर सकता है। कई मूल एक अदृश्य मूल के नीचे जुड़ते हैं। avatar फ़ोटो या छाया दिखाता है: पुरुष, महिला या अज्ञात लिंग।",
  "site.ext.mermaid.desc.ev":
    "दिन के अनुसार तीन संचयी वक्र: नियोजित मूल्य PV, अर्जित मूल्य EV और वास्तविक लागत AC। साथ में लेजेंड में SV और CV विचलन।",
  "site.ext.mermaid.desc.boxplot":
    "श्रेणियों में वितरण: न्यूनतम, निचला और ऊपरी चतुर्थक (Q1, Q3), माध्यिका, अधिकतम, माध्य और अपवाद। स्पष्ट पाँच-संख्या सारांश या कच्चे अवलोकन (values=) दोनों स्वीकार करता है।",
  "site.ext.mermaid.desc.treemap":
    "समूहों और आइटमों में संख्यात्मक भार के अनुपात में पदानुक्रमित आयत विभाजन, स्वचालित प्रतिशत हिस्से और रंग छाया के साथ।",
  "site.ext.mermaid.desc.radar":
    "एक साझा केंद्र से रेडियल अक्षों पर कई शृंखलाओं की तुलना, कॉन्फ़िगर करने योग्य ग्रिड वलय, भराव अपारदर्शिता और कस्टम रंगों के साथ।",
  "site.ext.mermaid.desc.voronoi":
    "समतल का उत्तल निकटतम-पड़ोसी कोशिकाओं में ज्यामितीय विभाजन, रंग समूहों और केंद्रक लेबल के साथ।",
  "site.ext.mermaid.desc.clustered":
    "श्रेणियों में कई शृंखलाओं के बार, साथ-साथ या स्टैक, ओवरले रेखाओं, क्षैतिज स्तरों, अक्ष विराम, CAGR कॉलआउट, 90-डिग्री घुमाव (rotate 90), उल्टे ऊर्ध्वाधर अक्ष (invert y) और श्याम-श्वेत मोड (mono, mono invert) के साथ।",
  "site.ext.mermaid.syntax.waterfall":
    "waterfall चार्ट खोलता है। y अक्ष सेट करता है। = निरपेक्ष स्तंभ है, + और - एक चरण हैं, और लेबल कोलन के बाद आता है। लेबल में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.bubble":
    "bubble चार्ट खोलता है। x, y और size अक्ष और आकार सेट करते हैं। data के अंदर बिंदु name : x=, y=, size= है। नाम में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.heatmap":
    "heatmap मानचित्र खोलता है। x और y अक्ष लेबल हैं। data के अंदर पंक्ति name : अल्पविराम से अलग संख्याएँ है। लेबल में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.orgchart":
    "orgchart वृक्ष खोलता है। नोड id [role\\nname] है (\\n, <br> और | पंक्ति तोड़ते हैं, \\| | रहता है, बॉक्स पाठ के अनुसार फिट होता है); color=#hex भराव सेट करता है, border=#hex और style=solid|dash|dot|dashdot सीमा का रंग और शैली सेट करते हैं। avatar 48 फ़ोटो बॉक्स दिखाता है; gender=m|f|? छाया चुनता है, photo= चित्र देता है, avatar off बॉक्स छिपाता है। ठोस किनारा -> है, द्वितीयक प्रबंधक -.-> है।",
  "site.ext.mermaid.syntax.ev":
    "ev चार्ट खोलता है। days दिन हैं, pv योजना है, ev अर्जित मूल्य है, ac वास्तविक लागत है। दिन लेबल में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.boxplot":
    "boxplot चार्ट खोलता है। श्रेणी पंक्ति: Name : min=, q1=, median=, q3=, max= (या values=v1, v2, …) वैकल्पिक color=#hex के साथ। नाम में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.treemap":
    "treemap मानचित्र खोलता है। पंक्ति: Group / Item : weight [color=#hex]। labels मान और प्रतिशत प्रदर्शन नियंत्रित करता है। नाम में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.radar":
    "radar चार्ट खोलता है। axes स्पोक लेबल सूचीबद्ध करता है, series Name : v1, v2, … एक डेटा शृंखला परिभाषित करता है। लेबल में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.voronoi":
    "voronoi विभाजन खोलता है। data के अंदर साइट Name : x=, y=, group=, color=#hex है। नाम में \\n पंक्ति तोड़ता है।",
  "site.ext.mermaid.syntax.clustered":
    "series चार्ट खोलता है। categories श्रेणियाँ सूचीबद्ध करता है, series Name : v1, v2, … बार बनाता है, और नाम छोड़ा जा सकता है (`series : v1, v2`); खाली स्थान, \"-\" या null बार छोड़ देता है। line Label : v1, v2, … रेखा बनाता है, और लेबल छोड़ा जा सकता है (`line : v1, v2`) (छोड़ा गया स्थान दोनों ओर के बिंदुओं को जोड़ता है); लेबल प्लॉट के दाईं ओर रहता है; color और style=solid|dash|dot|dashdot स्ट्रोक तय करते हैं। line 160 \"plan\" क्षैतिज स्तर बनाता है (बिना कोलन)। break 200 --> 700 अक्ष का एक हिस्सा काटता है। cagr पहले बार से अंतिम बार तक CAGR है, cagr 2, 7 उन बार को जोड़ता है; format, prefix और label अंडाकार को नियंत्रित करते हैं। format=\"±0.0%\" धन चिह्न केवल तब जोड़ता है जब मान धनात्मक हो। जो तीर ओवरलैप नहीं करते वे एक ही स्तर साझा करते हैं। लगातार cagr पंक्तियाँ एक ही शृंखला पर लागू होती हैं। stacked शृंखला को एक के ऊपर रखता है, stacked off बार को साथ-साथ रखता है, rotate 90 चार्ट घुमाता है। invert y के साथ rotate 90 पहली श्रेणी को नीचे रखता है, और invert y off ऊपर-से-नीचे क्रम लौटाता है। लेबल में y2 \"लेबल\" 0 --> 40 दूसरा पैमाना बनाता है (दाईं ओर, rotate 90 पर ऊपर), और axis=y2 किसी शृंखला, रेखा या स्तर को उससे जोड़ता है। \\n पंक्ति तोड़ता है।",
  "site.primer.graphml.kw.graphml":
    "दस्तावेज़ मूल। GraphML नेमस्पेस आवश्यक है।",
  "site.primer.graphml.kw.graph":
    "ग्राफ़ स्वयं। edgedefault directed या undirected है।",
  "site.primer.graphml.kw.node": "एक शीर्ष। id अद्वितीय होना चाहिए।",
  "site.primer.graphml.kw.edge": "एक किनारा। source और target नोड id की ओर इशारा करते हैं।",
  "site.primer.graphml.kw.key": "नोड या किनारों के लिए एक विशेषता घोषित करता है।",
  "site.primer.graphml.kw.data":
    "एक विशेषता मान। दृश्य लेबल यहाँ रहता है, id में नहीं।",
  "site.primer.graphml.syntax.directed":
    "graphml मूल है, graph edgedefault=\"directed\" दिशात्मक ग्राफ़ है। node एक शीर्ष है, edge source और target एक किनारा है, data लेबल है।",
  "site.primer.graphml.syntax.undirected":
    "वही आकृति, edgedefault=\"undirected\" के साथ: किनारा केवल नोड जोड़ता है।",
  "site.primer.wiremark.kw.wireframe":
    "एक स्क्रीन। # के बाद का नाम वह एंकर है जिससे अन्य स्क्रीन जुड़ती हैं।",
  "site.primer.wiremark.kw.flow":
    "कई स्क्रीन जोड़ता है। LR कड़ियाँ बाएँ से दाएँ बनाता है।",
  "site.primer.wiremark.kw.stack":
    "एक स्तंभ या एक पंक्ति। gap अंतर तय करता है, इंडेंट नेस्टिंग तय करता है।",
  "site.primer.wiremark.kw.typography":
    "पाठ। h4 और body1 स्तर चुनते हैं, उद्धृत स्ट्रिंग लेबल है।",
  "site.primer.wiremark.kw.textfield":
    "एक इनपुट। लेबल उद्धृत है, required जैसी सेटिंग्स नहीं।",
  "site.primer.wiremark.kw.button":
    "एक बटन। contained इसे भरता है, to=#id दूसरी स्क्रीन पर जाता है।",
  "site.primer.wiremark.syntax.wireframe":
    "Wireframe #anchor एक स्क्रीन खोलता है। Stack स्तंभ बनाता है, Typography पाठ है, TextField इनपुट है, Button बटन है।",
  "site.primer.wiremark.syntax.flow":
    "Flow LR स्क्रीन को बाएँ से दाएँ जोड़ता है। बटन पर to=#anchor दूसरे Wireframe पर जाता है।",
  "site.primer.d2.kw.direction":
    "लेआउट दिशा: down, right, left या up।",
  "site.primer.d2.kw.shape":
    "नोड आकृति: person, cylinder, class, sql_table, sequence_diagram।",
  "site.primer.d2.kw.arrow": "नोडों के बीच एक कड़ी। लेबल कोलन के बाद आता है।",
  "site.primer.d2.kw.style": "नोड शैली: fill, stroke और font।",
  "site.primer.d2.kw.constraint":
    "SQL स्तंभ बाधा: primary_key, foreign_key या unique।",
  "site.primer.d2.syntax.flowchart":
    "direction लेआउट सेट करता है। shape: person और shape: cylinder नोड आकृतियाँ हैं। कड़ी -> है, लेबल कोलन के बाद।",
  "site.primer.d2.syntax.sequence":
    "shape: sequence_diagram ब्लॉक को अनुक्रम बनाता है। प्रतिभागी नेस्टेड नोड हैं, संदेश -> है।",
  "site.primer.d2.syntax.class":
    "shape: class ब्लॉक को वर्ग बनाता है। फ़ील्ड और मेथड ब्लॉक के अंदर पंक्तियाँ हैं, कड़ी -> है।",
  "site.primer.d2.syntax.er":
    "shape: sql_table ब्लॉक को तालिका बनाता है। constraint: primary_key और foreign_key कुंजियाँ चिह्नित करते हैं, कड़ी field -> field है।",
  "site.primer.d2.syntax.architecture":
    "नेस्टेड ब्लॉक नोड समूहित करते हैं। shape रूप सेट करता है, -> लेबल वाली कड़ी है।",
  "site.primer.structurizr.kw.workspace":
    "दस्तावेज़ मूल: मॉडल का नाम और संक्षिप्त विवरण।",
  "site.primer.structurizr.kw.person": "सिस्टम का उपयोग करने वाला व्यक्ति।",
  "site.primer.structurizr.kw.softwareSystem": "मॉडल में एक सॉफ़्टवेयर सिस्टम।",
  "site.primer.structurizr.kw.container":
    "सिस्टम के अंदर एक अनुप्रयोग या डेटा स्टोर। तीसरा तर्क तकनीक है।",
  "site.primer.structurizr.kw.arrow":
    "कौन किसे कॉल करता है। संबंध लेबल उद्धृत है।",
  "site.primer.structurizr.kw.views": "मॉडल से कौन से दृश्य बनाने हैं।",
  "site.primer.structurizr.kw.autolayout":
    "स्वचालित दृश्य लेआउट: tb ऊपर से नीचे है, lr बाएँ से दाएँ है।",
  "site.primer.structurizr.syntax.c4_context":
    "workspace दस्तावेज़ खोलता है। person और softwareSystem मॉडल बताते हैं, -> एक संबंध है, systemContext और autolayout दृश्य बनाते हैं।",
  "site.primer.structurizr.syntax.c4_container":
    "softwareSystem के अंदर container एक अनुप्रयोग है। container दृश्य और include * कंटेनर इकट्ठा करते हैं।",
  "site.primer.structurizr.syntax.component":
    "container के अंदर component एक मॉड्यूल बताता है। component दृश्य उस कंटेनर को बनाता है।",
  "site.primer.structurizr.syntax.deployment":
    "deploymentEnvironment और deploymentNode वातावरण बताते हैं। containerInstance कंटेनर को नोड पर रखता है, deployment दृश्य आरेख बनाता है।",
  "site.stackLead": "इंटरफ़ेस:",
  "site.hero.ctaPrimary": "बिना साइन-अप संपादक खोलें",
  "site.hero.ctaSecondary": "📲 डेस्कटॉप / फ़ोन पर इंस्टॉल करें",
  "site.hero.trustOffline":
    "📶 ऑफ़लाइन काम करता है: मुख्य सुविधाएँ और कनवर्टर इंटरनेट के बिना उपलब्ध हैं।",
  "site.hero.trustAi":
    "🤖 AI और विज़ार्ड: पाठ से या निर्देशित चरण-दर-चरण प्रवाह से आरेख बनाएँ।",
  "site.hero.trustConverter":
    "🔄 तीन-में-एक कनवर्टर: PlantUML, Mermaid और GraphML के बीच तुरंत अनुवाद।",
  "site.hero.trustPwa":
    "💻 PWA ऐप: Windows, macOS, Linux, iOS और Android पर इंस्टॉल करें।",

  "site.pillars.title": "एक स्वायत्त ऐप में कोड के रूप में आरेखों के लिए सब कुछ",
  "site.pillars.item1.title": "🤖 स्मार्ट निर्माण (AI और विज़ार्ड)",
  "site.pillars.item1.text":
    "सिंटैक्स हाथ से नहीं लिखना चाहते? AI सहायक के लिए अपनी आर्किटेक्चर सादे पाठ में बताएँ या चरण-दर-चरण विज़ार्ड के प्रश्नों के उत्तर दें। सेकंडों में साफ़, मान्य आरेख कोड पाएँ।",
  "site.pillars.item2.title": "⚡️ रूपांतरण और संपादन (लाइव संपादक)",
  "site.pillars.item2.text":
    "तत्काल पूर्वावलोकन वाला सुविधाजनक ऑनलाइन संपादक। PlantUML को Mermaid में, Mermaid को GraphML में, और वापस एक क्लिक में रूपांतरित करें। Notion, GitHub और Draw.io के बीच संगतता की चिंता छोड़ दें।",
  "site.pillars.item3.title": "📲 PWA, ऑफ़लाइन मोड और संग्रह",
  "site.pillars.item3.text":
    "Code2Graph को अपने लैपटॉप या टैबलेट पर मूल ऐप की तरह इंस्टॉल करें। आपका काम और परियोजनाएँ स्थानीय और क्लाउड में सहेजी जाती हैं, ताकि आप विमान में या बिना कनेक्टिविटी के आर्किटेक्चर डिज़ाइन कर सकें।",

  "site.deepDive.title": "अपने आर्किटेक्चर दस्तावेज़ पर पूरा नियंत्रण",
  "site.deepDive.item1.title": "🔄 द्विदिश प्रारूप कनवर्टर",
  "site.deepDive.item1.text":
    "पुराने GraphML आरेखों को आधुनिक Mermaid या PlantUML मानकों पर ले जाएँ, बिना कड़ियाँ, नोड या तार्किक संरचना खोए।",
  "site.deepDive.item2.title": "📝 शक्तिशाली लाइव संपादक",
  "site.deepDive.item2.text":
    "सिंटैक्स हाइलाइटिंग, संकेत और स्वतः पूर्ण। बिना देरी के तत्काल रेंडरिंग।",
  "site.deepDive.item3.title": "☁️ संग्रह और स्थानीय पहुँच",
  "site.deepDive.item3.text":
    "आरेख निजी लाइब्रेरी में सहेजें। सुरक्षित ऑफ़लाइन काम के लिए स्वचालित PWA कैश।",
  "site.deepDive.item4.title": "📤 एक क्लिक में निर्यात",
  "site.deepDive.item4.text":
    "आरेख वेक्टर (SVG) या रैस्टर (PNG) के रूप में डाउनलोड करें। Markdown / Confluence के लिए तैयार कोड क्लिपबोर्ड पर कॉपी करें।",

  "site.formats.title": "सभी मुख्य मानकों के लिए एक उपकरण",
  "site.formats.colFormat": "प्रारूप",
  "site.formats.colPurpose": "उद्देश्य",
  "site.formats.colFeatures": "Code2Graph क्षमताएँ",
  "site.formats.plantuml.purpose": "जटिल UML, अनुक्रम, वर्ग और अवस्था आरेख",
  "site.formats.plantuml.features": "संपादन, AI जनरेशन, Mermaid/GraphML में रूपांतरण",
  "site.formats.plantuml.summary":
    "अनुक्रम, वर्ग, अवस्था, C4 और अन्य के लिए पाठ UML। Code2Graph इसे @plantuml/core और Smetana लेआउट इंजन से ऑफ़लाइन रेंडर करता है। C4 और ArchiMate आरेख मेल खाती PlantUML मानक लाइब्रेरी उपयोग करते हैं।",
  "site.formats.mermaid.purpose": "GitHub, Notion, Obsidian और Jira के लिए हल्के आरेख",
  "site.formats.mermaid.features": "लाइव पूर्वावलोकन, विज़ार्ड जनरेशन, निर्यात",
  "site.formats.mermaid.summary":
    "Markdown, GitHub और नोट्स के लिए सघन आरेख भाषा। संपादक Mermaid को ब्राउज़र में रेंडर करता है; ऑनलाइन मोड mermaid.ink भी उपयोग कर सकता है।",
  "site.formats.graphml.purpose": "yEd, Draw.io और विज़ुअलाइज़ेशन सिस्टम के लिए टोपोलॉजी ग्राफ़",
  "site.formats.graphml.features": "आयात, विज़ुअलाइज़ेशन, नमूने, कोड में रूपांतरण",
  "site.formats.graphml.summary":
    "yEd और अन्य उपकरणों द्वारा उपयोग किया XML ग्राफ़ प्रारूप। Code2Graph GraphML पढ़ता है और ग्राफ़ को dagre से व्यवस्थित करता है।",
  "site.formats.wiremark.purpose": "मार्कडाउन के अंदर हाथ से बने UI वायरफ़्रेम",
  "site.formats.wiremark.features": "संपादन, लाइव पूर्वावलोकन, नमूना स्क्रीन",
  "site.formats.wiremark.summary":
    "स्केच जैसे दिखने वाले पाठ वायरफ़्रेम। ऐप में पूर्वावलोकन @wiremark/core बनाता है।",
  "site.formats.d2.purpose": "आधुनिक आरेख: आर्किटेक्चर, अनुक्रम, वर्ग और SQL",
  "site.formats.d2.features": "संपादन, ऑफ़लाइन पूर्वावलोकन, चयनित भाषा के नमूने",
  "site.formats.d2.summary":
    "आर्किटेक्चर, अनुक्रम, वर्ग और SQL के लिए आधुनिक आरेख भाषा। ऑफ़लाइन पूर्वावलोकन @d2lang/d2 संकलित करता है।",
  "site.formats.structurizr.purpose": "कोड के रूप में C4 आर्किटेक्चर: संदर्भ, कंटेनर, घटक, परिनियोजन",
  "site.formats.structurizr.features": "संपादन, ऑफ़लाइन C4 पूर्वावलोकन, चयनित भाषा के नमूने",
  "site.formats.structurizr.summary":
    "कोड के रूप में C4 आर्किटेक्चर: परिदृश्य, संदर्भ, कंटेनर, घटक और परिनियोजन। संपादक Structurizr DSL रखता है और दृश्य PlantUML C4 से बनाता है।",

  "site.audience.title": "पूरी इंजीनियरिंग टीम को तेज़ करता है",
  "site.audience.architect.title": "🏛 सॉफ़्टवेयर आर्किटेक्ट",
  "site.audience.architect.item1": "AI से C4 मॉडल और अवधारणात्मक आरेख जल्दी स्केच करें।",
  "site.audience.architect.item2": "कंपनी के सभी दस्तावेज़ एक मानक पर लाएँ।",
  "site.audience.dev.title": "👨‍💻 डेवलपर और टीम लीड",
  "site.audience.dev.item1": "कार्य डिज़ाइन करते समय अनुक्रम आरेख बनाएँ।",
  "site.audience.dev.item2": "आरेखों को कोड मानें, उन्हें Git में रखें और ऑफ़लाइन संपादित करें।",
  "site.audience.writer.title": "📝 तकनीकी लेखक और व्यावसायिक विश्लेषक",
  "site.audience.writer.item1": "व्यावसायिक प्रक्रियाएँ बताने के लिए चरण-दर-चरण विज़ार्ड उपयोग करें।",
  "site.audience.writer.item2":
    "अलग-अलग प्लेटफ़ॉर्म (Notion/Confluence) के लिए आरेख आसानी से रूपांतरित करें।",

  "site.gettingStarted.title": "10 सेकंड में शुरू करें — कोई जटिल सेटअप नहीं",
  "site.gettingStarted.browser.title": "विकल्प A: ब्राउज़र में",
  "site.gettingStarted.browser.text":
    "बस Code2Graph.ru खोलें और तुरंत आरेख बनाना या रूपांतरित करना शुरू करें।",
  "site.gettingStarted.pwa.title": "विकल्प B: PWA ऐप के रूप में",
  "site.gettingStarted.pwa.text":
    "ब्राउज़र पता पट्टी या लैंडिंग पृष्ठ पर ऐप इंस्टॉल करें क्लिक करें। Code2Graph आपके डेस्कटॉप या फ़ोन की होम स्क्रीन पर दिखेगा।",

  "site.faq.title": "अक्सर पूछे जाने वाले प्रश्न",
  "site.faq.q1": "PWA क्या है और ऑफ़लाइन मोड कैसे काम करता है?",
  "site.faq.a1":
    "प्रोग्रेसिव वेब ऐप वेबसाइट को आपके डिवाइस पर सामान्य प्रोग्राम की तरह उपयोग करने देता है। पहली लोड के बाद ऐप स्थानीय रूप से कैश होता है, ताकि आप इंटरनेट के बिना आरेख रूपांतरित, संपादित और देख सकें।",
  "site.faq.q2": "क्या AI जनरेशन ऑफ़लाइन काम करता है?",
  "site.faq.a2":
    "स्वयं संपादन, प्रारूप रूपांतरण, चरण-दर-चरण विज़ार्ड और संग्रह ऑफ़लाइन काम करते हैं। AI अनुरोधों के लिए नेटवर्क कनेक्शन चाहिए।",
  "site.faq.q3": "क्या मैं डेटा हानि के बिना PlantUML आरेख Mermaid में रूपांतरित कर सकता हूँ?",
  "site.faq.a3":
    "हाँ। हमारा अंतर्निहित कनवर्टर मूल आरेख का तर्क बनाए रखने के लिए सिंटैक्स और नोड अनुवादित करता है।",
  "site.faq.q4": "क्या Code2Graph में आरेख रखना सुरक्षित है?",
  "site.faq.a4":
    "बिल्कुल। आरेख आपके ब्राउज़र / PWA ऐप में स्थानीय रूप से सहेजे जाते हैं, और खाते के साथ वे आपके निजी क्लाउड में सुरक्षित रहते हैं।",

  "site.finalCta.title": "कोड के रूप में आरेखों के लिए आपका बहुउपयोगी उपकरण",
  "site.finalCta.text":
    "AI से बनाएँ, संपादित करें, रूपांतरित करें और PlantUML, Mermaid तथा GraphML आरेख एक जगह रखें। अभी किसी भी डिवाइस पर उपलब्ध।",
  "site.finalCta.primary": "Code2Graph खोलें",
  "site.finalCta.secondary": "📲 PWA इंस्टॉल करें",

  "site.featureOffline": "ऑफ़लाइन और file:// के माध्यम से काम करता है",
  "site.featureFormats": "PlantUML · Mermaid · GraphML",
  "site.featureAi": "AI से आरेख बनाना और संपादन",
  "site.featureLibrary": "क्लाउड आरेख लाइब्रेरी",
  "site.featureLlmLocal": "BYOK LLM कुंजियाँ आपके ब्राउज़र में रहती हैं",
  "site.loginTitle": "साइन इन",
  "site.loginSubtitle": "व्यक्तिगत खाता और क्लाउड लाइब्रेरी",
  "site.registerTitle": "साइन अप",
  "site.registerSubtitle": "Code2Graph सर्वर पर खाता बनाएँ",
  "site.accountTitle": "खाता",
  "site.staticModeTitle": "स्थानीय संस्करण",
  "site.staticModeText":
    "यह बिल्ड बिना सर्वर या डेटाबेस चलता है: आरेख आपके ब्राउज़र में रहते हैं। साइन-इन और क्लाउड लाइब्रेरी सर्वर संस्करण पर उपलब्ध हैं।",
  "site.username": "उपयोगकर्ता नाम",
  "site.password": "पासवर्ड",
  "site.passwordConfirm": "पासवर्ड की पुष्टि करें",
  "site.rememberMe": "मुझे याद रखें",
  "site.loginSubmit": "साइन इन",
  "site.registerSubmit": "खाता बनाएँ",
  "site.logout": "साइन आउट",
  "site.openEditor": "संपादक खोलें",
  "site.backHome": "होम पर वापस",
  "site.mcp.title": "एजेंटों के लिए MCP",
  "site.mcp.connected": "जुड़ा हुआ",
  "site.mcp.disconnected": "जुड़ा नहीं",
  "site.mcp.lead":
    "एक एजेंट आरेख शब्दों में बताता है। Code2Graph भाषा चुनता है और PlantUML, Mermaid, GraphML, WireMark, D2 या Structurizr का स्रोत और एक छवि लौटाता है।",
  "site.mcp.pointPlan": "plan_diagram भाषा और आरेख प्रकार चुनता है।",
  "site.mcp.pointGenerate": "generate_diagram आरेख स्रोत और एक छवि लौटाता है।",
  "site.mcp.exampleCaption":
    "generate_diagram का परिणाम वह स्रोत है जिसे संपादक खोल सकता है, साथ में आरेख की बनी छवि।",
  "site.mcp.exampleSource": "स्रोत",
  "site.mcp.exampleImage": "छवि",
  "site.mcp.pointLanguages": "वही छह भाषाएँ जो संपादक और विज़ार्ड में हैं।",
  "site.mcp.openPage": "MCP कैसे जोड़ें",
  "site.mcp.pageTitle": "Code2Graph MCP",
  "site.mcp.summary":
    "MCP सर्वर Cursor और अन्य एजेंटों को Code2Graph से आरेख माँगने देता है। यह अनुरोध से भाषा चुनता है और स्रोत तथा आरेख की छवि लौटाता है।",
  "site.mcp.toolsTitle": "उपकरण",
  "site.mcp.toolList": "साइट की भाषाएँ और हर एक द्वारा स्वीकार किए आरेख प्रकार।",
  "site.mcp.toolPlan": "एक वाक्य के लिए भाषा और प्रकार, बिना स्रोत के।",
  "site.mcp.toolGenerate":
    "आरेख स्रोत और एक छवि। CODE2GRAPH_API_URL के साथ स्रोत सर्वर से आता है; अन्यथा वही ढाँचा स्थानीय रूप से बनता है। चित्र एक अलग ब्लॉक है: Kroki PlantUML, D2 और Structurizr बनाता है, mermaid.ink Mermaid बनाता है, और GraphML तथा WireMark स्थानीय रूप से बनते हैं।",
  "site.mcp.connectTitle": "Cursor में जोड़ें",
  "site.mcp.connectText":
    "इस रिपॉज़िटरी की एक प्रति से स्क्रिप्ट चलाएँ। पथ को अपनी प्रति से बदलें। स्थानीय रूप से जनरेट करने के लिए URL खाली छोड़ें, या उसे सर्वर संस्करण की ओर इंगित करें।",
  "site.mcp.source": "रिपॉज़िटरी में MCP पैकेज",
  "site.mcp.apiTitle": "सर्वर API",
  "site.mcp.apiText":
    "सर्वर संस्करण ये मार्ग उपलब्ध कराता है। यदि AGENT_API_TOKEN सेट है, तो Authorization: Bearer वही मान भेजें जो CODE2GRAPH_API_TOKEN है।",
  "site.mcp.apiFormats": "भाषाएँ और प्रकार",
  "site.mcp.apiPlan": "एक भाषा चुनें",
  "site.mcp.apiScaffold": "भाषा, प्रकार और स्रोत",
  "site.mcp.staticNote":
    "GitHub Pages एक स्थिर संपादक है और /api/agent नहीं देता। API सर्वर संस्करण पर चलता है, उदाहरण www.code2graph.ru।",
  "site.mcp.catalogTitle": "क्षमता सूची",
  "site.mcp.catalogText":
    "क्षमता सूची इसी होस्ट पर /llm/ है। स्थानीय MCP वही पृष्ठ डिस्क से पढ़ता है और वाक्य-रचना के लिए किसी दूसरे सर्वर को नहीं बुलाता। उत्तर संपादक के लिए स्रोत है, बिना चित्र और बिना बाहरी रेंडरर के।",
  "site.mcp.toolCapabilities":
    "भाषाओं का एक अनुक्रमण पृष्ठ, या भाषा दिए जाने पर उस एक भाषा का। कार्ड का पाठ शामिल नहीं।",
  "site.mcp.toolSyntax":
    "कीवर्ड या पिछले लिंक के पथ से एक वाक्य-रचना पृष्ठ। जुड़े पृष्ठ आपस में नहीं जोड़े जाते।",
  "site.noAccount": "खाता नहीं है?",
  "site.hasAccount": "पहले से खाता है?",
  "site.role": "भूमिका",
  "site.loginError": "अमान्य उपयोगकर्ता नाम या पासवर्ड",
  "site.registerError": "पंजीकरण विफल",
  "site.registerDisabled": "व्यवस्थापक ने पंजीकरण बंद कर दिया है",
  "site.registerStatusError":
    "सर्वर स्थिति जाँची नहीं जा सकी। अपना कनेक्शन जाँचें और फिर कोशिश करें।",
  "site.registerMismatch": "पासवर्ड मेल नहीं खाते",
  "site.registerRequired": "सभी फ़ील्ड भरें",
  "site.welcomeUser": "{username} के रूप में साइन इन",
  "site.versionHint": "साइट संस्करण — अपडेट या पृष्ठ पुनः लोड के बाद तुलना करें",
  "site.footer.links": "परियोजना लिंक",
  "site.license.title": "लाइसेंस",
  "site.license.summary":
    "Prosperity Public License 3.0.0 के अंतर्गत स्रोत-उपलब्ध। गैर-व्यावसायिक उपयोग के लिए निःशुल्क।",
  "site.license.commercial":
    "व्यावसायिक उपयोग 30-दिन के परीक्षण में निःशुल्क है; उसके बाद सशुल्क लाइसेंस आवश्यक है।",
  "site.license.read": "लाइसेंस पढ़ें",
  "site.license.commercialLink": "व्यावसायिक लाइसेंस",
  "site.landing.showcaseTitle": "देखो, क्लिक करो, बदलो",
  "site.landing.showcaseHint": "नीचे की हर तस्वीर एडिटर में खुलती है",
  "site.landing.tryScenario": "यह परिदृश्य आज़माएँ",
  "site.landing.openInEditor": "एडिटर में खोलें",
  "site.landing.allFormats": "6 भाषाएँ — एक एडिटर",
  "site.landing.privacyTitle": "आपके डिवाइस पर निजी",
  "site.landing.privacyLocal": "आरेख आपके ब्राउज़र में बनता है",
  "site.landing.privacyKey": "आपकी AI कुंजी आपके ब्राउज़र में रहती है",
  "site.landing.privacyCloud": "क्लाउड केवल खाते से; AI आपके प्रदाता का नेटवर्क उपयोग करता है",
  "site.landing.platformTitle": "जहाँ आप काम करें",
  "site.landing.platformDevices": "Windows · macOS · Linux · iOS · Android",
  "site.landing.platformSame": "ब्राउज़र या इंस्टॉल ऐप — वही एडिटर",
  "site.landing.platformOffline": "पहली बार खुलने के बाद ऑफ़लाइन भी चलता है",
  "site.landing.heroAlt": "कोड टाइप होते ही आरेख लाइव बनता है",
  "site.landing.converterAlt": "एक क्लिक में PlantUML से Mermaid, आरेख वही रहता है",
  "site.landing.mcpAlt": "Cursor में AI एजेंट से पूछना और तैयार आरेख पाना",
  "site.landing.audience.developers": "डेवलपर",
  "site.landing.audience.analysts": "विश्लेषक",
  "site.landing.audience.managers": "प्रबंधक",
  "site.landing.audience.students": "छात्र",
  "site.landing.audience.vibecoders": "वाइब कोडर",
  "site.landing.usp.developers": "रिव्यू में सीक्वेंस और C4 — आरेख कोड जैसा, Git और PR डिफ़ में",
  "site.landing.usp.analysts": "बिना सिंटैक्स के प्रक्रिया: सहायक पूछता है, आरेख तैयार",
  "site.landing.usp.managers": "योजना और स्थिति एक तस्वीर में: Gantt और चार्ट एक क्लिक में स्लाइड में",
  "site.landing.usp.students": "एक मिनट में आरेख: टेम्पलेट, संकेत, कोई इंस्टॉल नहीं",
  "site.landing.usp.vibecoders": "एजेंट बनाता है, आप बदलते हैं: MCP Cursor को कोड और तस्वीर देता है",
  "site.ext.mermaid.type.powermap": "पावर मैप",
  "site.ext.mermaid.desc.powermap": "रिपोर्टिंग ट्री पर हितधारक: भूमिका, प्रभाव, कार्रवाई की ज़रूरत और रुख, साथ में कंपनी का समकक्ष। फ़ोटो या छाया, संकेत, और supporter तथा enemy जैसे नाम वाले तीर।",
  "site.ext.mermaid.syntax.powermap": "powermap नक्शा खोलता है। company कंपनी है, legend on|off चित्र के नीचे संकेत है (केवल link शैलियाँ), lang hi उसकी भाषा है। avatar 48 या avatar off फ़ोटो बॉक्स है। व्यक्ति id [नाम|पद] है, role, influence, action, attitude, counterpart, gender और photo के साथ। -> और -.-> रिपोर्टिंग हैं। link नाम color=#hex style=solid|dash|dot|dashdot label=पाठ शैली बनाता है; यह label केवल संकेत में है। A -नाम-> B बिना पाठ का तीर है, A -नाम-> B label=पाठ उसी तीर पर पाठ लिखता है।",
  "site.ext.mermaid.type.histogram": "हिस्टोग्राम",
  "site.ext.mermaid.desc.histogram": "बिन के अनुसार गिनती या घनत्व, फिट या दी गई वितरण वक्र, माध्य, माध्यिका और विश्वास अंतराल के साथ।",
  "site.ext.mermaid.syntax.histogram": "histogram चार्ट खोलता है (उपनाम hist और dist)। series नाम : v1, v2, … एक नमूना है। खाली सेल, na, n/a, null, none, nan, -, — या . कमी है। bins auto, bins N, binwidth W या bins a --> b, b --> c अंतराल तय करते हैं। scale count या scale density ऊँचाई तय करता है। fit normal वक्र अनुमानित करता है, curve weibull shape=1.6 scale=28 दिए पैरामीटर खींचता है। stats में mean median sd var ci हैं, ci 0.95 माध्य का अंतराल है। labels, gap, colors, mono, rotate 90, fontsize, ratio, grid, axis और line series जैसे हैं।",
} as const satisfies LocaleMessages;
