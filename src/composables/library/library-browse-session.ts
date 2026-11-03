import type { Ref } from "vue";
import { LIBRARY_BROWSE_SESSION_KEY } from "@/constants/library-browse";
import type { BrowseStep, LibraryTab } from "@/composables/library/useLibraryBrowseFlow";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";

export interface LibraryBrowseSession {
  activeTab: LibraryTab;
  browseStep: BrowseStep;
  selectedSectionId: string | null;
  selectedDiagramId: string | null;
}

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

function isLibraryTab(value: unknown): value is LibraryTab {
  return (
    value === "browse" ||
    value === "upload" ||
    value === "transfer" ||
    value === "admin"
  );
}

function isBrowseStep(value: unknown): value is BrowseStep {
  return (
    value === "sections" ||
    value === "diagrams" ||
    value === "detail" ||
    value === "subscriptions"
  );
}

function parseSession(raw: string): LibraryBrowseSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LibraryBrowseSession>;
    if (!isLibraryTab(parsed.activeTab) || !isBrowseStep(parsed.browseStep)) {
      return null;
    }

    return {
      activeTab: parsed.activeTab,
      browseStep: parsed.browseStep,
      selectedSectionId:
        typeof parsed.selectedSectionId === "string" ||
        parsed.selectedSectionId === null
          ? parsed.selectedSectionId
          : null,
      selectedDiagramId:
        typeof parsed.selectedDiagramId === "string" ||
        parsed.selectedDiagramId === null
          ? parsed.selectedDiagramId
          : null,
    };
  } catch {
    return null;
  }
}

export function readLibraryBrowseSession(): LibraryBrowseSession | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(LIBRARY_BROWSE_SESSION_KEY);
  if (!raw) {
    return null;
  }

  return parseSession(raw);
}

export function saveLibraryBrowseSession(session: LibraryBrowseSession): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.setItem(LIBRARY_BROWSE_SESSION_KEY, JSON.stringify(session));
}

export function clearLibraryBrowseSession(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  sessionStorage.removeItem(LIBRARY_BROWSE_SESSION_KEY);
}

export async function restoreLibraryBrowseSession(
  session: LibraryBrowseSession,
  refs: {
    library: DiagramLibrary;
    activeTab: Ref<LibraryTab>;
    browseStep: Ref<BrowseStep>;
    resetBrowseFlow: () => void;
  },
): Promise<void> {
  const { library, activeTab, browseStep, resetBrowseFlow } = refs;

  activeTab.value = session.activeTab;

  if (session.activeTab !== "browse") {
    return;
  }

  if (session.browseStep === "sections") {
    browseStep.value = "sections";
    return;
  }

  if (session.browseStep === "subscriptions") {
    browseStep.value = "subscriptions";
    return;
  }

  try {
    if (session.browseStep === "diagrams" || session.browseStep === "detail") {
      await library.selectSection(session.selectedSectionId);
      browseStep.value = "diagrams";
    }

    if (session.browseStep === "detail" && session.selectedDiagramId) {
      await library.selectDiagram(session.selectedDiagramId);
      browseStep.value = "detail";
    }
  } catch {
    resetBrowseFlow();
  }
}
