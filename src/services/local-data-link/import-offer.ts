import { ref } from "vue";
import type { DataLinkSourceMarker } from "@/services/local-data-link/source-marker";

export interface DataLinkImportChoice {
  accepted: boolean;
  slug: string;
  fileExtension: string;
  sheetRange: string;
  untilEmptyRow: boolean;
  fileName: string;
  fileHandle: FileSystemFileHandle | null;
}

interface DataLinkImportOffer {
  marker: DataLinkSourceMarker;
  resolve: (choice: DataLinkImportChoice) => void;
}

export const dataLinkImportOffer = ref<DataLinkImportOffer | null>(null);

const queue: DataLinkImportOffer[] = [];
let hostReady = false;

export function fileNameFromPathLabel(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "";
  }
  const parts = trimmed.split(/[/\\]/);
  return parts[parts.length - 1] ?? "";
}

export function declinedDataLinkChoice(
  marker: DataLinkSourceMarker,
): DataLinkImportChoice {
  return {
    accepted: false,
    slug: marker.slug,
    fileExtension: marker.fileExtension,
    sheetRange: marker.sheetRange,
    untilEmptyRow: marker.untilEmptyRow,
    fileName: "",
    fileHandle: null,
  };
}

export function isDataLinkImportHostReady(): boolean {
  return hostReady;
}

function pumpImportOffers(): void {
  if (!hostReady || dataLinkImportOffer.value || queue.length === 0) {
    return;
  }
  dataLinkImportOffer.value = queue.shift() ?? null;
}

export function setDataLinkImportHostReady(ready: boolean): void {
  hostReady = ready;
  if (ready) {
    pumpImportOffers();
  }
}

export function offerDataLinkImport(
  marker: DataLinkSourceMarker,
): Promise<DataLinkImportChoice> {
  return new Promise((resolve) => {
    queue.push({ marker, resolve });
    pumpImportOffers();
  });
}

export function settleDataLinkImport(choice: DataLinkImportChoice): void {
  const current = dataLinkImportOffer.value;
  if (!current) {
    return;
  }
  dataLinkImportOffer.value = null;
  current.resolve(choice);
  pumpImportOffers();
}

export function cancelPendingDataLinkImports(): void {
  const current = dataLinkImportOffer.value;
  dataLinkImportOffer.value = null;
  if (current) {
    current.resolve(declinedDataLinkChoice(current.marker));
  }
  while (queue.length > 0) {
    const next = queue.shift();
    if (next) {
      next.resolve(declinedDataLinkChoice(next.marker));
    }
  }
}
