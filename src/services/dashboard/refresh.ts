import { isDiagramLanguage, type DiagramLanguage } from "@/constants/diagram-library";
import { readPermittedFile } from "@/services/local-data-link/file-access";
import { readSpreadsheetFileToTsv } from "@/services/local-data-link/read-spreadsheet";
import { applyTableFromClipboardText } from "@/services/table-paste";
import { getLocalDataLink, isActiveLocalDataLink } from "@/storage/local-data-links";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";

export interface DashboardZoneSource {
  id: string;
  source: string;
  fileName: string;
  language: string;
}

export interface DashboardRefreshResult {
  sources: Map<string, string>;
  missingDiagramIds: string[];
}

/**
 * Читает сохранённые файлы зон один раз на файл.
 * Окно «Открыть ссылку» не показывается. Нет файла — зона остаётся на исходнике.
 */
export async function refreshDashboardZoneSources(
  zones: DashboardZoneSource[],
): Promise<DashboardRefreshResult> {
  const sources = new Map<string, string>();
  const missingDiagramIds: string[] = [];
  const files = new Map<string, File>();

  for (const zone of zones) {
    sources.set(zone.id, zone.source);
    const link = await getLocalDataLink(zone.id);
    if (!link || !isActiveLocalDataLink(link) || !link.fileHandle) {
      if (link && isActiveLocalDataLink(link)) missingDiagramIds.push(zone.id);
      continue;
    }
    const fileKey = link.fileName || zone.id;
    let file = files.get(fileKey) ?? null;
    if (!file) {
      file = await readPermittedFile(link.fileHandle);
      if (file) files.set(fileKey, file);
    }
    if (!file) {
      missingDiagramIds.push(zone.id);
      continue;
    }
    try {
      const tsv = await readSpreadsheetFileToTsv(file, link.sheetRange, link.untilEmptyRow);
      const language = isDiagramLanguage(zone.language) ? zone.language : undefined;
      const format = resolveLibraryDiagramFormat(zone.source, zone.fileName, language as DiagramLanguage | undefined);
      const applied = applyTableFromClipboardText({
        clipboardText: tsv,
        source: zone.source,
        format,
      });
      if (applied.ok) sources.set(zone.id, applied.fullSource);
    } catch {
      missingDiagramIds.push(zone.id);
    }
  }

  return { sources, missingDiagramIds };
}
