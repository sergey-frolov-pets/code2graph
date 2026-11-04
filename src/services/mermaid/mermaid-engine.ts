import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { renderMermaidOnlineToSvg } from "@/services/mermaid/mermaid-online";
import { LocalizedAppError } from "@/utils/localized-app-error";
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

async function ensureMermaidInitialized(dark: boolean): Promise<void> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
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
    if (extSvg) return extSvg;
  }

  const mermaid = await loadMermaid();
  await ensureMermaidInitialized(Boolean(options.dark));

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

/** Стек шрифтов диаграммы по id из окна «Внешний вид». */
const DIAGRAM_FONT_STACKS: Record<string, string> = {
  sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', 'PT Serif', serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
  rounded: "'Nunito', 'Segoe UI', system-ui, sans-serif",
};

/**
 * Оформление поверх готового SVG: шрифт и его стиль задаются на корне, а не
 * через тему Mermaid — так они действуют и на штатные диаграммы, и на наши
 * расширения. Фон и цвет текста для расширений уже учтены в рендере, здесь
 * они не дублируются.
 */
function applyAppearanceToSvg(svg: string, options: MermaidRenderOptions): string {
  if (!svg.includes("<svg")) return svg;

  const stack = options.fontFamily ? DIAGRAM_FONT_STACKS[options.fontFamily] : undefined;
  const weight = options.fontWeight;
  const style = options.fontStyle;
  if (!stack && !weight && !style) return svg;

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return svg;

  const declarations: string[] = [];
  if (stack) declarations.push(`font-family: ${stack}`);
  if (weight) declarations.push(`font-weight: ${weight}`);
  if (style) declarations.push(`font-style: ${style}`);

  const existing = root.getAttribute("style") ?? "";
  root.setAttribute("style", `${existing}${existing && !existing.trim().endsWith(";") ? ";" : ""}${declarations.join("; ")}`);

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
      return svg;
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
