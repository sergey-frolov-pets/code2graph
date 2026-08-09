import { afterEach, describe, expect, it, vi } from "vitest";
import { LIBRARY_BROWSE_SESSION_KEY } from "@/constants/library-browse";
import {
  clearLibraryBrowseSession,
  readLibraryBrowseSession,
  saveLibraryBrowseSession,
} from "@/composables/library/library-browse-session";

const storage = new Map<string, string>();

vi.stubGlobal("sessionStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
});

afterEach(() => {
  storage.clear();
});

describe("library-browse-session", () => {
  it("saves and reads browse session", () => {
    saveLibraryBrowseSession({
      activeTab: "browse",
      browseStep: "diagrams",
      selectedSectionId: "section-1",
      selectedDiagramId: null,
    });

    expect(readLibraryBrowseSession()).toEqual({
      activeTab: "browse",
      browseStep: "diagrams",
      selectedSectionId: "section-1",
      selectedDiagramId: null,
    });
  });

  it("returns null for invalid payload", () => {
    storage.set(LIBRARY_BROWSE_SESSION_KEY, '{"activeTab":"invalid"}');
    expect(readLibraryBrowseSession()).toBeNull();
  });

  it("clears stored session", () => {
    saveLibraryBrowseSession({
      activeTab: "upload",
      browseStep: "sections",
      selectedSectionId: null,
      selectedDiagramId: null,
    });

    clearLibraryBrowseSession();
    expect(readLibraryBrowseSession()).toBeNull();
  });
});
