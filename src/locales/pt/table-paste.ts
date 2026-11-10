import type { LocaleMessages } from "../types";

export const tablePasteMessages = {
  "editor.pasteTable": "Colar tabela da área de transferência",
  "editor.pasteTableHistory": "Colar tabela",
  "tablePaste.modalTitle": "Não é possível colar a tabela da área de transferência",
  "tablePaste.reasonLabel": "O que deu errado",
  "tablePaste.expectedLabel": "Formato de tabela esperado ({type})",
  "tablePaste.columnsLabel": "Colunas:",
  "tablePaste.rulesLabel": "Regras de conversão:",
  "tablePaste.sampleLabel": "Tabela de exemplo para copiar (Excel / Google Sheets / TSV):",
  "tablePaste.error.emptyClipboard":
    "A área de transferência está vazia. Copie um intervalo de células do Excel ou do Google Sheets, ou uma tabela separada por tabulação ou ponto e vírgula.",
  "tablePaste.error.clipboardReadFailed":
    "Não foi possível ler a área de transferência. Conceda a permissão da área de transferência no navegador e tente de novo.",
  "tablePaste.error.notATable":
    "O conteúdo da área de transferência não é uma tabela (eram esperadas pelo menos 2 colunas separadas por tabulação, ';' ou '|').",
  "tablePaste.error.tooManyColumns":
    "Colunas demais: foram encontradas {actual} na área de transferência, mas este diagrama espera {expected}.",
  "tablePaste.error.tooFewColumns":
    "Colunas de menos: foram encontradas {actual} na área de transferência, mas este diagrama espera {expected}.",
  "tablePaste.error.tooFewColumnsMin":
    "Colunas de menos: foram encontradas {actual} na área de transferência, mas são necessárias pelo menos {min}.",
  "tablePaste.error.tooFewRowsMin":
    "Linhas de menos: foram encontradas {actual} na área de transferência, mas são necessárias pelo menos {min} linhas.",
  "tablePaste.error.expectedColumnRange":
    "Quantidade de colunas inválida: foram encontradas {actual} na área de transferência; o esperado é entre {min} e {max} colunas.",
  "tablePaste.error.waterfallColumns":
    "Eram esperadas 2 colunas: uma com rótulos de texto e outra com números (ou células vazias para totais '=').",
  "tablePaste.error.waterfallFirstMustBeNumber":
    "A primeira linha de dados (linha {row}) precisa ter um valor numérico inicial ('=número'), não uma célula vazia.",
  "tablePaste.error.noNumericColumn":
    "Nenhuma das colunas contém valores numéricos.",
  "tablePaste.error.invalidNumberAtRow":
    "Linha {row}: o valor \"{value}\" não é um número válido.",
  "tablePaste.error.negativeNotAllowedAtRow":
    "Linha {row}: o valor negativo \"{value}\" não é permitido em um gráfico de pizza.",
  "tablePaste.error.noDataRows":
    "A tabela copiada não contém linhas de dados.",
  "tablePaste.type.waterfall": "Cascata",
  "tablePaste.type.pie": "Gráfico de pizza",
  "tablePaste.type.heatmap": "Mapa de calor",
  "tablePaste.type.bubble": "Gráfico de bolhas",
  "tablePaste.type.ev": "Valor agregado (EV)",
  "tablePaste.type.boxplot": "Gráfico de caixa",
  "tablePaste.type.treemap": "Mapa de árvore",
  "tablePaste.type.radar": "Gráfico de radar",
  "tablePaste.type.voronoi": "Diagrama de Voronoi",
  "tablePaste.type.clustered": "Gráfico de séries",
  "tablePaste.type.xychart": "Gráfico XY (barras / linhas)",
  "tablePaste.type.quadrant": "Gráfico de quadrantes",
  "tablePaste.type.sankey": "Diagrama de Sankey",
  "tablePaste.type.orgchart": "Organograma",
  "tablePaste.type.gantt": "Gráfico de Gantt",
  "tablePaste.type.timeline": "Linha do tempo",
  "tablePaste.type.journey": "Jornada do usuário",
  "tablePaste.type.packet": "Cabeçalho de pacote",
  "tablePaste.type.wbs": "Estrutura analítica (EAP)",
  "tablePaste.type.mindmap": "Mapa mental",
  "tablePaste.type.nwdiag": "Diagrama de rede (Nwdiag)",
  "tablePaste.type.wireframe": "Tabela WireMark",
  "tablePaste.expected.waterfall.columns":
    "2 colunas em qualquer ordem: 'Rótulo' e 'Valor' (ou 'Valor' e 'Rótulo').",
  "tablePaste.expected.waterfall.rules":
    "O primeiro número vira a barra inicial (=N), números positivos viram aumentos (+N), números negativos viram reduções (-N) e uma célula vazia (ou '=') vira um total acumulado (= : Rótulo).",
  "tablePaste.expected.waterfall.headers": "Rótulo|Valor",
  "tablePaste.expected.pie.columns":
    "2 colunas em qualquer ordem: 'Categoria' e 'Número não negativo'.",
  "tablePaste.expected.pie.rules":
    "Cada linha vira uma fatia: \"Categoria\" : Valor.",
  "tablePaste.expected.pie.headers": "Categoria|Fatia",
  "tablePaste.expected.heatmap.columns":
    "Matriz de pelo menos 2×2: a primeira linha tem os cabeçalhos das colunas X, a primeira coluna tem os rótulos das linhas Y e as células internas têm números (ou células vazias).",
  "tablePaste.expected.heatmap.rules":
    "As linhas x e y são inseridas antes do bloco scale. Se scale não existir, é adicionada uma escala do valor mínimo ao máximo, do azul ao vermelho. Células vazias viram posições null.",
  "tablePaste.expected.heatmap.headers": "Período|Seg|Ter|Qua",
  "tablePaste.expected.bubble.columns":
    "4 ou 5 colunas: 'Rótulo', 'X (número)', 'Y (número)', 'Tamanho (número)', ['Grupo (opcional)'].",
  "tablePaste.expected.bubble.rules":
    "Cada linha vira um ponto de bolha: Rótulo : x=..., y=..., size=..., group=...",
  "tablePaste.expected.bubble.headers": "Produto|X|Y|Tamanho|Grupo",
  "tablePaste.expected.ev.columns":
    "4 colunas: 'Período (dias)', 'PV (planejado)', 'EV (agregado)', 'AC (real)' (ou 4 linhas: days, pv, ev, ac).",
  "tablePaste.expected.ev.rules":
    "Gera as séries days, pv, ev e ac do gráfico de valor agregado.",
  "tablePaste.expected.ev.headers": "Período|PV|EV|AC",
  "tablePaste.expected.boxplot.columns":
    "6 colunas ('Categoria', 'Mín.', 'Q1', 'Mediana', 'Q3', 'Máx.') ou 4 ou mais colunas de observações brutas ('Categoria', 'Amostra 1', 'Amostra 2', 'Amostra 3'...).",
  "tablePaste.expected.boxplot.rules":
    "Gera min=..., q1=..., median=..., q3=..., max=... para resumos de cinco números, ou values=... para observações brutas.",
  "tablePaste.expected.boxplot.headers": "Categoria|Mín.|Q1|Mediana|Q3|Máx.",
  "tablePaste.expected.treemap.columns":
    "2 a 4 colunas: 'Item | Peso' ou 'Grupo | Item | Peso [| Cor]'.",
  "tablePaste.expected.treemap.rules":
    "Gera blocos hierárquicos 'Grupo / Item : Peso' (o peso precisa ser > 0).",
  "tablePaste.expected.treemap.headers": "Grupo|Item|Peso",
  "tablePaste.expected.radar.columns":
    "Matriz com pelo menos 4 colunas: a primeira linha tem os nomes dos eixos (pelo menos 3 eixos), a primeira coluna tem os nomes das séries e as células internas têm números.",
  "tablePaste.expected.radar.rules":
    "Gera a diretiva axes a partir da linha de cabeçalho e linhas 'series Nome : v1, v2, ...'.",
  "tablePaste.expected.radar.headers": "Série|Velocidade|Confiabilidade|Usabilidade|Segurança",
  "tablePaste.expected.voronoi.columns":
    "3 a 5 colunas: 'Sítio', 'X (número)', 'Y (número)', ['Grupo'], ['Cor'].",
  "tablePaste.expected.voronoi.rules":
    "Cada linha vira um sítio de Voronoi: Sítio : x=..., y=..., group=...",
  "tablePaste.expected.voronoi.headers": "Sítio|X|Y|Grupo",
  "tablePaste.expected.clustered.columns":
    "Matriz de pelo menos 2×2: a primeira coluna tem as categorias, a primeira linha tem os nomes das séries (ou transposta quando o cabeçalho começa com 'Series').",
  "tablePaste.expected.clustered.rules":
    "Gera as linhas categories e series, mantendo as diretivas rotate 90, invert y e de cor.",
  "tablePaste.expected.clustered.headers": "Categoria|Norte|Sul|Exportação",
  "tablePaste.expected.xychart.columns":
    "1 ou mais colunas. Uma coluna são números para bar [Val 1, ..., Val n]. Duas colunas são 'Categoria X' e 'Valor da barra'. Três ou mais são 'Categoria X' mais uma série de barras por coluna extra.",
  "tablePaste.expected.xychart.rules":
    "Uma coluna acrescenta uma linha bar [valores]. Duas ou mais colunas substituem ou adicionam o x-axis e uma série bar [...] por coluna de valores. Se o gráfico ainda não tiver y-axis, é adicionado y-axis \"\" min --> max.",
  "tablePaste.expected.xychart.headers": "Mês|Plano|Real|Previsão",
  "tablePaste.expected.quadrant.columns":
    "3 colunas: 'Rótulo do ponto', 'X (0..1 ou 0..100%)', 'Y (0..1 ou 0..100%)'.",
  "tablePaste.expected.quadrant.rules":
    "Coordenadas maiores que 1 são normalizadas automaticamente de porcentagens (0..100) para [0..1].",
  "tablePaste.expected.quadrant.headers": "Item|X|Y",
  "tablePaste.expected.sankey.columns":
    "3 colunas: 'Origem', 'Destino', 'Valor do fluxo (número)'.",
  "tablePaste.expected.sankey.rules":
    "Cada linha vira uma linha de fluxo: Origem,Destino,Valor.",
  "tablePaste.expected.sankey.headers": "Origem|Destino|Fluxo",
  "tablePaste.expected.orgchart.columns":
    "2 ou 3 colunas: 'Gestor', 'Subordinado direto', ['Estilo da aresta (dotted) ou Cargo'].",
  "tablePaste.expected.orgchart.rules":
    "Gera nós do organograma e linhas de subordinação sólidas (->) ou pontilhadas (-.->).",
  "tablePaste.expected.orgchart.headers": "Gestor|Subordinado|Ligação",
  "tablePaste.expected.gantt.columns":
    "2 a 4 colunas: 'Tarefa', 'Data de início ou duração', ['Duração (5d)'], ['Seção'].",
  "tablePaste.expected.gantt.rules":
    "Gera linhas de tarefas do Gantt (agrupadas por seção no Mermaid).",
  "tablePaste.expected.gantt.headers": "Tarefa|Início|Duração|Seção",
  "tablePaste.expected.timeline.columns":
    "2 ou 3 colunas: 'Período / Data', 'Evento', ['Seção (opcional)'].",
  "tablePaste.expected.timeline.rules":
    "Cada linha vira uma entrada da linha do tempo 'Período : Evento'.",
  "tablePaste.expected.timeline.headers": "Período|Evento|Seção",
  "tablePaste.expected.journey.columns":
    "2 a 4 colunas: 'Etapa', 'Pontuação (1–5)', ['Atores'], ['Seção'].",
  "tablePaste.expected.journey.rules":
    "Gera etapas da jornada do usuário 'Etapa: Pontuação: Atores'.",
  "tablePaste.expected.journey.headers": "Etapa|Pontuação|Atores|Seção",
  "tablePaste.expected.packet.columns":
    "2 colunas em qualquer ordem: 'Faixa de bits (0-15) ou comprimento em bits (16)' e 'Nome do campo'.",
  "tablePaste.expected.packet.rules":
    "Gera campos de pacote '0-15: \"Campo\"' (os comprimentos em bits são acumulados automaticamente em faixas).",
  "tablePaste.expected.packet.headers": "Bits|Campo",
  "tablePaste.expected.wbs.columns":
    "2 ou mais colunas que representam níveis da hierarquia: 'Nível 1 (Raiz)', 'Nível 2', 'Nível 3' etc.",
  "tablePaste.expected.wbs.rules":
    "Monta uma árvore EAP (*, **, ***), agrupando automaticamente as células pai idênticas.",
  "tablePaste.expected.wbs.headers": "Nível 1|Nível 2|Nível 3",
  "tablePaste.expected.mindmap.columns":
    "2 ou mais colunas que representam a profundidade da árvore: 'Raiz', 'Ramo', 'Sub-ramo' etc.",
  "tablePaste.expected.mindmap.rules":
    "Monta uma árvore de mapa mental, unindo pais idênticos. Os nós são inseridos na linha em branco do cursor, substituem a seleção ou substituem todos os nós do mapa. Legenda, title, header, footer, caption, style e comentários são mantidos.",
  "tablePaste.expected.mindmap.headers": "Raiz|Ramo|Folha",
  "tablePaste.expected.nwdiag.columns":
    "2 ou 3 colunas: 'Nó', 'Endereço IP', ['Rede (opcional)'].",
  "tablePaste.expected.nwdiag.rules":
    "Agrupa os nós por rede em blocos network { node [address = \"...\"] }.",
  "tablePaste.expected.nwdiag.headers": "Nó|Endereço IP|Rede",
  "tablePaste.expected.wireframe.columns":
    "Qualquer tabela com pelo menos 2 colunas (a primeira linha é o cabeçalho e as demais são o corpo).",
  "tablePaste.expected.wireframe.rules":
    "Gera um componente Table do WireMark com TableHead e TableBody (colunas numéricas ficam alinhadas à direita).",
  "tablePaste.expected.wireframe.headers": "Nome|Autor|Status|Visualizações",
} as const satisfies LocaleMessages;
