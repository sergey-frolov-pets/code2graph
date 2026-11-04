import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { renderMermaidOnlineToSvg } from "@/services/mermaid/mermaid-online";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { contrastTextColor, parseHexColor } from "@/services/mermaid/ext/common";
import {
  applyDiagramTypography,
  paintDiagramTypography,
  resolveDiagramFontStack,
} from "@/services/diagram-typography";
import { prepareMermaidSource } from "@/utils/mermaid-source";
import { isMermaidExtDeclaration } from "@/utils/mermaid-syntax";

let initialized = false;
let renderCounter = 0;
let lastRenderUsedOnlineInk = false;

export function didLastMermaidRenderUseOnlineInk(): boolean {
  return lastRenderUsedOnlineInk;
}

const MERMAID_RENDER_CONTAINER_WIDTH_PX = 1200;
const MERMAID_RENDER_CONTAINER_HEIGHT_PX = 800;

function createMermaidRenderContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = `${MERMAID_RENDER_CONTAINER_WIDTH_PX}px`;
  container.style.height = `${MERMAID_RENDER_CONTAINER_HEIGHT_PX}px`;
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.zIndex = "-1";
  document.body.appendChild(container);
  return container;
}

async function ensureMermaidInitialized(
  dark: boolean,
  fontFamily?: string,
): Promise<void> {
  const mermaid = await loadMermaid();
  const stack = resolveDiagramFontStack(fontFamily);
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
    ...(stack ? { fontFamily: stack } : {}),
    gantt: {
      useWidth: 1200,
    },
  });
  initialized = true;
}

export function isMermaidReady(): boolean {
  return initialized;
}

export async function waitForMermaidReady(dark: boolean): Promise<void> {
  await ensureMermaidInitialized(dark);
}

export interface MermaidRenderOptions {
  dark?: boolean;
  /** Фон диаграммы — перекрывает плашку холста, текст подбирается под него. */
  background?: string;
  /** Цвет текста — ручное перекрытие автоподбора. */
  textColor?: string;
  /** Шрифт: id семейства (`sans`, `serif`, `mono`, `rounded`). */
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
}

async function renderMermaidOfflineToSvg(
  source: string,
  options: MermaidRenderOptions = {},
): Promise<string> {
  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    throw new LocalizedAppError("mermaid.emptySource");
  }

  // Расширение Mermaid (свои типы диаграмм). В проде __MERMAID_EXT__ = false →
  // этот блок вместе с import() вырезается на этапе сборки.
  if (__MERMAID_EXT__) {
    const { tryRenderExtension } = await import("@/services/mermaid/ext");
    const extSvg = await tryRenderExtension(source, {
      dark: Boolean(options.dark),
      background: options.background,
      textColor: options.textColor,
      fontFamily: options.fontFamily,
      fontWeight: options.fontWeight,
      fontStyle: options.fontStyle,
    });
    if (extSvg) return applyDiagramTypography(extSvg, options);
  }

  const mermaid = await loadMermaid();
  await ensureMermaidInitialized(Boolean(options.dark), options.fontFamily);

  renderCounter += 1;
  const renderId = `mermaid-render-${renderCounter}`;
  const container = createMermaidRenderContainer();

  try {
    const result = await mermaid.render(renderId, prepared, container);
    return applyAppearanceToSvg(result.svg, options);
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "mermaid.renderFailed";
    throw new LocalizedAppError("mermaid.renderFailed", { detail: message });
  } finally {
    container.remove();
  }
}

/** Цвета подписей «страницы», которые следуют за фоном, а не за данными. */
const PAGE_TEXT_FILLS = new Set([
  "#000000",
  "#333333",
  "#1f2328",
  "#656d76",
  "#e6edf3",
  "#8b949e",
  "#24292f",
  "#cccccc",
]);

function opaqueHex(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (lower === "transparent" || lower === "none") return null;
  if (lower === "black") return "#000000";
  const rgb = parseHexColor(trimmed);
  if (!rgb) return null;
  const channel = (part: number) => part.toString(16).padStart(2, "0");
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function isPageTextFill(value: string | null): boolean {
  if (!value || !value.trim()) return false;
  const hex = opaqueHex(value);
  return hex !== null && PAGE_TEXT_FILLS.has(hex);
}

/**
 * Оформление поверх готового SVG штатной диаграммы.
 * Расширения красят фон и текст сами; здесь — шрифт для всех и фон/текст
 * для диаграмм, которые тема Mermaid рисует без учёта окна «Внешний вид».
 */
function applyAppearanceToSvg(svg: string, options: MermaidRenderOptions): string {
  if (!svg.includes("<svg")) return svg;

  const background = opaqueHex(options.background);
  const manualText = opaqueHex(options.textColor);
  const text = manualText ?? (background ? contrastTextColor(background) : null);
  if (!options.fontFamily && !options.fontWeight && !options.fontStyle && !background && !text) {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return svg;

  const declarations: string[] = [];
  if (background) declarations.push(`background-color: ${background}`);

  const existing = root.getAttribute("style") ?? "";
  const withoutBackground = existing
    .replace(/(?:^|;)\s*background(?:-color)?\s*:[^;]*/gi, "")
    .replace(/^;+|;+$/g, "")
    .trim();
  const style = [withoutBackground, declarations.join("; ")].filter(Boolean).join("; ");
  if (style) root.setAttribute("style", style);

  if (text) {
    for (const node of root.querySelectorAll("text, tspan")) {
      if (isPageTextFill(node.getAttribute("fill"))) {
        node.setAttribute("fill", text);
      }
    }
  }

  paintDiagramTypography(root, options);
  return new XMLSerializer().serializeToString(root);
}

export async function renderMermaidToSvg(
  source: string,
  options: MermaidRenderOptions = {},
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<string> {
  // Типы расширения mermaid.ink не знает: отправлять их на сервер бессмысленно
  // (вернётся ошибка разбора). Рисуем сразу своим движком.
  if (__MERMAID_EXT__ && isMermaidExtDeclaration(source)) {
    lastRenderUsedOnlineInk = false;
    return renderMermaidOfflineToSvg(source, options);
  }

  if (isOnlineRenderMode(renderMode)) {
    try {
      const svg = await renderMermaidOnlineToSvg(source, options);
      lastRenderUsedOnlineInk = true;
      return applyDiagramTypography(svg, options);
    } catch (onlineError) {
      try {
        const svg = await renderMermaidOfflineToSvg(source, options);
        lastRenderUsedOnlineInk = false;
        return svg;
      } catch {
        throw onlineError;
      }
    }
  }

  lastRenderUsedOnlineInk = false;
  return renderMermaidOfflineToSvg(source, options);
}
