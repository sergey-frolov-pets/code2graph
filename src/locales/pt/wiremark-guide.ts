import type { LocaleMessages } from "../types";

export const wiremarkGuideMessages = {
  "site.wiremark.typesLead":
    "Tipos de tela dos guias do WireMark: um quadro, uma estrutura de aplicativo, um formulário, uma lista de configurações, um cartão, um fluxo e a moldura compartilhada.",
  "site.wiremark.keywordsLead":
    "Palavras-chave dos guias do WireMark: a raiz do quadro, o layout, o texto, os componentes e as regras de linha. A lista completa de componentes e a galeria de ícones estão na documentação.",
  "site.wiremark.docsComponents": "Referência de componentes",
  "site.wiremark.docsIcons": "Galeria de ícones",

  "site.wiremark.type.login.title": "Tela de entrada",
  "site.wiremark.type.login.text":
    "Um quadro de celular. Abas, campos com ícone, um alerta de informação e um botão contained de largura total que abre outro quadro com to=#id.",
  "site.wiremark.type.dashboard.title": "Casco do aplicativo",
  "site.wiremark.type.dashboard.text":
    "Um quadro em paisagem: uma barra de menu, uma barra de aplicativo densa, uma gaveta ancorada, cartões de gráfico e uma tabela com barra de rolagem.",
  "site.wiremark.type.form.title": "Formulário",
  "site.wiremark.type.form.text":
    "Um quadro alto. Etapas, campos obrigatórios, value=, uma área de várias linhas, um select, um controle deslizante, uma avaliação, um calendário e a caixa de concordância.",
  "site.wiremark.type.settings.title": "Lista de configurações",
  "site.wiremark.type.settings.text":
    "Uma barra de aplicativo, um alerta de erro, uma lista de linhas com to=#id, um acordeão, navegação inferior e um diálogo de confirmação.",
  "site.wiremark.type.product.title": "Ficha do produto",
  "site.wiremark.type.product.text":
    "Um cartão largo. Img usa ratio=16:9 e, em seguida, chips, um mapa, uma tabela de especificações e CardActions com um grupo de botões.",
  "site.wiremark.type.flow.title": "Fluxo de telas",
  "site.wiremark.type.flow.text":
    "Flow LR liga duas telas. Uma estrutura oculta (visible=false) é puxado com background=#id, e o conteúdo fica em Anchor #content. Icons declara uma marca personalizada.",
  "site.wiremark.type.chrome.title": "Moldura compartilhada",
  "site.wiremark.type.chrome.text":
    "Uma estrutura com visible=false não é desenhado sozinho. Outros quadros o puxam com background=#id e colocam o conteúdo em uma região Anchor com anchor=#id.",

  "site.wiremark.group.frame": "Quadro e fluxo",
  "site.wiremark.group.layout": "Layout",
  "site.wiremark.group.text": "Texto e preenchimento",
  "site.wiremark.group.ui": "Componentes da tela",
  "site.wiremark.group.syntax": "Sintaxe",

  "site.wiremark.keyword.wireframe":
    "A raiz de uma tela. Tudo que estiver recuado abaixo dela fica nessa tela. Acrescente #id para outros quadros poderem apontar para cá, além de um tamanho predefinido ou w= e h= juntos.",
  "site.wiremark.keyword.frameId":
    "Dá nome a um quadro em Wireframe, ou a uma região em Anchor. to= e background=#id só combinam com quadros. anchor= só combina com regiões.",
  "site.wiremark.keyword.mobile": "Tamanho predefinido com largura de celular na raiz Wireframe.",
  "site.wiremark.keyword.landscape":
    "Tamanho predefinido largo. Use para uma estrutura de aplicativo ou um painel.",
  "site.wiremark.keyword.portrait": "Tamanho predefinido alto na raiz Wireframe.",
  "site.wiremark.keyword.frameSize":
    "Tamanho personalizado do quadro. Na raiz Wireframe defina w= e h= juntos. Deixe o predefinido de lado quando anchor= dimensionar o quadro.",
  "site.wiremark.keyword.visible":
    "visible=false oculta um quadro do fluxograma e ainda permite usá-lo como destino de background=. O padrão é visível.",
  "site.wiremark.keyword.frameBackground":
    "Em um Wireframe, background=#id pinta outro quadro por baixo. Em um elemento comum, background= é uma hachura: hatch, crosshatch ou none.",
  "site.wiremark.keyword.anchor":
    "Uma região invisível dentro de uma estrutura. Sem tamanho, ela ocupa o espaço que sobra. Dê a ela #id para um quadro da frente poder apontar para ela.",
  "site.wiremark.keyword.anchorAt":
    "Coloca um quadro da frente dentro de uma região do seu fundo. O alias é at=. Não acrescente um predefinido nem w=/h= nesse quadro. A âncora prevalece.",
  "site.wiremark.keyword.flow":
    "Uma diretiva de nível superior, fora de um quadro. Flow TD é de cima para baixo e é o padrão. Flow LR vai da esquerda para a direita.",
  "site.wiremark.keyword.to":
    "Em qualquer elemento, to=#id liga esse elemento a um quadro. O grafo de navegação é montado a partir desses vínculos. O alias é href=. Os destinos são somente quadros.",
  "site.wiremark.keyword.stack":
    "Alinha os filhos em um eixo. A direção padrão é column. gap= (alias de spacing=) define o espaço entre eles. Um Stack sozinho não desenha nada de próprio.",
  "site.wiremark.keyword.column":
    "Direção de Stack sem chave. Os filhos se empilham de cima para baixo. column-reverse inverte essa ordem.",
  "site.wiremark.keyword.row":
    "Direção de Stack sem chave. Os filhos vão da esquerda para a direita. row-reverse inverte essa ordem.",
  "site.wiremark.keyword.gap":
    "Alias de spacing=. O espaço entre os filhos, em unidades de espaçamento. Escreva gap=2. Um número entre aspas é um erro.",
  "site.wiremark.keyword.box":
    "Um contêiner genérico. Os tokens sem chave são largura e depois altura: Box 240px *. outline (solid, dashed, dotted) e elevation= desenham um painel visível.",
  "site.wiremark.keyword.grid":
    "Uma grade uniforme. Os filhos fluem para as células. cols= define quantas colunas, gap= define o espaçamento.",
  "site.wiremark.keyword.cols": "Quantidade de colunas no Grid. Somente com chave: cols=3.",
  "site.wiremark.keyword.spacer":
    "Um espaço flexível que afasta os irmãos ao longo da pilha.",
  "site.wiremark.keyword.divider":
    "Uma régua horizontal sem propriedades. No Stack, o indicador isolado divider desenha uma régua em cada intervalo.",
  "site.wiremark.keyword.sizing":
    "Tamanho posicional: largura e depois altura. 240px são pixels, 30% é uma fração do espaço livre, * preenche esse eixo e um número isolado é um peso flex. width= com chave é rejeitado.",
  "site.wiremark.keyword.typography":
    "Uma folha de texto. Uma string entre aspas são as palavras na tela. Sem texto, um Typography isolado desenha uma linha de preenchimento.",
  "site.wiremark.keyword.typeVariant":
    "Papel de texto sem chave: h1–h6, subtitle1, subtitle2, body1 (o padrão), body2, caption, overline ou button. Os títulos h1–h6 são negrito. caption é atenuado.",
  "site.wiremark.keyword.textField":
    "Uma entrada de texto. A string entre aspas é o rótulo. As variantes são outlined (o padrão), filled e standard.",
  "site.wiremark.keyword.fillerAmount":
    "Quanto texto de espaço reservado desenhar quando não há um rótulo real. ~3 são cerca de três linhas, ~5w cerca de cinco palavras, ~2l cerca de duas linhas. _, __ e ___ são curto, médio e longo.",
  "site.wiremark.keyword.fillerStyle":
    "O visual do texto de espaço reservado: squiggle (o padrão), lorem ou blocks. Defina na raiz Wireframe ou em um elemento de texto. Isso não muda as cores.",
  "site.wiremark.keyword.required":
    "Um indicador booleano. No TextField acrescenta * depois do rótulo.",
  "site.wiremark.keyword.value":
    "Texto com chave dentro de um campo. Uma string entre aspas isolada é o rótulo, então o conteúdo precisa ser value=\"...\".",
  "site.wiremark.keyword.multiline":
    "Um indicador booleano. Ela transforma um TextField em uma área de texto. rows=4 define a altura. Sem rows, um campo multiline tem 3 linhas de altura.",
  "site.wiremark.keyword.noWrap":
    "Um indicador booleano em Typography. A linha permanece única e o excesso termina com reticências.",
  "site.wiremark.keyword.button":
    "Uma ação. A string entre aspas é o rótulo. Um Button isolado lê Button. As variantes são text (o padrão), outlined e contained.",
  "site.wiremark.keyword.contained":
    "Variante de Button sem chave: uma hachura preenchida, a ação principal. Não existe a palavra-chave primary.",
  "site.wiremark.keyword.outlined":
    "Variante sem chave. No Button é uma borda sem preenchimento. No TextField, outlined é a moldura padrão.",
  "site.wiremark.keyword.link":
    "Um link de texto em linha. A string entre aspas é o rótulo. to=#id navega para um quadro.",
  "site.wiremark.keyword.list":
    "Uma pilha vertical de linhas ListItem. dense aperta as linhas. subheader= acrescenta um título pequeno.",
  "site.wiremark.keyword.listItem":
    "Uma linha. A string entre aspas é o rótulo. to=#id torna a linha um link. Um ListItem não aceita filhos.",
  "site.wiremark.keyword.appBar":
    "A barra no topo de uma tela. Em geral envolve uma Toolbar.",
  "site.wiremark.keyword.toolbar":
    "Uma linha horizontal dentro de uma AppBar: título, ícones e ações.",
  "site.wiremark.keyword.icon":
    "Um glifo do Material. Icon Search e Icon \"Search\" são o mesmo nome. Um nome desconhecido desenha um espaço reservado e avisa. fontSize= ou size= é small, medium ou large.",
  "site.wiremark.keyword.startIcon":
    "Um nome de ícone com chave desenhado antes do rótulo: startIcon=Email. endIcon= desenha depois do rótulo. Não coloque o nome da propriedade entre aspas.",
  "site.wiremark.keyword.iconsBlock":
    "Um bloco Icons de nível superior, ao lado dos quadros, não dentro de um. Cada entrada é um nome mais dados de caminho SVG. Um ícone do documento substitui um ícone embutido de mesmo nome.",
  "site.wiremark.keyword.card":
    "Uma superfície. Filhos sem CardContent são o corpo. to=#id torna o cartão inteiro um link.",
  "site.wiremark.keyword.cardContent":
    "A região de texto de um Card quando o cabeçalho, a mídia e as ações estão separados.",
  "site.wiremark.keyword.cardActions": "A fileira de botões na base de um Card.",
  "site.wiremark.keyword.img":
    "Um espaço reservado cruzado para uma imagem. ratio=16:9 define a proporção. src= é metadado. O esboço ainda desenha o espaço reservado.",
  "site.wiremark.keyword.control":
    "Uma caixa de seleção, um rádio ou um interruptor. Control checkbox é o padrão. checked liga. Control radio e Control switch escolhem os outros glifos.",
  "site.wiremark.keyword.indent":
    "O recuo é o aninhamento. Dois espaços por nível, somente espaços. Uma linha mais profunda é um filho. Uma tabulação é um erro.",
  "site.wiremark.keyword.quotes":
    "Uma string entre aspas é texto que é desenhado, e as aspas são obrigatórias. Uma palavra isolada é uma configuração: um enum, um indicador, um número, um tamanho ou um nome de ícone. Nunca coloque um enum ou um número entre aspas.",
  "site.wiremark.keyword.keyed":
    "key=value define uma propriedade nomeada. Um valor sem chave omite a chave e é escolhido pelo tipo. A ordem é livre, exceto largura e depois altura no dimensionamento.",
  "site.wiremark.keyword.comment":
    "Comentários // vão até o fim da linha. # inicia uma âncora, então não é um comentário.",
} as const satisfies LocaleMessages;
