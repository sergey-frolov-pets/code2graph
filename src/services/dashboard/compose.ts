import { getLibraryApiBaseUrl } from "@/config/library-api";
import type { DiagramDto } from "@/constants/diagram-library";
import { renderDiagram } from "@/formats";
import type { FormatContext } from "@/formats/types";
import { fetchDiagram } from "@/services/library/api/diagrams";
import { parseDashboard } from "@/services/mermaid/ext/engines/dashboard";
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
  const baseUrl = getLibraryApiBaseUrl();
  if (!baseUrl) return null;
  try {
    return await fetchDiagram(id, baseUrl);
  } catch {
    return null;
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
    return tryRenderExtension(source, {
      dark: context.diagramDarkMode,
      background: context.diagramBackground,
      textColor: context.diagramTextColor,
      fontFamily: context.diagramFontFamily,
      fontWeight: context.diagramFontWeight,
      fontStyle: context.diagramFontStyle,
      locale: context.locale,
    });
  }

  rendering.add(source);
  try {
    const zoneSvgs: Record<string, string> = {};
    for (const zone of parsed.value.zones) {
      if (zoneSvgs[zone.diagramId]) continue;
      const loaded = await loadDashboardDiagram(zone.diagramId);
      const childSource = zoneSources?.get(zone.diagramId) ?? loaded?.source;
      if (!childSource) continue;
      const language = loaded && isDiagramLanguage(loaded.language) ? loaded.language : undefined;
      const format = resolveLibraryDiagramFormat(
        childSource,
        loaded?.fileName,
        language,
      );
      try {
        zoneSvgs[zone.diagramId] = await renderDiagram(format, childSource, context);
      } catch {
        // Пустая подпись зоны вместо падения всего холста.
      }
    }
    const options: ExtRenderOptions = {
      dark: context.diagramDarkMode,
      background: context.diagramBackground,
      textColor: context.diagramTextColor,
      fontFamily: context.diagramFontFamily,
      fontWeight: context.diagramFontWeight,
      fontStyle: context.diagramFontStyle,
      locale: context.locale,
      zoneSvgs,
    };
    return tryRenderExtension(source, options);
  } finally {
    rendering.delete(source);
  }
}

export function providedZoneDiagrams(
  zones: DashboardZoneDiagram[],
): Map<string, string> {
  return new Map(zones.map((zone) => [zone.id, zone.source]));
}
