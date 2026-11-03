// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveOpenKind, trackOpen } from "@/analytics/goatcounter";

describe("resolveOpenKind", () => {
  it("uses the detected diagram format when the app can render the file", () => {
    expect(resolveOpenKind("flow.mmd", "mermaid")).toBe("diagram-mermaid");
    expect(resolveOpenKind("schema.graphml", "graphml")).toBe("diagram-graphml");
  });

  it("falls back to the file extension for formats the app cannot render", () => {
    expect(resolveOpenKind("photo.PNG", null)).toBe("file-png");
    expect(resolveOpenKind("notes.md", null)).toBe("file-md");
  });

  it("reports unknown when there is no extension at all", () => {
    expect(resolveOpenKind("README", null)).toBe("file-unknown");
    expect(resolveOpenKind("  ", null)).toBe("file-unknown");
  });
});

describe("trackOpen", () => {
  const count = vi.fn();

  beforeEach(() => {
    count.mockReset();
    window.goatcounter = { count };
  });

  afterEach(() => {
    delete window.goatcounter;
  });

  it("prefixes the kind with open- and flags the hit as an event", () => {
    trackOpen("diagram-mermaid");
    expect(count).toHaveBeenCalledWith({
      path: "open-diagram-mermaid",
      title: "open-diagram-mermaid",
      event: true,
    });
  });

  it("keeps a custom title when given", () => {
    trackOpen("file-png", "Open file: file-png");
    expect(count).toHaveBeenCalledWith({
      path: "open-file-png",
      title: "Open file: file-png",
      event: true,
    });
  });

  it("stays silent when the tracker is not loaded", () => {
    delete window.goatcounter;
    expect(() => trackOpen("diagram-d2")).not.toThrow();
    expect(count).not.toHaveBeenCalled();
  });
});
