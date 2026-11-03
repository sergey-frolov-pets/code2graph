import { describe, expect, it } from "vitest";
import {
  createMemoryDatabase,
  seedTestDiagram,
  seedTestUser,
} from "../test/memory-database.js";
import {
  deleteDiagramById,
  findDiagramById,
  insertDiagram,
  updateDiagramRecord,
  updateDiagramSource,
} from "./diagrams-service.js";

describe("diagrams-service", () => {
  it("returns null for missing diagram", () => {
    const database = createMemoryDatabase();
    expect(findDiagramById(database, "missing")).toBeNull();
  });

  it("inserts and finds diagram", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);

    const row = insertDiagram(database, {
      id: "d1",
      sectionId: null,
      title: "API Flow",
      description: "desc",
      tags: ["api"],
      language: "plantuml",
      contentLocale: "",
      source: "@startuml\nA -> B\n@enduml",
      fileName: "flow.puml",
      byteSize: 24,
      authorId: "user-1",
      ownerId: "user-1",
      visibility: "personal",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(row.id).toBe("d1");
    expect(row.title).toBe("API Flow");
    expect(findDiagramById(database, "d1")?.title).toBe("API Flow");
  });

  it("updates diagram record", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const id = seedTestDiagram(database, { id: "d2", title: "Old" });

    const updated = updateDiagramRecord(database, id, {
      sectionId: null,
      title: "New Title",
      description: "updated",
      tags: ["x"],
      language: "plantuml",
      contentLocale: "",
      source: "@startuml\n@enduml",
      fileName: "diagram.puml",
      byteSize: 16,
      visibility: "personal",
      updatedAt: "2026-02-01T00:00:00.000Z",
    });

    expect(updated?.title).toBe("New Title");
    expect(updated?.description).toBe("updated");
  });

  it("returns null when update target missing", () => {
    const database = createMemoryDatabase();
    const result = updateDiagramRecord(database, "ghost", {
      sectionId: null,
      title: "x",
      description: "",
      tags: [],
      language: "plantuml",
      contentLocale: "",
      source: "s",
      fileName: "f.puml",
      byteSize: 1,
      visibility: "all",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result).toBeNull();
  });

  it("updates diagram source only", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const id = seedTestDiagram(database, { source: "old" });

    const updated = updateDiagramSource(
      database,
      id,
      "new source",
      10,
      "2026-03-01T00:00:00.000Z",
    );

    expect(updated?.source).toBe("new source");
    expect(updated?.byte_size).toBe(10);
  });

  it("deletes diagram by id", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const id = seedTestDiagram(database);

    expect(deleteDiagramById(database, id)).toBe(true);
    expect(findDiagramById(database, id)).toBeNull();
    expect(deleteDiagramById(database, id)).toBe(false);
  });
});
