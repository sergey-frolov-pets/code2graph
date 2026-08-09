import { describe, expect, it } from "vitest";
import {
  parseCreateDiagramBody,
  parseCreateDiagramVersionBody,
  parseUpdateDiagramBody,
} from "./diagram-body.js";

describe("diagram-body schemas", () => {
  it("accepts minimal create body", () => {
    const result = parseCreateDiagramBody({ source: "@startuml\n@enduml" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source).toBe("@startuml\n@enduml");
    }
  });

  it("trims string fields on create", () => {
    const result = parseCreateDiagramBody({
      title: "  My Diagram  ",
      description: "  desc  ",
      source: "code",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("My Diagram");
      expect(result.data.description).toBe("desc");
    }
  });

  it("rejects invalid language on create", () => {
    const result = parseCreateDiagramBody({
      language: "invalid-lang",
      source: "code",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid visibility on create", () => {
    const result = parseCreateDiagramBody({
      visibility: "secret",
      source: "code",
    });
    expect(result.ok).toBe(false);
  });

  it("accepts partial update body", () => {
    const result = parseUpdateDiagramBody({ title: "Updated" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Updated");
      expect(result.data.source).toBeUndefined();
    }
  });

  it("accepts nullable sectionId on update", () => {
    const result = parseUpdateDiagramBody({ sectionId: null });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.sectionId).toBeNull();
    }
  });

  it("accepts version body with comment", () => {
    const result = parseCreateDiagramVersionBody({
      source: "new source",
      comment: " checkpoint ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.source).toBe("new source");
      expect(result.data.comment).toBe("checkpoint");
    }
  });

  it("accepts empty version body", () => {
    const result = parseCreateDiagramVersionBody({});
    expect(result.ok).toBe(true);
  });
});
