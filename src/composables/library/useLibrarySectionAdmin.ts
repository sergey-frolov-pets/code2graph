import { computed, ref, type ComputedRef, type Ref } from "vue";
import { flattenSections } from "@/shared/library/section-tree";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import type { LibraryTab } from "./useLibraryBrowseFlow";
import type { BrowseStep } from "./useLibraryBrowseFlow";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

type SectionOption = {
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
};

export function useLibrarySectionAdmin(options: {
  library: DiagramLibrary;
  activeTab: Ref<LibraryTab>;
  browseStep: Ref<BrowseStep>;
  uploadError: Ref<string>;
  isAdmin: Ref<boolean>;
  onSectionPick: (sectionId: string | null) => Promise<void>;
  onTransferRefresh?: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  prompt: (options: {
    title: string;
    message: string;
    placeholder: string;
    confirmLabel: string;
  }) => Promise<string | null | undefined>;
  confirm: (options: {
    title: string;
    message: string;
    variant: "danger";
    confirmLabel: string;
  }) => Promise<boolean>;
}) {
  const {
    library,
    activeTab,
    browseStep,
    uploadError,
    isAdmin,
    onSectionPick,
    onTransferRefresh,
    t,
    prompt,
    confirm,
  } = options;

  const isSectionsEditMode = ref(false);
  const editingSectionId = ref<string | null>(null);
  const isSectionModalOpen = ref(false);
  const isSectionSaving = ref(false);

  const flatSectionOptions = computed(() =>
    flattenSections(library.sectionTree.value),
  );

  const sectionOptionsForModal: ComputedRef<SectionOption[]> = computed(() =>
    flatSectionOptions.value.map((section) => {
      const flat = library.flatSections.value.find((s) => s.id === section.id);
      return {
        ...section,
        parentId: flat?.parentId ?? null,
      };
    }),
  );

  const editingSection = computed(() => {
    if (!editingSectionId.value) {
      return null;
    }

    return (
      sectionOptionsForModal.value.find(
        (section) => section.id === editingSectionId.value,
      ) ?? null
    );
  });

  function toggleSectionsEditMode(): void {
    isSectionsEditMode.value = !isSectionsEditMode.value;
  }

  function openSectionEditor(sectionId: string): void {
    editingSectionId.value = sectionId;
    isSectionModalOpen.value = true;
  }

  function closeSectionEditor(): void {
    isSectionModalOpen.value = false;
    editingSectionId.value = null;
  }

  async function createSection(parentId: string | null): Promise<void> {
    if (parentId === null && !isAdmin.value) {
      uploadError.value = t("library.sharedSectionAdminOnly");
      return;
    }

    const title = await prompt({
      title: parentId ? t("library.addSubsection") : t("library.addSection"),
      message: t("library.sectionTitle"),
      placeholder: t("library.sectionTitle"),
      confirmLabel: t("app.create"),
    });
    if (!title?.trim()) return;
    try {
      await library.addSection({ title: title.trim(), parentId });
      if (activeTab.value === "transfer") {
        await onTransferRefresh?.();
      }
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncError");
    }
  }

  async function onSectionRowClick(sectionId: string): Promise<void> {
    if (isSectionsEditMode.value) {
      openSectionEditor(sectionId);
      return;
    }
    await onSectionPick(sectionId);
  }

  async function onAllSectionsClick(): Promise<void> {
    if (isSectionsEditMode.value) {
      return;
    }
    await onSectionPick(null);
  }

  async function saveSectionEdit(payload: {
    title: string;
    parentId: string | null;
  }): Promise<void> {
    if (!editingSectionId.value) {
      return;
    }

    isSectionSaving.value = true;
    uploadError.value = "";
    try {
      await library.editSection(editingSectionId.value, payload);
      closeSectionEditor();
      if (activeTab.value === "transfer") {
        await onTransferRefresh?.();
      }
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncError");
    } finally {
      isSectionSaving.value = false;
    }
  }

  async function onDeleteSection(
    sectionId: string,
    title: string,
  ): Promise<void> {
    const confirmed = await confirm({
      title: t("app.delete"),
      message: t("library.deleteSectionConfirm", { title }),
      variant: "danger",
      confirmLabel: t("app.delete"),
    });
    if (!confirmed) return;
    try {
      await library.removeSection(sectionId);
      if (activeTab.value === "transfer") {
        await onTransferRefresh?.();
      }
      if (library.selectedSectionId.value === sectionId) {
        browseStep.value = "sections";
      }
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.syncError");
    }
  }

  function resetSectionAdmin(): void {
    isSectionsEditMode.value = false;
    closeSectionEditor();
  }

  return {
    isSectionsEditMode,
    editingSectionId,
    isSectionModalOpen,
    isSectionSaving,
    flatSectionOptions,
    sectionOptionsForModal,
    editingSection,
    toggleSectionsEditMode,
    openSectionEditor,
    closeSectionEditor,
    createSection,
    onSectionRowClick,
    onAllSectionsClick,
    saveSectionEdit,
    onDeleteSection,
    resetSectionAdmin,
  };
}
