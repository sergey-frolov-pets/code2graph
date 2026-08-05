import { describe, expect, it } from "vitest";
import { LocalizedAppError } from "@/utils/localized-app-error";
import {
  assertPumlFileSize,
  isPumlFileName,
  resolvePumlFileName,
  sanitizeFileName,
} from "@/utils/puml-files";

describe("sanitizeFileName", () => {
  it("returns default name for empty input", () => {
    expect(sanitizeFileName("")).toBe("diagram.puml");
    expect(sanitizeFileName("   ")).toBe("diagram.puml");
  });

  it("replaces forbidden characters", () => {
    expect(sanitizeFileName('bad:name?.puml')).toBe("bad_name_.puml");
  });
});

describe("isPumlFileName", () => {
  it("accepts supported extensions", () => {
    expect(isPumlFileName("diagram.puml")).toBe(true);
    expect(isPumlFileName("diagram.plantuml")).toBe(true);
    expect(isPumlFileName("notes.txt")).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    expect(isPumlFileName("diagram.svg")).toBe(false);
  });
});

describe("resolvePumlFileName", () => {
  it("keeps valid puml extensions", () => {
    expect(resolvePumlFileName("flow.puml")).toBe("flow.puml");
  });

  it("adds .puml when extension is missing", () => {
    expect(resolvePumlFileName("flow")).toBe("flow.puml");
  });

  it("replaces non-puml extension with .puml", () => {
    expect(resolvePumlFileName("flow.json")).toBe("flow.puml");
  });
});

describe("assertPumlFileSize", () => {
  it("throws LocalizedAppError when file exceeds limit", () => {
    const file = new File(["x"], "big.puml", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: 1024 * 1024 + 1 });

    expect(() => assertPumlFileSize(file, 1024 * 1024)).toThrow(
      LocalizedAppError,
    );
  });

  it("allows files within limit", () => {
    const file = new File(["small"], "small.puml", { type: "text/plain" });

    expect(() => assertPumlFileSize(file, 1024 * 1024)).not.toThrow();
  });
});
