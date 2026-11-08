interface FileSystemPermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(
    descriptor?: FileSystemPermissionDescriptor,
  ): Promise<PermissionState>;
  requestPermission(
    descriptor?: FileSystemPermissionDescriptor,
  ): Promise<PermissionState>;
}

interface ShowOpenFilePickerOptions {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  startIn?: FileSystemHandle | "desktop" | "documents" | "downloads";
}

interface Window {
  showOpenFilePicker(
    options?: ShowOpenFilePickerOptions,
  ): Promise<FileSystemFileHandle[]>;
}
