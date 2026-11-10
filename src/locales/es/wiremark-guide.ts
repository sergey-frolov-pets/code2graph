import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "Tipos de pantalla de las guías de WireMark: un marco, un armazón de aplicación, un formulario, una lista de ajustes, una ficha, un flujo y los elementos comunes.",
  "site.wiremark.keywordsLead":
    "Palabras clave de las guías de WireMark: la raíz del marco, la disposición, el texto, los componentes y las reglas de línea. La lista completa de componentes y la galería de iconos están en la documentación.",
  "site.wiremark.docsComponents": "Referencia de componentes",
  "site.wiremark.docsIcons": "Galería de iconos",

  "site.wiremark.type.login.title": "Pantalla de inicio de sesión",
  "site.wiremark.type.login.text":
    "Un marco de teléfono. Pestañas, campos con icono, una alerta informativa y un botón contained de ancho completo que abre otro marco con to=#id.",
  "site.wiremark.type.dashboard.title": "Armazón de la aplicación",
  "site.wiremark.type.dashboard.text":
    "Un marco apaisado: una barra de menú, una barra de aplicación densa, un cajón acoplado, fichas de gráfico y una tabla con barra de desplazamiento.",
  "site.wiremark.type.form.title": "Formulario",
  "site.wiremark.type.form.text":
    "Un marco alto. Pasos, campos obligatorios, value=, un área de varias líneas, un select, un control deslizante, una valoración, un calendario y la casilla del acuerdo.",
  "site.wiremark.type.settings.title": "Lista de ajustes",
  "site.wiremark.type.settings.text":
    "Una barra de aplicación, una alerta de error, una lista de filas con to=#id, un acordeón, navegación inferior y un diálogo de confirmación.",
  "site.wiremark.type.product.title": "Ficha de producto",
  "site.wiremark.type.product.text":
    "Una ficha ancha. Img usa ratio=16:9, luego chips, un mapa, una tabla de especificaciones y CardActions con un grupo de botones.",
  "site.wiremark.type.flow.title": "Flujo de pantallas",
  "site.wiremark.type.flow.text":
    "Flow LR enlaza dos pantallas. Un armazón oculto (visible=false) se incorpora con background=#id, y el contenido va en Anchor #content. Icons declara una marca propia.",
  "site.wiremark.type.chrome.title": "Elementos comunes",
  "site.wiremark.type.chrome.text":
    "Un armazón con visible=false no se dibuja por sí solo. Otros marcos lo incorporan con background=#id y colocan su contenido en una región Anchor con anchor=#id.",

  "site.wiremark.group.frame": "Marco y flujo",
  "site.wiremark.group.layout": "Disposición",
  "site.wiremark.group.text": "Texto y relleno",
  "site.wiremark.group.ui": "Componentes de pantalla",
  "site.wiremark.group.syntax": "Sintaxis",

  "site.wiremark.keyword.wireframe":
    "La raíz de una pantalla. Todo lo que esté sangrado debajo está en esa pantalla. Añada #id para que otros marcos puedan enlazar aquí, más un tamaño predefinido o w= y h= a la vez.",
  "site.wiremark.keyword.frameId":
    "Nombra un marco en Wireframe, o una región en Anchor. to= y background=#id solo coinciden con marcos. anchor= solo coincide con regiones.",
  "site.wiremark.keyword.mobile": "Tamaño predefinido de ancho de teléfono en la raíz Wireframe.",
  "site.wiremark.keyword.landscape":
    "Tamaño predefinido ancho. Úselo para un armazón de aplicación o un panel.",
  "site.wiremark.keyword.portrait": "Tamaño predefinido alto en la raíz Wireframe.",
  "site.wiremark.keyword.frameSize":
    "Tamaño de marco personalizado. En la raíz Wireframe defina w= y h= a la vez. Deje el predefinido desactivado cuando anchor= dimensiona el marco.",
  "site.wiremark.keyword.visible":
    "visible=false oculta un marco del diagrama de flujo y aun así permite usarlo como destino de background=. El valor predeterminado es visible.",
  "site.wiremark.keyword.frameBackground":
    "En un Wireframe, background=#id pinta otro marco debajo. En un elemento normal, background= es un tramado: hatch, crosshatch o none.",
  "site.wiremark.keyword.anchor":
    "Una región invisible dentro de un armazón. Sin tamaño, ocupa el espacio que queda. Déle #id para que un marco de primer plano pueda apuntarla.",
  "site.wiremark.keyword.anchorAt":
    "Coloca un marco de primer plano dentro de una región de su fondo. El alias es at=. No añada un predefinido ni w=/h= en ese marco. Gana el ancla.",
  "site.wiremark.keyword.flow":
    "Una directiva de nivel superior, no dentro de un marco. Flow TD es de arriba abajo y es el valor predeterminado. Flow LR va de izquierda a derecha.",
  "site.wiremark.keyword.to":
    "En cualquier elemento, to=#id enlaza ese elemento con un marco. El grafo de navegación se construye a partir de estos enlaces. El alias es href=. Los destinos son solo marcos.",
  "site.wiremark.keyword.stack":
    "Alinea los hijos en un eje. La dirección predeterminada es column. gap= (alias de spacing=) fija el espacio entre ellos. Un Stack solo no dibuja nada propio.",
  "site.wiremark.keyword.column":
    "Dirección de Stack sin clave. Los hijos se apilan de arriba abajo. column-reverse invierte ese orden.",
  "site.wiremark.keyword.row":
    "Dirección de Stack sin clave. Los hijos van de izquierda a derecha. row-reverse invierte ese orden.",
  "site.wiremark.keyword.gap":
    "Alias de spacing=. El hueco entre hijos, en unidades de espaciado. Escriba gap=2. Un número entre comillas es un error.",
  "site.wiremark.keyword.box":
    "Un contenedor genérico. Los tokens sin clave son el ancho y luego el alto: Box 240px *. outline (solid, dashed, dotted) y elevation= dibujan un panel visible.",
  "site.wiremark.keyword.grid":
    "Una cuadrícula uniforme. Los hijos fluyen hacia las celdas. cols= fija cuántas columnas hay, gap= fija el espaciado.",
  "site.wiremark.keyword.cols": "Número de columnas en Grid. Solo con clave: cols=3.",
  "site.wiremark.keyword.spacer":
    "Un hueco flexible que separa a sus hermanos a lo largo de la pila.",
  "site.wiremark.keyword.divider":
    "Una regla horizontal sin propiedades. En Stack, la marca suelta divider dibuja una regla en cada hueco.",
  "site.wiremark.keyword.sizing":
    "Tamaño posicional: ancho y luego alto. 240px son píxeles, 30% es una parte del espacio libre, * llena ese eje y un número suelto es un peso flexible. width= con clave se rechaza.",
  "site.wiremark.keyword.typography":
    "Una hoja de texto. Una cadena entre comillas son las palabras en pantalla. Sin texto, un Typography suelto dibuja una línea de relleno.",
  "site.wiremark.keyword.typeVariant":
    "Rol de texto sin clave: h1–h6, subtitle1, subtitle2, body1 (el predeterminado), body2, caption, overline o button. Los títulos h1–h6 van en negrita. caption va atenuado.",
  "site.wiremark.keyword.textField":
    "Una entrada de texto. La cadena entre comillas es la etiqueta. Las variantes son outlined (la predeterminada), filled y standard.",
  "site.wiremark.keyword.fillerAmount":
    "Cuánto texto de marcador dibujar cuando no hay una etiqueta real. ~3 son unas tres líneas, ~5w unas cinco palabras, ~2l unas dos líneas. _, __ y ___ son corto, medio y largo.",
  "site.wiremark.keyword.fillerStyle":
    "El aspecto del texto de marcador: squiggle (el predeterminado), lorem o blocks. Defínalo en la raíz Wireframe o en un elemento de texto. No cambia los colores.",
  "site.wiremark.keyword.required":
    "Una marca booleana. En TextField añade * después de la etiqueta.",
  "site.wiremark.keyword.value":
    "Texto con clave dentro de un campo. Una cadena entre comillas suelta es la etiqueta, así que el contenido debe ser value=\"...\".",
  "site.wiremark.keyword.multiline":
    "Una marca booleana. Agranda un TextField hasta convertirlo en un área de texto. rows=4 fija la altura. Sin rows, un campo multiline mide 3 filas.",
  "site.wiremark.keyword.noWrap":
    "Una marca booleana en Typography. La línea se queda en una sola y el desbordamiento termina en puntos suspensivos.",
  "site.wiremark.keyword.button":
    "Una acción. La cadena entre comillas es la etiqueta. Un Button suelto se lee Button. Las variantes son text (la predeterminada), outlined y contained.",
  "site.wiremark.keyword.contained":
    "Variante de Button sin clave: un tramado relleno, la acción principal. No hay una palabra clave primary.",
  "site.wiremark.keyword.outlined":
    "Variante sin clave. En Button es un borde sin relleno. En TextField, outlined es el aspecto predeterminado.",
  "site.wiremark.keyword.link":
    "Un enlace de texto en línea. La cadena entre comillas es la etiqueta. to=#id navega a un marco.",
  "site.wiremark.keyword.list":
    "Una pila vertical de filas ListItem. dense aprieta las filas. subheader= añade un encabezado pequeño.",
  "site.wiremark.keyword.listItem":
    "Una fila. La cadena entre comillas es la etiqueta. to=#id convierte la fila en un enlace. Un ListItem no admite hijos.",
  "site.wiremark.keyword.appBar":
    "La barra de la parte superior de una pantalla. Suele envolver un Toolbar.",
  "site.wiremark.keyword.toolbar":
    "Una fila horizontal dentro de un AppBar: título, iconos y acciones.",
  "site.wiremark.keyword.icon":
    "Un glifo de Material. Icon Search e Icon \"Search\" son el mismo nombre. Un nombre desconocido dibuja un marcador y avisa. fontSize= o size= es small, medium o large.",
  "site.wiremark.keyword.startIcon":
    "Un nombre de icono con clave dibujado antes de la etiqueta: startIcon=Email. endIcon= se dibuja después de la etiqueta. No ponga entre comillas el nombre de la propiedad.",
  "site.wiremark.keyword.iconsBlock":
    "Un bloque Icons de nivel superior, junto a los marcos, no dentro de uno. Cada entrada es un nombre más datos de trazado SVG. Un icono del documento sustituye a un icono integrado del mismo nombre.",
  "site.wiremark.keyword.card":
    "Una superficie. Los hijos sin CardContent son el cuerpo. to=#id convierte toda la ficha en un enlace.",
  "site.wiremark.keyword.cardContent":
    "La región de texto de un Card cuando el encabezado, el medio y las acciones van aparte.",
  "site.wiremark.keyword.cardActions": "La fila de botones al pie de un Card.",
  "site.wiremark.keyword.img":
    "Un marcador cruzado para una imagen. ratio=16:9 fija la proporción. src= son metadatos. El boceto sigue dibujando el marcador.",
  "site.wiremark.keyword.control":
    "Una casilla, un botón de opción o un interruptor. Control checkbox es el predeterminado. checked lo activa. Control radio y Control switch eligen los otros glifos.",
  "site.wiremark.keyword.indent":
    "La sangría es contención. Dos espacios por nivel, solo espacios. Una línea más profunda es un hijo. Un tabulador es un error.",
  "site.wiremark.keyword.quotes":
    "Una cadena entre comillas es texto que se dibuja, y las comillas son obligatorias. Una palabra suelta es un ajuste: una enumeración, una marca, un número, un tamaño o un nombre de icono. Nunca ponga entre comillas una enumeración o un número.",
  "site.wiremark.keyword.keyed":
    "key=value fija una propiedad con nombre. Un valor sin clave omite la clave y se elige por su tipo. El orden es libre, salvo el ancho y luego el alto para el tamaño.",
  "site.wiremark.keyword.comment":
    "Los comentarios // llegan hasta el final de la línea. # empieza un ancla, así que no es un comentario.",
} as const satisfies LocaleMessages;
