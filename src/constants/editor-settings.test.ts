import { describe, expect, it } from "vitest";
import {
  isEditorSurfaceMode,
  resolveVisibleEditorSurface,
} from "@/constants/editor-settings";

describe("editor surface preference", () => {
  it("accepts only code, steps, and AI chat", () => {
    expect(isEditorSurfaceMode("code")).toBe(true);
    expect(isEditorSurfaceMode("builder")).toBe(true);
    expect(isEditorSurfaceMode("ai-chat")).toBe(true);
    expect(isEditorSurfaceMode("preview")).toBe(false);
  });

  it("keeps the saved view when that view can be shown", () => {
    expect(
      resolveVisibleEditorSurface("ai-chat", { builder: true, aiChat: true }),
    ).toBe("ai-chat");
    expect(
      resolveVisibleEditorSurface("builder", { builder: true, aiChat: false }),
    ).toBe("builder");
  });

  it("falls back to code without discarding an unavailable saved view", () => {
    expect(
      resolveVisibleEditorSurface("builder", { builder: false, aiChat: true }),
    ).toBe("code");
    expect(
      resolveVisibleEditorSurface("ai-chat", { builder: true, aiChat: false }),
    ).toBe("code");
  });
});
