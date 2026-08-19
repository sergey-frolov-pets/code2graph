import type { RawProjectFile } from "@/services/code-graph/ingest/project-files";

type DirectoryHandleLike = {
  name: string;
  entries: () => AsyncIterable<[string, FileSystemHandle]>;
};

export async function readProjectFromDirectoryHandle(
  directoryHandle: DirectoryHandleLike,
  basePath = "",
): Promise<RawProjectFile[]> {
  const files: RawProjectFile[] = [];

  for await (const [name, handle] of directoryHandle.entries()) {
    const relativePath = basePath ? `${basePath}/${name}` : name;

    if (handle.kind === "directory") {
      const nested = await readProjectFromDirectoryHandle(
        handle as unknown as DirectoryHandleLike,
        relativePath,
      );
      files.push(...nested);
      continue;
    }

    const fileHandle = handle as FileSystemFileHandle;
    const file = await fileHandle.getFile();
    const content = await file.text();
    files.push({ relativePath, content });
  }

  return files;
}

export async function readProjectFromFileList(
  fileList: FileList,
): Promise<{ rootName: string; files: RawProjectFile[] }> {
  const files: RawProjectFile[] = [];
  let rootName = "project";

  for (const file of Array.from(fileList)) {
    const relativePath = file.webkitRelativePath || file.name;
    if (!rootName && file.webkitRelativePath) {
      rootName = file.webkitRelativePath.split("/")[0] ?? "project";
    }
    files.push({
      relativePath,
      content: await file.text(),
    });
  }

  if (files[0]?.relativePath.includes("/")) {
    rootName = files[0].relativePath.split("/")[0] ?? "project";
  }

  return { rootName, files };
}

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickLocalProjectFolder(): Promise<{
  rootName: string;
  files: RawProjectFile[];
}> {
  if (!isFileSystemAccessSupported()) {
    throw new Error("CODE_GRAPH_FOLDER_PICKER_UNSUPPORTED");
  }

  const pickerWindow = window as Window & {
    showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
  };

  const handle = await pickerWindow.showDirectoryPicker?.();
  if (!handle) {
    throw new Error("CODE_GRAPH_FOLDER_PICKER_UNSUPPORTED");
  }
  const files = await readProjectFromDirectoryHandle(handle);
  return { rootName: handle.name, files };
}
