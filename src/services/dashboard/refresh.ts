import { isDiagramLanguage, type DiagramLanguage } from "@/constants/diagram-library";
import { readPermittedFile } from "@/services/local-data-link/file-access";
import { readSpreadsheetFileToTsv } from "@/services/local-data-link/read-spreadsheet";
import { parseDataLinkMarker } from "@/services/local-data-link/source-marker";
import { applyTableFromClipboardText } from "@/services/table-paste";
import {
  findLocalDataLinkBySlug,
  getLocalDataLink,
  isActiveLocalDataLink,
  type LocalDataLinkRecord,
} from "@/storage/local-data-links";
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

function firstNumber(tsv: string): number | null {
  const match = tsv.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;
  const value = Number(match[0].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Инфографика и гауч берут первое число таблицы в `value`. */
function applyScalarValue(source: string, value: number): string | null {
  const head = source.split(/\r?\n/).find((line) => {
    const trimmed = line.trim();
    return trimmed.length > 0 && !trimmed.startsWith("%%");
  });
  if (!head || !/^(infographic|gauge)\b/i.test(head.trim())) return null;
  if (/^value\b/im.test(source)) return source.replace(/^value\b.*$/im, `value ${value}`);
  return `${source.trimEnd()}\nvalue ${value}\n`;
}

async function linkForZone(zone: DashboardZoneSource): Promise<LocalDataLinkRecord | null> {
  const marker = parseDataLinkMarker(zone.source);
  const byId = await getLocalDataLink(zone.id);
  const bySlug = marker?.slug ? await findLocalDataLinkBySlug(marker.slug) : null;
  const link = (byId && isActiveLocalDataLink(byId) && byId.fileHandle ? byId : null)
    ?? (bySlug && isActiveLocalDataLink(bySlug) ? bySlug : null)
    ?? (byId && isActiveLocalDataLink(byId) ? byId : null);
  if (!link) return null;
  return {
    ...link,
    sheetRange: marker?.sheetRange || link.sheetRange,
    untilEmptyRow: marker?.untilEmptyRow ?? link.untilEmptyRow,
  };
}

/**
 * Читает файлы настроенных ссылок зон один раз на файл.
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
    const link = await linkForZone(zone);
    if (!link || !isActiveLocalDataLink(link) || !link.fileHandle) {
      if (link && isActiveLocalDataLink(link)) missingDiagramIds.push(zone.id);
      continue;
    }
    const fileKey = link.fileName || link.slug || zone.id;
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
      if (applied.ok) {
        sources.set(zone.id, applied.fullSource);
        continue;
      }
      const scalar = firstNumber(tsv);
      const next = scalar === null ? null : applyScalarValue(zone.source, scalar);
      if (next) sources.set(zone.id, next);
      else missingDiagramIds.push(zone.id);
    } catch {
      missingDiagramIds.push(zone.id);
    }
  }

  return { sources, missingDiagramIds };
}
