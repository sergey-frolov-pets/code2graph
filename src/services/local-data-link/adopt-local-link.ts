import type { DiagramDto } from "@/constants/diagram-library";
import {
  declinedDataLinkChoice,
  fileNameFromPathLabel,
  isDataLinkImportHostReady,
  offerDataLinkImport,
  type DataLinkImportChoice,
} from "@/services/local-data-link/import-offer";
import { parseDataLinkMarker } from "@/services/local-data-link/source-marker";
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
  const named = choice.fileName.trim();
  return named || fileNameFromPathLabel(choice.filePathLabel);
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

    const record: LocalDataLinkRecord = {
      diagramId: diagram.id,
      slug,
      filePathLabel: choice.filePathLabel.trim(),
      sheetRange: marker.sheetRange,
      untilEmptyRow: marker.untilEmptyRow,
      fileName: choiceFileName(choice),
      fileHandle: choice.fileHandle,
      inactive: !accepted,
    };
    await saveLocalDataLink(record);
    const updated = await syncDataLinkMarkerToDiagram(diagram.id, {
      slug,
      filePathLabel: record.filePathLabel,
      sheetRange: record.sheetRange,
      untilEmptyRow: record.untilEmptyRow,
    });
    return updated ?? stored;
  } catch {
    return (await loadDiagramDetailFromCache(diagram.id)) ?? diagram;
  }
}
