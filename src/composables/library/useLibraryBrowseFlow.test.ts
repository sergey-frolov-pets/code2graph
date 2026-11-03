import { computed, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useLibraryBrowseFlow } from "@/composables/library/useLibraryBrowseFlow";

const t = (key: string) => key;

function createBrowseFlow(options?: {
  browseStep?: "sections" | "diagrams" | "detail" | "subscriptions";
  sectionId?: string | null;
  diagramTitle?: string | null;
}) {
  const browseStep = ref(options?.browseStep ?? "sections");
  const selectedSectionId = ref(options?.sectionId ?? null);
  const selectedDiagram = ref(
    options?.diagramTitle
      ? { id: "diagram-1", title: options.diagramTitle }
      : null,
  );

  return useLibraryBrowseFlow({
    library: {
      selectedSectionId,
      selectedDiagram,
      selectSection: vi.fn(),
      selectDiagram: vi.fn(),
    } as never,
    activeTab: ref("browse"),
    browseStep,
    flatSectionOptions: computed(() => [
      { id: "section-backend", title: "Backend", depth: 0 },
    ]),
    resetEditForm: vi.fn(),
    t,
  });
}

describe("useLibraryBrowseFlow breadcrumbs", () => {
  it("shows only root on sections step", () => {
    const flow = createBrowseFlow({ browseStep: "sections" });

    expect(flow.breadcrumbItems.value).toEqual([
      { label: "library.allSections" },
    ]);
  });

  it("shows section name on diagrams step", () => {
    const flow = createBrowseFlow({
      browseStep: "diagrams",
      sectionId: "section-backend",
    });

    expect(flow.breadcrumbItems.value).toEqual([
      {
        label: "library.allSections",
        action: expect.any(Function),
      },
      { label: "Backend" },
    ]);
  });

  it("shows section and diagram on detail step without duplicate labels", () => {
    const flow = createBrowseFlow({
      browseStep: "detail",
      sectionId: "section-backend",
      diagramTitle: "api.puml",
    });

    expect(flow.breadcrumbItems.value).toEqual([
      {
        label: "library.allSections",
        action: expect.any(Function),
      },
      {
        label: "Backend",
        action: expect.any(Function),
      },
      { label: "api.puml" },
    ]);
  });

  it("navigates back to diagrams when section breadcrumb is activated on detail", () => {
    const flow = createBrowseFlow({
      browseStep: "detail",
      sectionId: "section-backend",
      diagramTitle: "api.puml",
    });

    const sectionCrumb = flow.breadcrumbItems.value[1];
    sectionCrumb.action?.();

    expect(flow.browseStep.value).toBe("diagrams");
  });
});
