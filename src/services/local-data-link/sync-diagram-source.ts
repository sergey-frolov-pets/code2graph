import type { DiagramDto } from "@/constants/diagram-library";
import { DATA_LINK_SOURCE_UPDATED_EVENT } from "@/services/local-data-link/constants";
import {
  upsertDataLinkMarker,
  type DataLinkSourceMarker,
} from "@/services/local-data-link/source-marker";
import { detectDiagramFormat } from "@/utils/diagram-format";
import {
  loadDiagramDetailFromCache,
  updateLocalDiagram,
} from "@/storage/diagram-store";

export interface DataLinkMarkerUpdatedDetail {
  diagram: DiagramDto;
  previousSource: string;
  marker: DataLinkSourceMarker;
}

export function publishDataLinkMarkerUpdated(
  diagram: DiagramDto,
  previousSource: string,
  marker: DataLinkSourceMarker,
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<DataLinkMarkerUpdatedDetail>(DATA_LINK_SOURCE_UPDATED_EVENT, {
      detail: { diagram, previousSource, marker },
    }),
  );
}

export async function syncDataLinkMarkerToDiagram(
  diagramId: string,
  marker: DataLinkSourceMarker,
): Promise<DiagramDto | null> {
  const diagram = await loadDiagramDetailFromCache(diagramId);
  if (!diagram) {
    return null;
  }

  const format = detectDiagramFormat(diagram.source, diagram.fileName);
  const source = upsertDataLinkMarker(diagram.source, format, marker);
  const updated =
    source === diagram.source
      ? diagram
      : await updateLocalDiagram(diagramId, { source });
  publishDataLinkMarkerUpdated(updated, diagram.source, marker);
  return updated;
}
