import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "WireMark गाइड के स्क्रीन प्रकार: एक फ़्रेम, ऐप शेल, फ़ॉर्म, सेटिंग्स सूची, कार्ड, प्रवाह और साझा क्रोम।",
  "site.wiremark.keywordsLead":
    "WireMark गाइड के कीवर्ड: फ़्रेम मूल, लेआउट, पाठ, घटक और पंक्ति नियम। पूरी घटक सूची और आइकन गैलरी दस्तावेज़ों में है।",
  "site.wiremark.docsComponents": "घटक संदर्भ",
  "site.wiremark.docsIcons": "आइकन गैलरी",

  "site.wiremark.type.login.title": "साइन-इन स्क्रीन",
  "site.wiremark.type.login.text":
    "फ़ोन फ़्रेम। टैब, आइकन फ़ील्ड, सूचना चेतावनी, और to=#id से दूसरा फ़्रेम खोलने वाला भरा पूर्ण-चौड़ाई बटन।",
  "site.wiremark.type.dashboard.title": "ऐप शेल",
  "site.wiremark.type.dashboard.text":
    "लैंडस्केप फ़्रेम: मेनू बार, सघन ऐप बार, डॉक किया ड्रॉअर, चार्ट कार्ड और स्क्रॉलबार वाली तालिका।",
  "site.wiremark.type.form.title": "फ़ॉर्म",
  "site.wiremark.type.form.text":
    "लंबा फ़्रेम। चरण, आवश्यक फ़ील्ड, value=, बहुपंक्ति क्षेत्र, चयन, स्लाइडर, रेटिंग, कैलेंडर और सहमति चेकबॉक्स।",
  "site.wiremark.type.settings.title": "सेटिंग्स सूची",
  "site.wiremark.type.settings.text":
    "ऐप बार, त्रुटि चेतावनी, to=#id वाली पंक्तियों की सूची, अकॉर्डियन, नीचे नेविगेशन और पुष्टि संवाद।",
  "site.wiremark.type.product.title": "उत्पाद कार्ड",
  "site.wiremark.type.product.text":
    "चौड़ा कार्ड। Img ratio=16:9 उपयोग करता है, फिर चिप्स, मानचित्र, विनिर्देश तालिका और बटन समूह वाला CardActions।",
  "site.wiremark.type.flow.title": "स्क्रीन प्रवाह",
  "site.wiremark.type.flow.text":
    "Flow LR दो स्क्रीन जोड़ता है। छिपा शेल (visible=false) background=#id से खींचा जाता है, और सामग्री Anchor #content में रहती है। Icons एक कस्टम चिह्न घोषित करता है।",
  "site.wiremark.type.chrome.title": "साझा क्रोम",
  "site.wiremark.type.chrome.text":
    "visible=false वाला शेल अपने आप नहीं बनता। अन्य फ़्रेम उसे background=#id से खींचते हैं और अपनी सामग्री anchor=#id वाले Anchor क्षेत्र में रखते हैं।",

  "site.wiremark.group.frame": "फ़्रेम और प्रवाह",
  "site.wiremark.group.layout": "लेआउट",
  "site.wiremark.group.text": "पाठ और भराव",
  "site.wiremark.group.ui": "स्क्रीन घटक",
  "site.wiremark.group.syntax": "सिंटैक्स",

  "site.wiremark.keyword.wireframe":
    "स्क्रीन का मूल। उसके नीचे इंडेंट सब कुछ उसी स्क्रीन पर है। #id जोड़ें ताकि अन्य फ़्रेम यहाँ लिंक कर सकें, साथ में आकार प्रीसेट या w= और h= दोनों।",
  "site.wiremark.keyword.frameId":
    "Wireframe पर फ़्रेम का नाम, या Anchor पर क्षेत्र का नाम। to= और background=#id केवल फ़्रेम से मेल खाते हैं। anchor= केवल क्षेत्रों से मेल खाता है।",
  "site.wiremark.keyword.mobile": "Wireframe मूल पर फ़ोन-चौड़ाई आकार प्रीसेट।",
  "site.wiremark.keyword.landscape":
    "चौड़ा आकार प्रीसेट। ऐप शेल या डैशबोर्ड के लिए उपयोग करें।",
  "site.wiremark.keyword.portrait": "Wireframe मूल पर लंबा आकार प्रीसेट।",
  "site.wiremark.keyword.frameSize":
    "कस्टम फ़्रेम आकार। Wireframe मूल पर w= और h= दोनों सेट करें। जब anchor= फ़्रेम का आकार तय करे तो प्रीसेट बंद रखें।",
  "site.wiremark.keyword.visible":
    "visible=false फ़्रेम को प्रवाह चार्ट से छिपाता है और उसे background= लक्ष्य के रूप में रहने देता है। डिफ़ॉल्ट दृश्यमान है।",
  "site.wiremark.keyword.frameBackground":
    "Wireframe पर background=#id दूसरे फ़्रेम को नीचे रंगता है। साधारण तत्व पर background= एक हैच है: hatch, crosshatch या none।",
  "site.wiremark.keyword.anchor":
    "शेल के अंदर अदृश्य क्षेत्र। बिना आकार के यह बची जगह भरता है। #id दें ताकि अग्रभूमि फ़्रेम इसे लक्षित कर सके।",
  "site.wiremark.keyword.anchorAt":
    "अग्रभूमि फ़्रेम को उसकी पृष्ठभूमि के एक क्षेत्र में रखता है। उपनाम at= है। उस फ़्रेम पर प्रीसेट या w=/h= न जोड़ें। एंकर जीतता है।",
  "site.wiremark.keyword.flow":
    "शीर्ष-स्तरीय निर्देश, फ़्रेम के अंदर नहीं। Flow TD ऊपर से नीचे है और डिफ़ॉल्ट है। Flow LR बाएँ से दाएँ चलता है।",
  "site.wiremark.keyword.to":
    "किसी भी तत्व पर to=#id उस तत्व को एक फ़्रेम से जोड़ता है। नेविगेशन ग्राफ़ इन्हीं कड़ियों से बनता है। उपनाम href= है। लक्ष्य केवल फ़्रेम हैं।",
  "site.wiremark.keyword.stack":
    "बच्चों को एक अक्ष पर पंक्तिबद्ध करता है। डिफ़ॉल्ट दिशा column है। gap= (spacing= का उपनाम) उनके बीच की जगह तय करता है। खाली Stack स्वयं कुछ नहीं बनाता।",
  "site.wiremark.keyword.column":
    "बिना-कुंजी Stack दिशा। बच्चे ऊपर से नीचे जमते हैं। column-reverse वह क्रम उलट देता है।",
  "site.wiremark.keyword.row":
    "बिना-कुंजी Stack दिशा। बच्चे बाएँ से दाएँ चलते हैं। row-reverse वह क्रम उलट देता है।",
  "site.wiremark.keyword.gap":
    "spacing= का उपनाम। बच्चों के बीच अंतर, स्पेसिंग इकाइयों में। gap=2 लिखें। उद्धृत संख्या त्रुटि है।",
  "site.wiremark.keyword.box":
    "सामान्य कंटेनर। बिना-कुंजी टोकन चौड़ाई, फिर ऊँचाई हैं: Box 240px *। outline (solid, dashed, dotted) और elevation= दृश्य पैनल बनाते हैं।",
  "site.wiremark.keyword.grid":
    "समान ग्रिड। बच्चे कक्षों में बहते हैं। cols= स्तंभों की संख्या तय करता है, gap= अंतर तय करता है।",
  "site.wiremark.keyword.cols": "Grid पर स्तंभ संख्या। केवल कुंजी के साथ: cols=3।",
  "site.wiremark.keyword.spacer":
    "लचीला अंतर जो अपने भाई-बहनों को स्टैक के साथ-साथ दूर धकेलता है।",
  "site.wiremark.keyword.divider":
    "बिना गुणों वाली क्षैतिज रेखा। Stack पर खाली फ़्लैग divider हर अंतर में रेखा बनाता है।",
  "site.wiremark.keyword.sizing":
    "स्थितीय आकार: चौड़ाई, फिर ऊँचाई। 240px पिक्सेल है, 30% खाली जगह का हिस्सा है, * उस अक्ष को भरता है, और खाली संख्या फ़्लेक्स भार है। कुंजी वाला width= अस्वीकार होता है।",
  "site.wiremark.keyword.typography":
    "पाठ पत्ता। उद्धृत स्ट्रिंग स्क्रीन के शब्द हैं। बिना पाठ के खाली Typography भराव की एक पंक्ति बनाती है।",
  "site.wiremark.keyword.typeVariant":
    "बिना-कुंजी पाठ भूमिका: h1–h6, subtitle1, subtitle2, body1 (डिफ़ॉल्ट), body2, caption, overline या button। शीर्षक h1–h6 मोटे हैं। caption मंद है।",
  "site.wiremark.keyword.textField":
    "पाठ इनपुट। उद्धृत स्ट्रिंग लेबल है। प्रकार outlined (डिफ़ॉल्ट), filled और standard हैं।",
  "site.wiremark.keyword.fillerAmount":
    "वास्तविक लेबल न हो तो कितना प्लेसहोल्डर पाठ बनाएँ। ~3 लगभग तीन पंक्तियाँ, ~5w लगभग पाँच शब्द, ~2l लगभग दो पंक्तियाँ। _, __ और ___ छोटे, मध्यम और लंबे हैं।",
  "site.wiremark.keyword.fillerStyle":
    "प्लेसहोल्डर पाठ का रूप: squiggle (डिफ़ॉल्ट), lorem या blocks। इसे Wireframe मूल पर या एक पाठ तत्व पर सेट करें। यह रंग नहीं बदलता।",
  "site.wiremark.keyword.required":
    "बूलियन फ़्लैग। TextField पर यह लेबल के बाद * जोड़ता है।",
  "site.wiremark.keyword.value":
    "फ़ील्ड के अंदर कुंजी वाला पाठ। खाली उद्धृत स्ट्रिंग लेबल है, इसलिए सामग्री value=\"...\" होनी चाहिए।",
  "site.wiremark.keyword.multiline":
    "बूलियन फ़्लैग। यह TextField को पाठ क्षेत्र बनाता है। rows=4 ऊँचाई सेट करता है। rows के बिना बहुपंक्ति फ़ील्ड 3 पंक्ति ऊँची होती है।",
  "site.wiremark.keyword.noWrap":
    "Typography पर बूलियन फ़्लैग। पंक्ति एकल रहती है और अतिप्रवाह अंत में दीर्घवृत्त से कटता है।",
  "site.wiremark.keyword.button":
    "एक क्रिया। उद्धृत स्ट्रिंग लेबल है। खाली Button, Button पढ़ता है। प्रकार text (डिफ़ॉल्ट), outlined और contained हैं।",
  "site.wiremark.keyword.contained":
    "बिना-कुंजी Button प्रकार: भरी हैच, मुख्य क्रिया। कोई primary कीवर्ड नहीं है।",
  "site.wiremark.keyword.outlined":
    "बिना-कुंजी प्रकार। Button पर यह बिना भराव की सीमा है। TextField पर outlined डिफ़ॉल्ट क्रोम है।",
  "site.wiremark.keyword.link":
    "इनलाइन पाठ लिंक। उद्धृत स्ट्रिंग लेबल है। to=#id एक फ़्रेम पर ले जाता है।",
  "site.wiremark.keyword.list":
    "ListItem पंक्तियों का ऊर्ध्वाधर स्टैक। dense पंक्तियाँ सघन करता है। subheader= छोटा शीर्षक जोड़ता है।",
  "site.wiremark.keyword.listItem":
    "एक पंक्ति। उद्धृत स्ट्रिंग लेबल है। to=#id पंक्ति को लिंक बनाता है। ListItem बच्चे नहीं लेता।",
  "site.wiremark.keyword.appBar":
    "स्क्रीन के ऊपर की पट्टी। यह आमतौर पर Toolbar को लपेटती है।",
  "site.wiremark.keyword.toolbar":
    "AppBar के अंदर क्षैतिज पंक्ति: शीर्षक, आइकन और क्रियाएँ।",
  "site.wiremark.keyword.icon":
    "एक Material ग्लिफ़। Icon Search और Icon \"Search\" एक ही नाम हैं। अज्ञात नाम प्लेसहोल्डर बनाता है और चेतावनी देता है। fontSize= या size= small, medium या large है।",
  "site.wiremark.keyword.startIcon":
    "लेबल से पहले बना कुंजी वाला आइकन नाम: startIcon=Email। endIcon= लेबल के बाद बनता है। गुण नाम को उद्धृत न करें।",
  "site.wiremark.keyword.iconsBlock":
    "शीर्ष-स्तरीय Icons ब्लॉक, फ़्रेमों के बगल में, किसी के अंदर नहीं। हर प्रविष्टि एक नाम और SVG पथ डेटा है। दस्तावेज़ आइकन उसी नाम के अंतर्निहित आइकन को बदल देता है।",
  "site.wiremark.keyword.card":
    "एक सतह। CardContent के बिना बच्चे मुख्य भाग हैं। to=#id पूरे कार्ड को लिंक बनाता है।",
  "site.wiremark.keyword.cardContent":
    "Card का पाठ क्षेत्र जब हेडर, मीडिया और क्रियाएँ अलग हों।",
  "site.wiremark.keyword.cardActions": "Card के नीचे बटन पंक्ति।",
  "site.wiremark.keyword.img":
    "चित्र के लिए क्रॉस किया प्लेसहोल्डर। ratio=16:9 पक्षानुपात सेट करता है। src= मेटाडेटा है। स्केच फिर भी प्लेसहोल्डर बनाता है।",
  "site.wiremark.keyword.control":
    "चेकबॉक्स, रेडियो या स्विच। Control checkbox डिफ़ॉल्ट है। checked इसे चालू करता है। Control radio और Control switch दूसरे ग्लिफ़ चुनते हैं।",
  "site.wiremark.keyword.indent":
    "इंडेंटेशन समावेश है। प्रति स्तर दो स्पेस, केवल स्पेस। गहरी पंक्ति बच्चा है। टैब त्रुटि है।",
  "site.wiremark.keyword.quotes":
    "उद्धृत स्ट्रिंग वह पाठ है जो बनता है, और उद्धरण आवश्यक हैं। खाली शब्द एक सेटिंग है: एनम, फ़्लैग, संख्या, आकार या आइकन नाम। एनम या संख्या को कभी उद्धृत न करें।",
  "site.wiremark.keyword.keyed":
    "key=value एक नामित गुण सेट करता है। बिना-कुंजी मान कुंजी छोड़ देता है और अपने प्रकार से चुना जाता है। क्रम मुक्त है, आकार के लिए चौड़ाई फिर ऊँचाई को छोड़कर।",
  "site.wiremark.keyword.comment":
    "// टिप्पणियाँ पंक्ति के अंत तक चलती हैं। # एंकर शुरू करता है, इसलिए यह टिप्पणी नहीं है।",
} as const satisfies LocaleMessages;
