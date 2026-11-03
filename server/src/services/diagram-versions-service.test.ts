import { describe, expect, it } from "vitest";
import { createDiagramVersion } from "../diagram-versions.js";
import {
  createMemoryDatabase,
  seedTestDiagram,
  seedTestUser,
} from "../test/memory-database.js";
import {
  listDiagramVersions,
  restoreDiagramVersion,
} from "./diagram-versions-service.js";

describe("diagram-versions-service", () => {
  it("lists versions in descending order", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const diagramId = seedTestDiagram(database, { source: "v0" });

    createDiagramVersion(database, diagramId, "user-1", "v1", "first");
    createDiagramVersion(database, diagramId, "user-1", "v2", "second");

    const versions = listDiagramVersions(database, diagramId);
    expect(versions).toHaveLength(2);
    expect(versions[0].version_number).toBe(2);
    expect(versions[1].version_number).toBe(1);
  });

  it("restores version and snapshots current source", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const diagramId = seedTestDiagram(database, { source: "current" });

    const version = createDiagramVersion(
      database,
      diagramId,
      "user-1",
      "restored-source",
      "backup",
    );

    const restored = restoreDiagramVersion(
      database,
      diagramId,
      version.id,
      "user-1",
    );

    expect(restored).not.toBeNull();
    expect(restored?.diagram.source).toBe("restored-source");

    const versions = listDiagramVersions(database, diagramId);
    expect(versions.some((row) => row.comment.includes("Before restore"))).toBe(
      true,
    );
  });

  it("returns null when diagram missing", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);

    expect(
      restoreDiagramVersion(database, "missing", "v1", "user-1"),
    ).toBeNull();
  });

  it("returns null when version missing", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const diagramId = seedTestDiagram(database);

    expect(
      restoreDiagramVersion(database, diagramId, "missing-version", "user-1"),
    ).toBeNull();
  });
});
