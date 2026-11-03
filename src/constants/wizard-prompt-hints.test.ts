import { describe, expect, it } from "vitest";
import { getWizardTypePromptHint } from "@/constants/wizard-prompt-hints";

describe("wizard-prompt-hints", () => {
  it("returns Russian mindmap hint with geographic structure", () => {
    const hint = getWizardTypePromptHint("mindmap", "ru");

    expect(hint).toContain("Подмосковье");
    expect(hint).toContain("все города");
    expect(hint).toContain("районы");
  });

  it("returns English mindmap hint", () => {
    const hint = getWizardTypePromptHint("mindmap", "en");

    expect(hint).toContain("Moscow Oblast");
    expect(hint).toContain("every city");
  });
});
