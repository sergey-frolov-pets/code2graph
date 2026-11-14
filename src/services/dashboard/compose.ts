import { getLibraryApiBaseUrl } from "@/config/library-api";
import type { DiagramDto } from "@/constants/diagram-library";
import { renderDiagram } from "@/formats";
import type { FormatContext } from "@/formats/types";
import { fetchDiagram } from "@/services/library/api/diagrams";
import { fetchPublicLibraryLink } from "@/services/library/api/library-links";
import {
  dashboardCellKey,
  parseDashboard,
  type DashboardCell,
} from "@/services/mermaid/ext/engines/dashboard";
import { tryRenderExtension } from "@/services/mermaid/ext";
import type { ExtRenderOptions } from "@/services/mermaid/ext/types";
import { loadDiagramDetailFromCache } from "@/storage/diagram-store";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";
import { isDiagramLanguage } from "@/constants/diagram-library";

export interface DashboardZoneDiagram {
  id: string;
  source: string;
  fileName: string;
  language: string;
  title?: string;
}

const rendering = new Set<string>();

export async function loadDashboardDiagram(id: string): Promise<DiagramDto | null> {
  const cached = await loadDiagramDetailFromCache(id);
  if (cached) return cached;
  return loadServerDiagram(id);
}

/** Серверная копия диаграммы, а если сервер недоступен — локальный кэш. */
export async function loadDashboardDiagramFresh(id: string): Promise<DiagramDto | null> {
  const remote = await loadServerDiagram(id);
  if (remote) return remote;
  return loadDiagramDetailFromCache(id);
}

async function loadServerDiagram(id: string): Promise<DiagramDto | null> {
  const baseUrl = getLibraryApiBaseUrl();
  if (!baseUrl) return null;
  try {
    return await fetchDiagram(id, baseUrl);
  } catch {
    return null;
  }
}

function extensionOptions(context: FormatContext, zoneSvgs?: Record<string, string>): ExtRenderOptions {
  return {
    dark: context.diagramDarkMode,
    background: context.diagramBackground,
    textColor: context.diagramTextColor,
    fontFamily: context.diagramFontFamily,
    fontWeight: context.diagramFontWeight,
    fontStyle: context.diagramFontStyle,
    locale: context.locale,
    zoneSvgs,
  };
}

async function renderChild(
  source: string,
  fileName: string | undefined,
  language: string | undefined,
  context: FormatContext,
): Promise<string | null> {
  const known = language && isDiagramLanguage(language) ? language : undefined;
  const format = resolveLibraryDiagramFormat(source, fileName, known);
  try {
    return await renderDiagram(format, source, context);
  } catch {
    return null;
  }
}

function splitLinkRef(ref: string): { username: string; slug: string } | null {
  const slash = ref.indexOf("/");
  if (slash <= 0 || slash === ref.length - 1) return null;
  return { username: ref.slice(0, slash), slug: ref.slice(slash + 1) };
}

async function svgForCell(
  cell: DashboardCell,
  context: FormatContext,
  zoneSources: Map<string, string> | undefined,
  zoneSvgs: Record<string, string>,
): Promise<void> {
  const key = dashboardCellKey(cell);
  if (zoneSvgs[key]) return;
  if (cell.kind === "diagram") {
    const loaded = await loadDashboardDiagram(cell.ref);
    const childSource = zoneSources?.get(cell.ref) ?? loaded?.source;
    if (!childSource) return;
    const svg = await renderChild(childSource, loaded?.fileName, loaded?.language, context);
    if (svg) zoneSvgs[key] = svg;
    return;
  }
  const names = splitLinkRef(cell.ref);
  const baseUrl = getLibraryApiBaseUrl();
  if (!names || !baseUrl) return;
  try {
    const payload = await fetchPublicLibraryLink(names.username, names.slug, baseUrl);
    if (payload.delivery === "view" && payload.svg.includes("<svg")) {
      zoneSvgs[key] = payload.svg;
      return;
    }
    const diagram = payload.diagram;
    if (!diagram?.source) return;
    const childSource = zoneSources?.get(diagram.id) ?? diagram.source;
    const svg = await renderChild(childSource, diagram.fileName, diagram.language, context);
    if (svg) zoneSvgs[key] = svg;
  } catch {
    // Пустая ячейка вместо падения всего холста.
  }
}

/**
 * Собирает SVG дашборда. Повтор того же исходника в стеке (цикл зон) рисует пустые зоны.
 */
export async function composeDashboardSvg(
  source: string,
  context: FormatContext,
  zoneSources?: Map<string, string>,
): Promise<string | null> {
  const parsed = parseDashboard(source);
  if (!parsed.ok || !parsed.value) return null;
  if (rendering.has(source)) {
    return tryRenderExtension(source, extensionOptions(context));
  }

  rendering.add(source);
  try {
    const zoneSvgs: Record<string, string> = {};
    for (const cell of parsed.value.cells) {
      await svgForCell(cell, context, zoneSources, zoneSvgs);
    }
    return tryRenderExtension(source, extensionOptions(context, zoneSvgs));
  } finally {
    rendering.delete(source);
  }
}

export function providedZoneDiagrams(
  zones: DashboardZoneDiagram[],
): Map<string, string> {
  return new Map(zones.map((zone) => [zone.id, zone.source]));
}
