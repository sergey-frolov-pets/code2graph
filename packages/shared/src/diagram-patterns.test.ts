import { describe, expect, it } from "vitest";
import {
  detectDiagramPattern,
  getDiagramPattern,
  listDiagramPatterns,
} from "./diagram-patterns.js";

describe("diagram patterns", () => {
  it("maps statuses and transitions to a state diagram", () => {
    const match = detectDiagramPattern("покажи статусы заявки и переходы между ними");
    expect(match?.pattern).toBe("lifecycle-phase");
    expect(match?.type).toBe("state");
  });

  it("maps a queue with consumers to a sequence", () => {
    const match = detectDiagramPattern("producers send events to Kafka, consumers fan-in");
    expect(match?.pattern).toBe("fan-in-queue");
    expect(match?.type).toBe("sequence");
  });

  it("needs a policy cue together with allow/deny", () => {
    expect(detectDiagramPattern("политика доступа к сервису")).toBeNull();
    expect(
      detectDiagramPattern("политика доступа: что разрешено, что запрещено")?.pattern,
    ).toBe("paired-policy-traces");
  });

  it("maps a governance registry with owners to an ER model", () => {
    const match = detectDiagramPattern(
      "реестр сервисов: владелец, SLA, аттестация",
    );
    expect(match?.pattern).toBe("governance-catalog");
    expect(match?.type).toBe("er");
  });

  it("maps the paved road to components", () => {
    expect(detectDiagramPattern("secure paved road для нового сервиса")?.type).toBe(
      "component",
    );
  });

  it("returns null for a plain request", () => {
    expect(detectDiagramPattern("диаграмма классов интернет-магазина")).toBeNull();
    expect(detectDiagramPattern("   ")).toBeNull();
  });

  it("resolves a pattern by id", () => {
    expect(getDiagramPattern("lifecycle-phase")?.type).toBe("state");
    expect(getDiagramPattern("nope")).toBeNull();
    expect(listDiagramPatterns().map((item) => item.pattern)).toContain("fan-in-queue");
  });
});
