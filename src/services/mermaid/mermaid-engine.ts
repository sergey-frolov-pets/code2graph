import { isAppLocale, STORAGE_KEY_LOCALE } from "@/constants/i18n";
import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { readStorageItem } from "@/core/safe-storage";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { renderMermaidOnlineToSvg } from "@/services/mermaid/mermaid-online";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { applyDiagramAppearance } from "@/services/diagram-appearance";
import {
  applyDiagramTypography,
  paintDiagramTypography,
  resolveDiagramFontStack,
} from "@/services/diagram-typography";
import { prepareMermaidSankeyUnicode } from "@/services/mermaid/sankey-unicode";
import { prepareMermaidSource } from "@/utils/mermaid-source";
import { isMermaidExtDeclaration } from "@/utils/mermaid-syntax";
import { applyMarkedAspectFrame } from "@/utils/svg-aspect-frame";

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
  /** Язык интерфейса для подписей, которые рисует расширение. */
  locale?: string;
}

/** Текущий язык интерфейса, если вызывающий код его не передал. */
function currentUiLocale(): string | undefined {
  const saved = readStorageItem(STORAGE_KEY_LOCALE);
  if (saved && isAppLocale(saved)) return saved;
  try {
    const browser = navigator.language.slice(0, 2).toLowerCase();
    if (isAppLocale(browser)) return browser;
  } catch {
    return undefined;
  }
  return undefined;
}

async function renderMermaidOfflineToSvg(
  source: string,
  options: MermaidRenderOptions = {},
): Promise<string> {
  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    throw new LocalizedAppError("mermaid.emptySource");
  }
  const sankeyLabels = prepareMermaidSankeyUnicode(prepared);

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
      locale: options.locale ?? currentUiLocale(),
    });
    if (extSvg) return applyDiagramTypography(extSvg, options);
  }

  const mermaid = await loadMermaid();
  await ensureMermaidInitialized(Boolean(options.dark), options.fontFamily);

  renderCounter += 1;
  const renderId = `mermaid-render-${renderCounter}`;
  const container = createMermaidRenderContainer();

  try {
    const result = await mermaid.render(renderId, sankeyLabels.source, container);
    return sankeyLabels.restore(applyAppearanceToSvg(result.svg, options));
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

/**
 * Оформление поверх готового SVG штатной диаграммы.
 * Расширения красят фон и текст сами. Здесь — фон, контраст подписей
 * и шрифт для диаграмм, которые тема Mermaid рисует без окна «Внешний вид».
 */
function applyAppearanceToSvg(svg: string, options: MermaidRenderOptions): string {
  const painted = applyDiagramAppearance(svg, {
    background: options.background,
    textColor: options.textColor,
  });
  if (!painted.includes("<svg")) return painted;
  if (!options.fontFamily && !options.fontWeight && !options.fontStyle) {
    return painted;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(painted, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") return painted;

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
  const svg = await renderMermaidSvg(source, options, renderMode);
  if (__MERMAID_EXT__ && isMermaidExtDeclaration(source)) {
    return svg;
  }
  return applyMarkedAspectFrame(source, svg);
}

async function renderMermaidSvg(
  source: string,
  options: MermaidRenderOptions,
  renderMode: RenderMode,
): Promise<string> {
  if (__MERMAID_EXT__ && isMermaidExtDeclaration(source)) {
    lastRenderUsedOnlineInk = false;
    return renderMermaidOfflineToSvg(source, options);
  }

  if (isOnlineRenderMode(renderMode)) {
    try {
      const svg = await renderMermaidOnlineToSvg(source, options);
      lastRenderUsedOnlineInk = true;
      return applyAppearanceToSvg(svg, options);
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
