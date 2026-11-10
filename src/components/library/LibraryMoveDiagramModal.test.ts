// @vitest-environment jsdom

import { createApp, h, nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import LibraryMoveDiagramModal from "@/components/library/LibraryMoveDiagramModal.vue";

const sections = [
  { id: "archive", title: "Архив", depth: 0 },
  { id: "drafts", title: "Черновики", depth: 0 },
];

function mountModal(onSave: (sectionId: string | null) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp({
    setup() {
      return () =>
        h(LibraryMoveDiagramModal, {
          open: true,
          diagramTitle: "Схема оплаты",
          currentSectionId: "archive",
          currentSectionTitle: "Архив",
          sections,
          isSaving: false,
          onSave,
        });
    },
  });
  app.mount(host);
  return {
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("LibraryMoveDiagramModal", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("keeps move disabled until another section is chosen", async () => {
    const saved: Array<string | null> = [];
    const view = mountModal((sectionId) => {
      saved.push(sectionId);
    });

    const dialog = document.querySelector("[data-testid='library-move-diagram-modal']");
    expect(dialog?.textContent).toContain("Схема оплаты");
    expect(dialog?.textContent).toContain("Архив");

    const moveButton = document.querySelector(".btn-primary");
    expect(moveButton).toBeInstanceOf(HTMLButtonElement);
    expect((moveButton as HTMLButtonElement).disabled).toBe(true);

    const select = document.querySelector("select");
    expect(select).toBeInstanceOf(HTMLSelectElement);
    (select as HTMLSelectElement).value = "drafts";
    select?.dispatchEvent(new Event("change"));
    await nextTick();

    expect((moveButton as HTMLButtonElement).disabled).toBe(false);
    (moveButton as HTMLButtonElement).click();
    await nextTick();

    expect(saved).toEqual(["drafts"]);
    view.unmount();
  });
});
