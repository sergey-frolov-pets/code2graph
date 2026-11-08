const SPREADSHEET_TYPES = [
  {
    description: "Spreadsheet",
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
  },
];

export type PickSpreadsheetResult =
  | { status: "picked"; handle: FileSystemFileHandle }
  | { status: "cancelled" }
  | { status: "unsupported" };

export async function readPermittedFile(
  handle: FileSystemFileHandle,
): Promise<File | null> {
  const descriptor = { mode: "read" as const };
  let permission = await handle.queryPermission(descriptor);
  if (permission !== "granted") {
    permission = await handle.requestPermission(descriptor);
  }
  if (permission !== "granted") {
    return null;
  }
  return handle.getFile();
}

export async function pickSpreadsheetFile(
  startIn?: FileSystemFileHandle | null,
): Promise<PickSpreadsheetResult> {
  if (typeof window.showOpenFilePicker !== "function") {
    return { status: "unsupported" };
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      excludeAcceptAllOption: false,
      types: SPREADSHEET_TYPES,
      ...(startIn ? { startIn } : {}),
    });
    return handle ? { status: "picked", handle } : { status: "cancelled" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "cancelled" };
    }
    throw error;
  }
}
