import { describe, expect, it } from "vitest";
import { resolveRequestedDiagramChange } from "@shared/agent-diagram";
import { resolveAiChatProposalTarget } from "@/services/llm/ai-chat-diagram-target";

describe("resolveAiChatProposalTarget", () => {
  it("keeps the current language when the user did not ask to switch", () => {
    const change = resolveRequestedDiagramChange({
      request: "добавь участника",
      currentFormat: "plantuml",
    });
    expect(
      resolveAiChatProposalTarget("plantuml", undefined, undefined, change),
    ).toEqual({});
  });

  it("fills the language the user named when the model omits it", () => {
    const change = resolveRequestedDiagramChange({
      request: "convert this to d2",
      currentFormat: "plantuml",
    });
    expect(resolveAiChatProposalTarget("plantuml", undefined, undefined, change)).toEqual({
      format: "d2",
    });
  });

  it("prefers the language and type the model declared", () => {
    const change = resolveRequestedDiagramChange({
      request: "переведи в sequence",
      currentFormat: "mermaid",
    });
    expect(
      resolveAiChatProposalTarget("mermaid", "plantuml", "class", change),
    ).toEqual({
      format: "plantuml",
      diagramType: "class",
    });
  });

  it("drops an unknown diagram type", () => {
    const change = resolveRequestedDiagramChange({
      request: "добавь блок",
      currentFormat: "mermaid",
    });
    expect(
      resolveAiChatProposalTarget("mermaid", undefined, "not-a-type", change).diagramType,
    ).toBeUndefined();
  });
});
