import { ref, type Ref } from "vue";
import type { TranslateFn } from "@/locales/types";
import type { DiagramLanguage, DiagramVisibility } from "@/constants/diagram-library";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { parseTagsInput } from "@/utils/library-tags";
import type { BrowseStep } from "./useLibraryBrowseFlow";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export function useLibraryDiagramEdit(options: {
  library: DiagramLibrary;
  uploadError: Ref<string>;
  browseStep: Ref<BrowseStep>;
  t: TranslateFn;
  onOpenDiagram: (payload: {
    content: string;
    fileName: string;
    diagramId?: string;
  }) => void;
  onClose: () => void;
}) {
  const { library, uploadError, browseStep, t, onOpenDiagram, onClose } =
    options;

  const isEditing = ref(false);
  const isSaving = ref(false);
  const editTitle = ref("");
  const editDescription = ref("");
  const editTags = ref("");
  const editSectionId = ref("");
  const editVisibility = ref<DiagramVisibility>("all");
  const editLanguage = ref<DiagramLanguage>("plantuml");
  const editContentLocale = ref("");

  function resetEditForm(): void {
    isEditing.value = false;
    editTitle.value = "";
    editDescription.value = "";
    editTags.value = "";
    editSectionId.value = "";
    editLanguage.value = "plantuml";
    editContentLocale.value = "";
  }

  function startEdit(): void {
    if (!library.selectedDiagram.value) return;
    editTitle.value = library.selectedDiagram.value.title;
    editDescription.value = library.selectedDiagram.value.description;
    editTags.value = library.selectedDiagram.value.tags.join(", ");
    editSectionId.value = library.selectedDiagram.value.sectionId ?? "";
    editVisibility.value = library.selectedDiagram.value.visibility ?? "all";
    editLanguage.value = library.selectedDiagram.value.language ?? "plantuml";
    editContentLocale.value = library.selectedDiagram.value.contentLocale ?? "";
    isEditing.value = true;
  }

  async function saveEdit(): Promise<void> {
    if (!library.selectedDiagram.value) return;
    isSaving.value = true;
    uploadError.value = "";
    try {
      const tags = parseTagsInput(editTags.value);
      await library.updateDiagram(library.selectedDiagram.value.id, {
        title: editTitle.value.trim(),
        description: editDescription.value,
        tags,
        language: editLanguage.value,
        contentLocale: editContentLocale.value,
        sectionId: editSectionId.value || null,
        visibility: editVisibility.value,
      });
      resetEditForm();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncError");
    } finally {
      isSaving.value = false;
    }
  }

  function openInEditor(): void {
    if (!library.selectedDiagram.value) return;
    if (library.selectedDiagram.value.canDownload === false) return;
    onOpenDiagram({
      content: library.selectedDiagram.value.source,
      fileName: library.selectedDiagram.value.fileName,
      diagramId: library.selectedDiagram.value.id,
    });
    onClose();
  }

  async function onDeleteDiagram(
    diagramId: string,
    title: string,
    confirm: (options: {
      title: string;
      message: string;
      variant: "danger";
      confirmLabel: string;
    }) => Promise<boolean>,
    onTransferRefresh?: () => Promise<void>,
  ): Promise<void> {
    const confirmed = await confirm({
      title: t("app.delete"),
      message: t("library.deleteDiagramConfirm", { title }),
      variant: "danger",
      confirmLabel: t("app.delete"),
    });
    if (!confirmed) return;
    try {
      await library.removeDiagram(diagramId);
      resetEditForm();
      browseStep.value = "diagrams";
      await onTransferRefresh?.();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncError");
    }
  }

  return {
    isEditing,
    isSaving,
    editTitle,
    editDescription,
    editTags,
    editSectionId,
    editVisibility,
    editLanguage,
    editContentLocale,
    resetEditForm,
    startEdit,
    saveEdit,
    openInEditor,
    onDeleteDiagram,
  };
}
