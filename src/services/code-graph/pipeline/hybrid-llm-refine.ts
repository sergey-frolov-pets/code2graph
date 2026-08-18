import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { useLlmGate } from "@/composables/useLlmGate";
import { llmChat } from "@/services/llm/llm-client";

export async function refineCodeGraphIrWithLlm(
  ir: DiagramIR,
  projectSummary: string,
): Promise<DiagramIR> {
  const gate = await useLlmGate().requireLlmAccess({ silent: true });
  if (!gate.ok || gate.mode !== "byok") {
    return ir;
  }

  const prompt = [
    "You refine a diagram IR extracted from source code.",
    "Return ONLY valid JSON for nodes/edges with updated labels and grouping.",
    "Project summary:",
    projectSummary,
    "Current IR:",
    JSON.stringify({ nodes: ir.nodes, edges: ir.edges, groups: ir.groups }),
  ].join("\n\n");

  try {
    const response = await llmChat(
      [{ role: "user", content: prompt }],
      { jsonMode: true },
      { silent: true },
    );

    const content = response.content.trim();
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    if (jsonStart < 0 || jsonEnd <= jsonStart) {
      return ir;
    }

    const parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1)) as {
      nodes?: DiagramIR["nodes"];
      edges?: DiagramIR["edges"];
      groups?: DiagramIR["groups"];
    };

    return {
      ...ir,
      nodes: parsed.nodes ?? ir.nodes,
      edges: parsed.edges ?? ir.edges,
      groups: parsed.groups ?? ir.groups,
    };
  } catch {
    return ir;
  }
}
