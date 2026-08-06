import { computed, ref, type Ref } from "vue";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { parseTagsInput } from "@/utils/library-tags";
import type { LibraryTab } from "./useLibraryBrowseFlow";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export function useLibraryUpload(options: {
  library: DiagramLibrary;
  activeTab: Ref<LibraryTab>;
  uploadError: Ref<string>;
  selectedSectionId: Ref<string | null>;
  resetBrowseFlow: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const {
    library,
    activeTab,
    uploadError,
    selectedSectionId,
    resetBrowseFlow,
    t,
  } = options;

  const uploadTitle = ref("");
  const uploadDescription = ref("");
  const uploadTags = ref("");
  const uploadSectionId = ref("");
  const uploadFile = ref<File | null>(null);
  const isUploading = ref(false);

  const maxSizeKb = computed(() => Math.round(MAX_PUML_FILE_BYTES / 1024));

  function onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    uploadError.value = "";
    if (!file) {
      uploadFile.value = null;
      return;
    }
    if (file.size > MAX_PUML_FILE_BYTES) {
      uploadError.value = t("library.fileTooLarge", { size: maxSizeKb.value });
      uploadFile.value = null;
      input.value = "";
      return;
    }
    uploadFile.value = file;
    if (!uploadTitle.value.trim()) {
      uploadTitle.value = file.name.replace(
        /\.(puml|plantuml|txt|mmd|mermaid|graphml)$/i,
        "",
      );
    }
  }

  async function submitUpload(): Promise<void> {
    uploadError.value = "";
    if (!uploadFile.value) {
      uploadError.value = t("library.noFile");
      return;
    }
    if (uploadFile.value.size > MAX_PUML_FILE_BYTES) {
      uploadError.value = t("library.fileTooLarge", { size: maxSizeKb.value });
      return;
    }
    isUploading.value = true;
    try {
      await library.addDiagramFromFile(uploadFile.value, {
        title: uploadTitle.value.trim() || undefined,
        description: uploadDescription.value.trim() || undefined,
        tags: parseTagsInput(uploadTags.value),
        sectionId: uploadSectionId.value || null,
      });
      uploadTitle.value = "";
      uploadDescription.value = "";
      uploadTags.value = "";
      uploadSectionId.value = selectedSectionId.value ?? "";
      uploadFile.value = null;
      activeTab.value = "browse";
      resetBrowseFlow();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncError");
    } finally {
      isUploading.value = false;
    }
  }

  function resetUploadSectionId(): void {
    uploadSectionId.value = selectedSectionId.value ?? "";
  }

  return {
    uploadTitle,
    uploadDescription,
    uploadTags,
    uploadSectionId,
    uploadFile,
    isUploading,
    maxSizeKb,
    onFileChange,
    submitUpload,
    resetUploadSectionId,
  };
}
