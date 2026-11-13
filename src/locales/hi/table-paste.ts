import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "क्लिपबोर्ड से तालिका चिपकाएँ",
  "editor.pasteTableHistory": "तालिका चिपकाएँ",
  "tablePaste.modalTitle": "क्लिपबोर्ड से तालिका नहीं चिपकाई जा सकी",
  "tablePaste.reasonLabel": "क्या गड़बड़ हुई",
  "tablePaste.expectedLabel": "अपेक्षित तालिका प्रारूप ({type})",
  "tablePaste.columnsLabel": "स्तंभ:",
  "tablePaste.rulesLabel": "रूपांतरण नियम:",
  "tablePaste.sampleLabel": "कॉपी करने के लिए नमूना तालिका (Excel / Google Sheets / TSV):",
  "tablePaste.error.emptyClipboard":
    "क्लिपबोर्ड खाली है। Excel या Google Sheets से कक्षों की एक सीमा कॉपी करें, या टैब/अर्धविराम से अलग तालिका।",
  "tablePaste.error.clipboardReadFailed":
    "क्लिपबोर्ड पढ़ा नहीं जा सका। ब्राउज़र में क्लिपबोर्ड अनुमति दें और फिर कोशिश करें।",
  "tablePaste.error.notATable":
    "क्लिपबोर्ड सामग्री तालिका नहीं है (टैब, ';' या '|' से अलग कम से कम 2 स्तंभ अपेक्षित)।",
  "tablePaste.error.tooManyColumns":
    "स्तंभ बहुत अधिक हैं: क्लिपबोर्ड में {actual} मिले, पर इस आरेख को {expected} चाहिए।",
  "tablePaste.error.tooFewColumns":
    "स्तंभ बहुत कम हैं: क्लिपबोर्ड में {actual} मिले, पर इस आरेख को {expected} चाहिए।",
  "tablePaste.error.tooFewColumnsMin":
    "स्तंभ बहुत कम हैं: क्लिपबोर्ड में {actual} मिले, पर कम से कम {min} आवश्यक हैं।",
  "tablePaste.error.tooFewRowsMin":
    "पंक्तियाँ बहुत कम हैं: क्लिपबोर्ड में {actual} मिलीं, पर कम से कम {min} पंक्तियाँ आवश्यक हैं।",
  "tablePaste.error.expectedColumnRange":
    "स्तंभ संख्या अमान्य है: क्लिपबोर्ड में {actual} मिले, {min} और {max} स्तंभों के बीच अपेक्षित।",
  "tablePaste.error.waterfallColumns":
    "2 स्तंभ अपेक्षित: एक में पाठ लेबल और एक में संख्याएँ (या '=' योग के लिए खाली कक्ष)।",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "पहली डेटा पंक्ति (पंक्ति {row}) में आरंभिक संख्यात्मक मान ('=number') होना चाहिए, खाली कक्ष नहीं।",
  "tablePaste.error.noNumericColumn":
    "किसी भी स्तंभ में संख्यात्मक मान नहीं हैं।",
  "tablePaste.error.invalidNumberAtRow":
    "पंक्ति {row}: मान \"{value}\" मान्य संख्या नहीं है।",
  "tablePaste.error.negativeNotAllowedAtRow":
    "पंक्ति {row}: ऋणात्मक मान \"{value}\" पाई चार्ट में अनुमत नहीं है।",
  "tablePaste.error.noDataRows":
    "कॉपी की गई तालिका में कोई डेटा पंक्ति नहीं है।",
  "tablePaste.type.waterfall": "वॉटरफ़ॉल",
  "tablePaste.type.pie": "पाई चार्ट",
  "tablePaste.type.heatmap": "हीटमैप",
  "tablePaste.type.bubble": "बबल चार्ट",
  "tablePaste.type.ev": "अर्जित मूल्य (EV)",
  "tablePaste.type.boxplot": "बॉक्स प्लॉट",
  "tablePaste.type.treemap": "ट्री मैप",
  "tablePaste.type.radar": "रडार चार्ट",
  "tablePaste.type.voronoi": "वोरोनोई आरेख",
  "tablePaste.type.clustered": "शृंखला चार्ट",
  "tablePaste.type.xychart": "XY चार्ट (बार / रेखा)",
  "tablePaste.type.quadrant": "क्वाड्रंट चार्ट",
  "tablePaste.type.sankey": "सैन्की आरेख",
  "tablePaste.type.orgchart": "संगठन चार्ट",
  "tablePaste.type.gantt": "गैंट चार्ट",
  "tablePaste.type.timeline": "समयरेखा",
  "tablePaste.type.journey": "उपयोगकर्ता यात्रा",
  "tablePaste.type.packet": "पैकेट हेडर",
  "tablePaste.type.wbs": "कार्य विखंडन (WBS)",
  "tablePaste.type.mindmap": "माइंडमैप",
  "tablePaste.type.nwdiag": "नेटवर्क आरेख (Nwdiag)",
  "tablePaste.type.wireframe": "WireMark तालिका",
  "tablePaste.expected.waterfall.columns":
    "किसी भी क्रम में 2 स्तंभ: 'लेबल' और 'मान' (या 'मान' और 'लेबल')।",
  "tablePaste.expected.waterfall.rules":
    "पहली संख्या आरंभिक बार बनती है (=N), धनात्मक संख्याएँ वृद्धि (+N), ऋणात्मक संख्याएँ कमी (-N), और खाली कक्ष (या '=') चल योग बनता है (= : लेबल)।",
  "tablePaste.expected.waterfall.headers": "लेबल|मान",
  "tablePaste.expected.pie.columns":
    "किसी भी क्रम में 2 स्तंभ: 'श्रेणी' और 'ऋणात्मक नहीं संख्या'।",
  "tablePaste.expected.pie.rules":
    "हर पंक्ति एक स्लाइस बनती है: \"श्रेणी\" : मान।",
  "tablePaste.expected.pie.headers": "श्रेणी|हिस्सा",
  "tablePaste.expected.heatmap.columns":
    "कम से कम 2×2 मैट्रिक्स: पहली पंक्ति में X स्तंभ शीर्षक, पहले स्तंभ में Y पंक्ति लेबल, अंदर के कक्षों में संख्याएँ (या खाली कक्ष)।",
  "tablePaste.expected.heatmap.rules":
    "x और y पंक्तियाँ स्केल ब्लॉक से पहले डाली जाती हैं। स्केल न हो तो न्यूनतम से अधिकतम तक का स्केल जोड़ा जाता है, नीले से लाल। खाली कक्ष null स्थान बनते हैं।",
  "tablePaste.expected.heatmap.headers": "अवधि|सोम|मंगल|बुध",
  "tablePaste.expected.bubble.columns":
    "4 या 5 स्तंभ: 'लेबल', 'X (संख्या)', 'Y (संख्या)', 'आकार (संख्या)', ['समूह (वैकल्पिक)']।",
  "tablePaste.expected.bubble.rules":
    "हर पंक्ति एक बबल बिंदु बनती है: लेबल : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "उत्पाद|X|Y|आकार|समूह",
  "tablePaste.expected.ev.columns":
    "4 स्तंभ: 'अवधि (दिन)', 'PV (नियोजित)', 'EV (अर्जित)', 'AC (वास्तविक)' (या 4 पंक्तियाँ: days, pv, ev, ac)।",
  "tablePaste.expected.ev.rules":
    "अर्जित मूल्य चार्ट के लिए days, pv, ev और ac शृंखलाएँ बनाता है।",
  "tablePaste.expected.ev.headers": "अवधि|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 स्तंभ ('श्रेणी', 'न्यूनतम', 'Q1', 'माध्यिका', 'Q3', 'अधिकतम') या कच्चे अवलोकनों के 4+ स्तंभ ('श्रेणी', 'नमूना 1', 'नमूना 2', 'नमूना 3'...)।",
  "tablePaste.expected.boxplot.rules":
    "पाँच-संख्या सारांश के लिए min=..., q1=..., median=..., q3=..., max=... बनाता है, या कच्चे नमूना अवलोकनों के लिए values=...।",
  "tablePaste.expected.boxplot.headers": "श्रेणी|न्यूनतम|Q1|माध्यिका|Q3|अधिकतम",
  "tablePaste.expected.treemap.columns":
    "2 से 4 स्तंभ: 'आइटम | भार' या 'समूह | आइटम | भार [| रंग]'।",
  "tablePaste.expected.treemap.rules":
    "पदानुक्रमित ब्लॉक 'समूह / आइटम : भार' बनाता है (भार > 0 होना चाहिए)।",
  "tablePaste.expected.treemap.headers": "समूह|आइटम|भार",
  "tablePaste.expected.radar.columns":
    "कम से कम 4 स्तंभों की मैट्रिक्स: पहली पंक्ति में अक्ष नाम (कम से कम 3 अक्ष), पहले स्तंभ में शृंखला नाम, अंदर के कक्षों में संख्याएँ।",
  "tablePaste.expected.radar.rules":
    "शीर्षक पंक्ति से axes निर्देश और 'series नाम : v1, v2, ...' पंक्तियाँ बनाता है।",
  "tablePaste.expected.radar.headers": "शृंखला|गति|विश्वसनीयता|उपयोगिता|सुरक्षा",
  "tablePaste.expected.voronoi.columns":
    "3 से 5 स्तंभ: 'साइट', 'X (संख्या)', 'Y (संख्या)', ['समूह'], ['रंग']।",
  "tablePaste.expected.voronoi.rules":
    "हर पंक्ति एक वोरोनोई साइट बनती है: साइट : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "साइट|X|Y|समूह",
  "tablePaste.expected.clustered.columns":
    "कम से कम 2×2 मैट्रिक्स: पहले स्तंभ में श्रेणियाँ, पहली पंक्ति में शृंखला नाम (या जब शीर्षक 'शृंखला' से शुरू हो तो पक्षांतरित)।",
  "tablePaste.expected.clustered.rules":
    "rotate 90, invert y और color निर्देश रखते हुए categories और series पंक्तियाँ बनाता है।",
  "tablePaste.expected.clustered.headers": "श्रेणी|उत्तर|दक्षिण|निर्यात",
  "tablePaste.expected.xychart.columns":
    "1 या अधिक स्तंभ। एक स्तंभ bar [मान 1, ..., मान n] के लिए संख्याएँ हैं। दो स्तंभ 'X श्रेणी' और 'बार मान' हैं। तीन या अधिक 'X श्रेणी' और हर अतिरिक्त स्तंभ के लिए एक बार शृंखला हैं।",
  "tablePaste.expected.xychart.rules":
    "एक स्तंभ मौजूदा bar [values] पंक्तियाँ बदलता है। दो या अधिक स्तंभ x-axis और सभी bar पंक्तियाँ बदलते हैं, हर मान स्तंभ के लिए एक bar [...] शृंखला। यदि चार्ट में अभी y-axis नहीं है, तो y-axis \"\" min --> max जोड़ा जाता है।",
  "tablePaste.expected.xychart.headers": "माह|योजना|वास्तविक|पूर्वानुमान",
  "tablePaste.expected.quadrant.columns":
    "3 स्तंभ: 'बिंदु लेबल', 'X (0..1 या 0..100%)', 'Y (0..1 या 0..100%)'।",
  "tablePaste.expected.quadrant.rules":
    "1 से बड़े निर्देशांक प्रतिशत (0..100) से स्वतः [0..1] में सामान्यीकृत होते हैं।",
  "tablePaste.expected.quadrant.headers": "आइटम|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 स्तंभ: 'स्रोत', 'लक्ष्य', 'प्रवाह मान (संख्या)'।",
  "tablePaste.expected.sankey.rules":
    "हर पंक्ति एक प्रवाह पंक्ति बनती है: स्रोत,लक्ष्य,मान।",
  "tablePaste.expected.sankey.headers": "स्रोत|लक्ष्य|प्रवाह",
  "tablePaste.expected.orgchart.columns":
    "2 या 3 स्तंभ: 'प्रबंधक', 'प्रत्यक्ष रिपोर्ट', ['किनारा शैली (बिंदुयुक्त) या पद']।",
  "tablePaste.expected.orgchart.rules":
    "संगठन चार्ट नोड और ठोस (->) या बिंदुयुक्त (-.->) रिपोर्टिंग रेखाएँ बनाता है।",
  "tablePaste.expected.orgchart.headers": "प्रबंधक|रिपोर्ट|कड़ी",
  "tablePaste.expected.gantt.columns":
    "2 से 4 स्तंभ: 'कार्य', 'आरंभ दिनांक या अवधि', ['अवधि (5d)'], ['अनुभाग']।",
  "tablePaste.expected.gantt.rules":
    "गैंट कार्य पंक्तियाँ बनाता है (Mermaid में अनुभाग के अनुसार समूहित)।",
  "tablePaste.expected.gantt.headers": "कार्य|आरंभ|अवधि|अनुभाग",
  "tablePaste.expected.timeline.columns":
    "2 या 3 स्तंभ: 'अवधि / दिनांक', 'घटना', ['अनुभाग (वैकल्पिक)']।",
  "tablePaste.expected.timeline.rules":
    "हर पंक्ति एक समयरेखा प्रविष्टि बनती है 'अवधि : घटना'।",
  "tablePaste.expected.timeline.headers": "अवधि|घटना|अनुभाग",
  "tablePaste.expected.journey.columns":
    "2 से 4 स्तंभ: 'चरण', 'स्कोर (1–5)', ['ऐक्टर'], ['अनुभाग']।",
  "tablePaste.expected.journey.rules":
    "उपयोगकर्ता यात्रा चरण 'चरण: स्कोर: ऐक्टर' बनाता है।",
  "tablePaste.expected.journey.headers": "चरण|स्कोर|ऐक्टर|अनुभाग",
  "tablePaste.expected.packet.columns":
    "किसी भी क्रम में 2 स्तंभ: 'बिट सीमा (0-15) या बिट लंबाई (16)' और 'फ़ील्ड नाम'।",
  "tablePaste.expected.packet.rules":
    "पैकेट फ़ील्ड '0-15: \"फ़ील्ड\"' बनाता है (बिट लंबाइयाँ स्वतः सीमाओं में जुड़ती हैं)।",
  "tablePaste.expected.packet.headers": "बिट|फ़ील्ड",
  "tablePaste.expected.wbs.columns":
    "पदानुक्रम स्तरों को दर्शाने वाले 2 या अधिक स्तंभ: 'स्तर 1 (मूल)', 'स्तर 2', 'स्तर 3', इत्यादि।",
  "tablePaste.expected.wbs.rules":
    "WBS वृक्ष (*, **, ***) बनाता है और समान अभिभावक कक्षों को स्वतः समूहित करता है।",
  "tablePaste.expected.wbs.headers": "स्तर 1|स्तर 2|स्तर 3",
  "tablePaste.expected.mindmap.columns":
    "वृक्ष गहराई दर्शाने वाले 2 या अधिक स्तंभ: 'मूल', 'शाखा', 'उप-शाखा', इत्यादि।",
  "tablePaste.expected.mindmap.rules":
    "समान अभिभावकों को मिलाकर माइंडमैप वृक्ष बनाता है। चिपकाए गए नोड हर मैप नोड को बदल देते हैं। लेजेंड, शीर्षक, हेडर, फ़ुटर, कैप्शन, शैली और टिप्पणियाँ रहती हैं।",
  "tablePaste.expected.mindmap.headers": "मूल|शाखा|पत्ती",
  "tablePaste.expected.nwdiag.columns":
    "2 या 3 स्तंभ: 'नोड', 'IP पता', ['नेटवर्क (वैकल्पिक)']।",
  "tablePaste.expected.nwdiag.rules":
    "नोडों को नेटवर्क के अनुसार network { node [address = \"...\"] } ब्लॉकों में समूहित करता है।",
  "tablePaste.expected.nwdiag.headers": "नोड|IP पता|नेटवर्क",
  "tablePaste.expected.wireframe.columns":
    "कम से कम 2 स्तंभों वाली कोई भी तालिका (पहली पंक्ति शीर्षक है, शेष पंक्तियाँ मुख्य भाग हैं)।",
  "tablePaste.expected.wireframe.rules":
    "TableHead और TableBody वाला WireMark Table घटक बनाता है (संख्यात्मक स्तंभ दाएँ संरेखित होते हैं)।",
  "tablePaste.expected.wireframe.headers": "नाम|लेखक|स्थिति|दृश्य",
  "tablePaste.type.histogram": "हिस्टोग्राम",
  "tablePaste.expected.histogram.columns": "हर स्तंभ एक शृंखला है। पहली पंक्ति नाम हो सकती है। खाली सेल, na और गलत मान ज्यों के त्यों रहते हैं।",
  "tablePaste.expected.histogram.rules": "हर स्तंभ series नाम : v1, v2, … बनता है। खाली और गैर-संख्या missing, errors और outliers के लिए रहती हैं।",
  "tablePaste.expected.histogram.headers": "सुबह|शाम",
} as const satisfies LocaleMessages;
