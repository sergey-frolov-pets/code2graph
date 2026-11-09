import type { DiagramDto } from "@/constants/diagram-library";
import {
  declinedDataLinkChoice,
  fileNameFromPathLabel,
  isDataLinkImportHostReady,
  offerDataLinkImport,
  type DataLinkImportChoice,
} from "@/services/local-data-link/import-offer";
import {
  normalizeDataLinkExtension,
  parseDataLinkMarker,
} from "@/services/local-data-link/source-marker";
import { syncDataLinkMarkerToDiagram } from "@/services/local-data-link/sync-diagram-source";
import { loadDiagramDetailFromCache } from "@/storage/diagram-store";
import {
  findLocalDataLinkBySlug,
  getLocalDataLink,
  isDataLinkSlug,
  normalizeDataLinkSlug,
  saveLocalDataLink,
  type LocalDataLinkRecord,
} from "@/storage/local-data-links";

function choiceFileName(choice: DataLinkImportChoice): string {
  return fileNameFromPathLabel(choice.fileName);
}

export async function adoptLocalDataLinkForDiagram(
  diagram: DiagramDto,
): Promise<DiagramDto> {
  try {
    const stored = (await loadDiagramDetailFromCache(diagram.id)) ?? diagram;
    const marker = parseDataLinkMarker(stored.source);
    if (!marker) {
      return stored;
    }

    const existing = await getLocalDataLink(diagram.id);
    if (existing) {
      return stored;
    }

    const choice = isDataLinkImportHostReady()
      ? await offerDataLinkImport(marker)
      : declinedDataLinkChoice(marker);
    const slug = normalizeDataLinkSlug(choice.slug);
    if (!isDataLinkSlug(slug)) {
      return stored;
    }

    let accepted = choice.accepted;
    if (accepted) {
      const taken = await findLocalDataLinkBySlug(slug);
      if (taken && taken.diagramId !== diagram.id) {
        accepted = false;
      }
    }

    const fileName = choiceFileName(choice);
    const record: LocalDataLinkRecord = {
      diagramId: diagram.id,
      slug,
      filePathLabel: fileName,
      sheetRange: choice.sheetRange.trim() || marker.sheetRange,
      untilEmptyRow: choice.untilEmptyRow,
      fileName,
      fileHandle: choice.fileHandle,
      inactive: !accepted,
    };
    await saveLocalDataLink(record);
    const updated = await syncDataLinkMarkerToDiagram(diagram.id, {
      slug,
      fileExtension: normalizeDataLinkExtension(
        choice.fileExtension || fileName,
      ),
      sheetRange: record.sheetRange,
      untilEmptyRow: record.untilEmptyRow,
    });
    return updated ?? stored;
  } catch {
    return (await loadDiagramDetailFromCache(diagram.id)) ?? diagram;
  }
}
