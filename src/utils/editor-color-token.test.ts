import { describe, expect, it } from "vitest";
import {
  findHexColorAt,
  hexToColorInput,
  isHexColor,
} from "@/utils/editor-color-token";

describe("findHexColorAt", () => {
  it("finds a hex token under the caret", () => {
    const line = "fill:#123456,stroke:#abc";
    expect(findHexColorAt(line, line.indexOf("123") )).toEqual({
      start: 5,
      end: 12,
      value: "#123456",
    });
    expect(findHexColorAt(line, line.indexOf("#abc") + 4)).toEqual({
      start: 20,
      end: 24,
      value: "#abc",
    });
  });

  it("returns null outside a color", () => {
    expect(findHexColorAt("style Node fill:#fff", 0)).toBeNull();
  });
});

describe("hexToColorInput", () => {
  it("expands short hex and drops alpha", () => {
    expect(hexToColorInput("#1a2")).toBe("#11aa22");
    expect(hexToColorInput("#12345678")).toBe("#123456");
  });
});

describe("isHexColor", () => {
  it("accepts 3, 4, 6 and 8 digits", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#abcd")).toBe(true);
    expect(isHexColor("#123456")).toBe(true);
    expect(isHexColor("#12345678")).toBe(true);
    expect(isHexColor("red")).toBe(false);
  });
});
