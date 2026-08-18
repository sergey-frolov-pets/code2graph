import { unzipSync } from "fflate";
import { CODE_GRAPH_MAX_ZIP_BYTES } from "@/constants/code-graph";
import type { RawProjectFile } from "@/services/code-graph/ingest/project-files";

function decodeFileContent(data: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(data);
}

export function extractProjectFromZip(
  buffer: ArrayBuffer,
  rootName: string,
): { rootName: string; files: RawProjectFile[] } {
  if (buffer.byteLength > CODE_GRAPH_MAX_ZIP_BYTES) {
    throw new Error("CODE_GRAPH_ZIP_TOO_LARGE");
  }

  const archive = unzipSync(new Uint8Array(buffer));
  const files: RawProjectFile[] = [];

  for (const [path, data] of Object.entries(archive)) {
    if (path.endsWith("/")) {
      continue;
    }

    if (path.includes("..")) {
      continue;
    }

    files.push({
      relativePath: path,
      content: decodeFileContent(data),
    });
  }

  return {
    rootName: rootName.replace(/\.zip$/i, "") || "project",
    files,
  };
}
