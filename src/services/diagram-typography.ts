/**
 * Шрифт из окна «Внешний вид».
 *
 * Рендереры не читают его сами: PlantUML и GraphML пишут `font-family` на каждый
 * `<text>`, Mermaid — в CSS `.label`, D2 подключает собственный `@font-face`.
 * Стиль на корне SVG до подписей не доходит. Поэтому после рендера шрифт
 * ставится на сами подписи и дублируется правилом с `!important`.
 */

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const TYPOGRAPHY_STYLE_ATTR = "data-c2g-typography";
const FONT_DECLARATION_PATTERN =
  /(?:^|;)\s*font-(?:family|weight|style)\s*:[^;]*/gi;
const MERMAID_FONT_VARIABLE_PATTERN = /--mermaid-font-family\s*:\s*[^;}{]+/g;
const ICON_CLASS_PATTERN =
  /(?:^|\s)(?:fa|fas|far|fab|fa-solid|label-icon)(?:\s|$)/;

const SVG_TEXT_TAGS = new Set(["svg", "text", "tspan", "textpath"]);
const HTML_TEXT_TAGS = new Set(["div", "span", "p"]);

export const DIAGRAM_FONT_FAMILIES = [
  {
    id: "sans",
    stack: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  },
  {
    id: "serif",
    stack: "Georgia, 'Times New Roman', 'PT Serif', serif",
  },
  {
    id: "mono",
    stack: "'SFMono-Regular', Consolas, 'Liberation Mono', ui-monospace, monospace",
  },
  {
    id: "rounded",
    stack: "ui-rounded, 'Nunito', 'Segoe UI', system-ui, sans-serif",
  },
] as const;

export const DIAGRAM_FONT_WEIGHTS = [
  { id: "normal", value: "400" },
  { id: "medium", value: "500" },
  { id: "semibold", value: "600" },
  { id: "bold", value: "700" },
] as const;

export const DIAGRAM_FONT_STYLES = ["normal", "italic"] as const;

const FONT_FAMILY_IDS = new Set<string>(
  DIAGRAM_FONT_FAMILIES.map((font) => font.id),
);
const FONT_WEIGHT_VALUES = new Set<string>(
  DIAGRAM_FONT_WEIGHTS.map((weight) => weight.value),
);
const FONT_STYLE_VALUES = new Set<string>(DIAGRAM_FONT_STYLES);

export interface DiagramTypographyInput {
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
}

interface ResolvedDiagramTypography {
  stack?: string;
  weight?: string;
  fontStyle?: string;
}

export function resolveDiagramFontStack(
  fontFamily: string | undefined,
): string | undefined {
  if (!fontFamily || !FONT_FAMILY_IDS.has(fontFamily)) {
    return undefined;
  }

  return DIAGRAM_FONT_FAMILIES.find((font) => font.id === fontFamily)?.stack;
}

export function resolveDiagramTypography(
  input: DiagramTypographyInput,
): ResolvedDiagramTypography | null {
  const stack = resolveDiagramFontStack(input.fontFamily);
  const weight =
    input.fontWeight && FONT_WEIGHT_VALUES.has(input.fontWeight)
      ? input.fontWeight
      : undefined;
  const fontStyle =
    input.fontStyle && FONT_STYLE_VALUES.has(input.fontStyle)
      ? input.fontStyle
      : undefined;

  if (!stack && !weight && !fontStyle) {
    return null;
  }

  return { stack, weight, fontStyle };
}

function fontDeclarations(typography: ResolvedDiagramTypography): string[] {
  const declarations: string[] = [];
  if (typography.stack) {
    declarations.push(`font-family:${typography.stack} !important`);
  }
  if (typography.weight) {
    declarations.push(`font-weight:${typography.weight} !important`);
  }
  if (typography.fontStyle) {
    declarations.push(`font-style:${typography.fontStyle} !important`);
  }
  return declarations;
}

function mergeFontStyle(existing: string, declarations: string[]): string {
  const cleaned = existing
    .replace(FONT_DECLARATION_PATTERN, "")
    .replace(/;{2,}/g, ";")
    .replace(/^\s*;\s*|\s*;\s*$/g, "")
    .trim();
  const extra = declarations.join(";");
  if (!cleaned) return extra;
  if (!extra) return cleaned;
  return `${cleaned};${extra}`;
}

function isIconElement(element: Element): boolean {
  return ICON_CLASS_PATTERN.test(element.getAttribute("class") ?? "");
}

function applyToElement(
  element: Element,
  typography: ResolvedDiagramTypography,
): void {
  const tag = element.localName.toLowerCase();
  if (isIconElement(element)) return;
  if (!SVG_TEXT_TAGS.has(tag) && !HTML_TEXT_TAGS.has(tag)) return;

  if (SVG_TEXT_TAGS.has(tag)) {
    if (typography.stack) element.setAttribute("font-family", typography.stack);
    if (typography.weight) element.setAttribute("font-weight", typography.weight);
    if (typography.fontStyle) {
      element.setAttribute("font-style", typography.fontStyle);
    }
  }

  const declarations = fontDeclarations(typography);
  if (declarations.length === 0) return;
  element.setAttribute(
    "style",
    mergeFontStyle(element.getAttribute("style") ?? "", declarations),
  );
}

function walk(element: Element, typography: ResolvedDiagramTypography): void {
  applyToElement(element, typography);
  for (const child of Array.from(element.children)) {
    walk(child, typography);
  }
}

function retargetMermaidFontVariable(
  root: Element,
  stack: string | undefined,
): void {
  if (!stack) return;

  for (const styleElement of Array.from(root.querySelectorAll("style"))) {
    if (styleElement.hasAttribute(TYPOGRAPHY_STYLE_ATTR)) continue;
    const text = styleElement.textContent ?? "";
    if (!text.includes("--mermaid-font-family")) continue;
    styleElement.textContent = text.replace(
      MERMAID_FONT_VARIABLE_PATTERN,
      `--mermaid-font-family:${stack}`,
    );
  }
}

function appendTypographyStyle(
  root: Element,
  typography: ResolvedDiagramTypography,
): void {
  const declarations = fontDeclarations(typography);
  if (declarations.length === 0) return;

  root.querySelector(`style[${TYPOGRAPHY_STYLE_ATTR}]`)?.remove();

  const styleElement = root.ownerDocument.createElementNS(SVG_NAMESPACE, "style");
  styleElement.setAttribute(TYPOGRAPHY_STYLE_ATTR, "true");
  const selector = [
    "svg",
    "text",
    "tspan",
    "textPath",
    "foreignObject div",
    "foreignObject span:not(.fa):not(.fas):not(.far):not(.fab):not(.label-icon)",
    "foreignObject p",
  ].join(",");
  styleElement.textContent = `${selector}{${declarations.join(";")}}`;
  root.appendChild(styleElement);
}

/** Ставит шрифт на уже разобранный корень SVG. Повторный вызов заменяет прошлое оформление. */
export function paintDiagramTypography(
  root: Element,
  input: DiagramTypographyInput,
): void {
  const typography = resolveDiagramTypography(input);
  if (!typography) return;

  retargetMermaidFontVariable(root, typography.stack);
  walk(root, typography);
  appendTypographyStyle(root, typography);
}

const XML_DECLARATION_PATTERN = /^\s*<\?xml[\s\S]*?\?>\s*/i;

/**
 * PlantUML (и Structurizr поверх него) пишет `xmlns` на `<svg>` дважды.
 * XML-парсер такое отбрасывает, и шрифт некуда ставить.
 */
const DUPLICATE_XMLNS_PATTERN =
  /(xmlns="http:\/\/www\.w3\.org\/2000\/svg")(?=[^>]*\1)/g;

function repairSvgMarkup(svg: string): string {
  return svg.replace(DUPLICATE_XMLNS_PATTERN, "");
}

/** Возвращает SVG, в котором подписи нарисованы выбранным шрифтом. */
export function applyDiagramTypography(
  svg: string,
  input: DiagramTypographyInput,
): string {
  if (!resolveDiagramTypography(input) || !svg.includes("<svg")) {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(repairSvgMarkup(svg), "image/svg+xml");
  const root = doc.documentElement;
  if (root.localName.toLowerCase() !== "svg") {
    return svg;
  }

  paintDiagramTypography(root, input);
  const declaration = svg.match(XML_DECLARATION_PATTERN)?.[0] ?? "";
  return declaration + new XMLSerializer().serializeToString(root);
}
