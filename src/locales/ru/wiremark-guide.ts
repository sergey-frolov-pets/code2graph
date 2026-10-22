import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "Виды экранов из руководств WireMark: один кадр, оболочка приложения, форма, список настроек, карточка, поток и общий каркас.",
  "site.wiremark.keywordsLead":
    "Ключевые слова из руководств WireMark: корень кадра, раскладка, текст, компоненты и правила строки. Полный список компонентов и галерея иконок — в документации.",
  "site.wiremark.docsComponents": "Справочник компонентов",
  "site.wiremark.docsIcons": "Галерея иконок",

  "site.wiremark.type.login.title": "Экран входа",
  "site.wiremark.type.login.text":
    "Телефонный кадр. В колонке заголовок, поля и залитая кнопка, которая открывает другой кадр через to=#id. Это вайрфрейм с главной страницы документации WireMark.",
  "site.wiremark.type.dashboard.title": "Оболочка приложения",
  "site.wiremark.type.dashboard.text":
    "Широкий кадр: шапка, рельс меню фиксированной ширины и сетка карточек в оставшемся месте. Размеры задают токены вроде 240px и *.",
  "site.wiremark.type.form.title": "Форма",
  "site.wiremark.type.form.text":
    "Колонка полей. required помечает обязательное поле, value= показывает уже введённый текст, multiline растягивает поле в несколько строк, а Control checkbox — это строка согласия.",
  "site.wiremark.type.settings.title": "Список настроек",
  "site.wiremark.type.settings.text":
    "Шапка над списком List. У каждого ListItem есть to=#id, поэтому строка ведёт на свой экран.",
  "site.wiremark.type.product.title": "Карточка",
  "site.wiremark.type.product.text":
    "Card с картинкой Img, блоком CardContent для названия и заполнителя и рядом кнопок CardActions. ratio=16:9 задаёт пропорции картинки.",
  "site.wiremark.type.flow.title": "Поток экранов",
  "site.wiremark.type.flow.text":
    "Несколько кадров Wireframe в одном документе. Flow LR или Flow TD задаёт направление. Стрелки строятся из to=#id. Отдельного from нет.",
  "site.wiremark.type.chrome.title": "Общая оболочка",
  "site.wiremark.type.chrome.text":
    "Каркас с visible=false сам по себе не рисуется. Другие кадры подключают его через background=#id и кладут своё содержимое в область Anchor свойством anchor=#id.",

  "site.wiremark.group.frame": "Кадр и поток",
  "site.wiremark.group.layout": "Раскладка",
  "site.wiremark.group.text": "Текст и заполнитель",
  "site.wiremark.group.ui": "Компоненты экрана",
  "site.wiremark.group.syntax": "Синтаксис",

  "site.wiremark.keyword.wireframe":
    "Корень экрана. Всё, что сдвинуто под ним, лежит на этом экране. Добавьте #id, чтобы на кадр можно было сослаться, и пресет размера либо сразу w= и h=.",
  "site.wiremark.keyword.frameId":
    "Имя кадра на Wireframe или области на Anchor. to= и background=#id находят только кадры. anchor= находит только области.",
  "site.wiremark.keyword.mobile": "Пресет ширины телефона на корне Wireframe.",
  "site.wiremark.keyword.landscape":
    "Широкий пресет. Подходит для оболочки приложения и дашборда.",
  "site.wiremark.keyword.portrait": "Высокий пресет на корне Wireframe.",
  "site.wiremark.keyword.frameSize":
    "Свой размер кадра. На корне Wireframe задают оба размера: w= и h=. Если размер даёт anchor=, пресет не пишут.",
  "site.wiremark.keyword.visible":
    "visible=false прячет кадр с потока, но оставляет его целью для background=. По умолчанию кадр видим.",
  "site.wiremark.keyword.frameBackground":
    "На Wireframe свойство background=#id подкладывает другой кадр снизу. На обычном элементе background= — это штриховка: hatch, crosshatch или none.",
  "site.wiremark.keyword.anchor":
    "Невидимая область внутри каркаса. Без размера она занимает оставшееся место. Имя #id нужно, чтобы передний кадр мог в неё встать.",
  "site.wiremark.keyword.anchorAt":
    "Ставит передний кадр внутрь области его фона. Псевдоним — at=. Пресет и w=/h= на этом кадре не добавляют: размер берёт якорь.",
  "site.wiremark.keyword.flow":
    "Директива на верхнем уровне, не внутри кадра. Flow TD — сверху вниз, это направление по умолчанию. Flow LR — слева направо.",
  "site.wiremark.keyword.to":
    "На любом элементе to=#id делает его ссылкой на кадр. Граф переходов собирается из таких ссылок. Псевдоним — href=. Цель — только кадр.",
  "site.wiremark.keyword.stack":
    "Выстраивает детей по одной оси. Направление по умолчанию — column. gap= (псевдоним spacing=) задаёт промежуток. Голый Stack сам ничего не рисует.",
  "site.wiremark.keyword.column":
    "Бесключевое направление Stack. Дети идут сверху вниз. column-reverse переворачивает порядок.",
  "site.wiremark.keyword.row":
    "Бесключевое направление Stack. Дети идут слева направо. row-reverse переворачивает порядок.",
  "site.wiremark.keyword.gap":
    "Псевдоним spacing=. Промежуток между детьми в единицах отступа. Пишут gap=2. Число в кавычках — ошибка.",
  "site.wiremark.keyword.box":
    "Обычный контейнер. Бесключевые токены — ширина, затем высота: Box 240px *. outline (solid, dashed, dotted) и elevation= рисуют видимую панель.",
  "site.wiremark.keyword.grid":
    "Равномерная сетка. Дети заполняют ячейки по порядку. cols= задаёт число колонок, gap= — промежуток.",
  "site.wiremark.keyword.cols": "Число колонок у Grid. Только с ключом: cols=3.",
  "site.wiremark.keyword.spacer":
    "Гибкий промежуток: раздвигает соседей вдоль стека.",
  "site.wiremark.keyword.divider":
    "Горизонтальная линия без свойств. На Stack флаг divider рисует черту в каждом промежутке.",
  "site.wiremark.keyword.sizing":
    "Размер по позиции: сначала ширина, потом высота. 240px — пиксели, 30% — доля свободного места, * заполняет ось, голое число — вес flex. Ключ width= не принимается.",
  "site.wiremark.keyword.typography":
    "Текстовый лист. Строка в кавычках — это слова на экране. Без текста голый Typography рисует одну строку заполнителя.",
  "site.wiremark.keyword.typeVariant":
    "Бесключевая роль текста: h1–h6, subtitle1, subtitle2, body1 (по умолчанию), body2, caption, overline или button. Заголовки h1–h6 жирные. caption приглушён.",
  "site.wiremark.keyword.textField":
    "Поле ввода. Строка в кавычках — подпись. Варианты: outlined (по умолчанию), filled и standard.",
  "site.wiremark.keyword.fillerAmount":
    "Сколько текста-заполнителя рисовать, если настоящей подписи нет. ~3 — около трёх строк, ~5w — около пяти слов, ~2l — около двух строк. _, __ и ___ — коротко, средне и длинно.",
  "site.wiremark.keyword.fillerStyle":
    "Вид заполнителя: squiggle (по умолчанию), lorem или blocks. Задают на корне Wireframe или на одном текстовом элементе. Цвета экрана это не меняет.",
  "site.wiremark.keyword.required":
    "Логический флаг. На TextField добавляет * после подписи.",
  "site.wiremark.keyword.value":
    "Текст внутри поля, только с ключом. Голая строка в кавычках — это подпись, поэтому содержимое пишут как value=\"...\".",
  "site.wiremark.keyword.multiline":
    "Логический флаг. Превращает TextField в многострочное поле. rows=4 задаёт высоту. Без rows у такого поля 3 строки.",
  "site.wiremark.keyword.noWrap":
    "Логический флаг у Typography. Строка остаётся одной, лишнее обрезается многоточием.",
  "site.wiremark.keyword.button":
    "Действие. Строка в кавычках — подпись. Голый Button читается как Button. Варианты: text (по умолчанию), outlined и contained.",
  "site.wiremark.keyword.contained":
    "Бесключевой вариант Button: заливка штриховкой, главное действие. Ключевого слова primary нет.",
  "site.wiremark.keyword.outlined":
    "Бесключевой вариант. У Button это рамка без заливки. У TextField outlined — рамка по умолчанию.",
  "site.wiremark.keyword.link":
    "Текстовая ссылка. Строка в кавычках — подпись. to=#id ведёт на кадр.",
  "site.wiremark.keyword.list":
    "Вертикальный ряд строк ListItem. dense уплотняет строки. subheader= добавляет маленький заголовок.",
  "site.wiremark.keyword.listItem":
    "Одна строка списка. Строка в кавычках — подпись. to=#id делает строку ссылкой. Детей у ListItem нет.",
  "site.wiremark.keyword.appBar":
    "Полоса сверху экрана. Обычно внутри неё лежит Toolbar.",
  "site.wiremark.keyword.toolbar":
    "Горизонтальный ряд внутри AppBar: заголовок, иконки и действия.",
  "site.wiremark.keyword.icon":
    "Один глиф Material. Icon Search и Icon \"Search\" — одно и то же имя. Неизвестное имя рисует заглушку и даёт предупреждение. fontSize= или size= — это small, medium или large.",
  "site.wiremark.keyword.startIcon":
    "Имя иконки перед подписью, только с ключом: startIcon=Email. endIcon= рисует иконку после подписи. Имя свойства в кавычки не берут.",
  "site.wiremark.keyword.iconsBlock":
    "Блок Icons на верхнем уровне, рядом с кадрами, не внутри них. Каждая запись — имя и данные пути SVG. Иконка документа перекрывает встроенную с тем же именем.",
  "site.wiremark.keyword.card":
    "Поверхность. Дети без CardContent становятся телом карточки. to=#id делает ссылкой всю карточку.",
  "site.wiremark.keyword.cardContent":
    "Текстовая область Card, когда шапка, картинка и действия разведены по своим блокам.",
  "site.wiremark.keyword.cardActions": "Ряд кнопок внизу Card.",
  "site.wiremark.keyword.img":
    "Перечёркнутая заглушка картинки. ratio=16:9 задаёт пропорции. src= — только метаданные. На эскизе всё равно заглушка.",
  "site.wiremark.keyword.control":
    "Флажок, радиокнопка или переключатель. Control checkbox — вариант по умолчанию. checked включает его. Control radio и Control switch выбирают другие глифы.",
  "site.wiremark.keyword.indent":
    "Отступ — это вложенность. Два пробела на уровень, только пробелы. Строка глубже — ребёнок. Табуляция — ошибка.",
  "site.wiremark.keyword.quotes":
    "Строка в кавычках — текст, который рисуют, и кавычки обязательны. Голое слово — настройка: перечисление, флаг, число, размер или имя иконки. Перечисление и число в кавычки не берут.",
  "site.wiremark.keyword.keyed":
    "key=value задаёт именованное свойство. Бесключевое значение пишут без ключа, и его узнают по типу. Порядок свободный, кроме ширины и высоты у размера.",
  "site.wiremark.keyword.comment":
    "Комментарий // идёт до конца строки. # начинает якорь, поэтому это не комментарий.",
} as const satisfies LocaleMessages;
