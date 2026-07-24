import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import { downloadTextFile } from "@/utils/export";
import { LocalizedAppError } from "@/utils/localized-app-error";

export const PUML_MIME_TYPE = "application/vnd.plantuml";

export const PUML_FILE_ACCEPT = ".puml,.plantuml,.txt";

export const PUML_FILE_EXTENSIONS = [".puml", ".plantuml", ".txt"] as const;

export function isPumlFileName(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return PUML_FILE_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new LocalizedAppError("file.readTextFailed"));
    };
    reader.onerror = () => reject(new LocalizedAppError("file.readError"));
    reader.readAsText(file, "utf-8");
  });
}

export function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "diagram.puml";
  }

  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
}

export function assertPumlFileSize(file: File, maxBytes = MAX_PUML_FILE_BYTES): void {
  if (file.size > maxBytes) {
    const maxKb = Math.round(maxBytes / 1024);
    throw new LocalizedAppError("file.tooLarge", { size: maxKb });
  }
}

export async function loadPumlFromFile(file: File): Promise<{
  content: string;
  fileName: string;
}> {
  assertPumlFileSize(file);
  const content = await readFileAsText(file);
  if (!content.trim()) {
    throw new LocalizedAppError("file.empty");
  }

  return {
    content,
    fileName: sanitizeFileName(file.name),
  };
}

export function resolvePumlFileName(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  if (isPumlFileName(sanitized)) {
    return sanitized;
  }

  const withoutExtension = sanitized.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "diagram"}.puml`;
}

export function savePumlSource(source: string, fileName: string): void {
  downloadTextFile(source, resolvePumlFileName(fileName), PUML_MIME_TYPE);
}
