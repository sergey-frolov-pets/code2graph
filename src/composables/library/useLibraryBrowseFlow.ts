import { computed, type ComputedRef, type Ref } from "vue";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import { FAVORITES_SECTION_ID, RATINGS_SECTION_ID } from "@/constants/diagram-library";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";

export type LibraryTab = "browse" | "upload" | "transfer" | "admin";
export type BrowseStep = "sections" | "diagrams" | "detail";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export function useLibraryBrowseFlow(options: {
  library: DiagramLibrary;
  activeTab: Ref<LibraryTab>;
  browseStep: Ref<BrowseStep>;
  flatSectionOptions: ComputedRef<FlatSectionOption[]>;
  resetEditForm: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { library, activeTab, browseStep, flatSectionOptions, resetEditForm, t } =
    options;

  const showBackButton = computed(
    () => activeTab.value === "browse" && browseStep.value !== "sections",
  );

  const showModeTabs = computed(
    () => activeTab.value !== "browse" || browseStep.value === "sections",
  );

  const headerTitle = computed(() => {
    if (activeTab.value === "upload") return t("library.uploadDiagram");
    if (activeTab.value === "transfer") return t("library.transfer");
    if (activeTab.value === "admin") return t("library.adminUsersTitle");
    if (browseStep.value === "sections") return t("library.chooseSection");
    if (browseStep.value === "diagrams") {
      if (library.selectedSectionId.value === FAVORITES_SECTION_ID) {
        return t("library.favorites");
      }
      if (library.selectedSectionId.value === RATINGS_SECTION_ID) {
        return t("library.ratings");
      }
      if (library.selectedSectionId.value === null) {
        return t("library.allSections");
      }
      const section = flatSectionOptions.value.find(
        (item) => item.id === library.selectedSectionId.value,
      );
      return section?.title ?? t("library.chooseDiagram");
    }
    if (library.selectedDiagram.value) {
      return library.selectedDiagram.value.title;
    }
    return t("library.title");
  });

  function resetBrowseFlow(): void {
    browseStep.value = "sections";
    resetEditForm();
  }

  function goBack(): void {
    if (browseStep.value === "detail") {
      browseStep.value = "diagrams";
      resetEditForm();
      return;
    }
    if (browseStep.value === "diagrams") {
      browseStep.value = "sections";
      resetEditForm();
    }
  }

  async function onSectionPick(sectionId: string | null): Promise<void> {
    await library.selectSection(sectionId);
    browseStep.value = "diagrams";
  }

  async function onDiagramPick(diagramId: string): Promise<void> {
    await library.selectDiagram(diagramId);
    browseStep.value = "detail";
  }

  return {
    browseStep,
    showBackButton,
    showModeTabs,
    headerTitle,
    resetBrowseFlow,
    goBack,
    onSectionPick,
    onDiagramPick,
  };
}
