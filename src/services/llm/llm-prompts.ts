import { formatLlmDiagramGuideBlock } from "@/services/llm/guides/llm-diagram-guides";

export const LLM_GENERATE_ROLE_PROMPT =
  "Role: You are an expert information architect and PlantUML diagram engineer. Task: produce a complete diagram that fully implements the user's request — not a minimal placeholder.";

export const LLM_JSON_OUTPUT_PREFIX =
  "Respond with a single JSON object only. No markdown fences outside the JSON.";

export const LLM_JSON_PLANTUML_FIELDS =
  "Required field: plantuml (string with complete diagram source). Optional: explanation (string) — summarize structure and main themes.";

export const LLM_JSON_SYSTEM_APPENDIX = `${LLM_JSON_OUTPUT_PREFIX} ${LLM_JSON_PLANTUML_FIELDS} Use @startuml/@enduml unless the format rules specify another @start* / @end* pair.`;

export const LLM_PLANTUML_RULES =
  "PlantUML rules: For standard diagrams use @startuml and @enduml. For C4 diagrams only use !include from ./plantuml-lib/C4/ or stdlib <...> includes. Do not use !includeurl or external URLs.";

export const LLM_COMPLETENESS_APPENDIX =
  "Completeness: Include all entities, steps, branches, and relationships from the user request. Never return a minimal toy diagram when the user asked for a rich structure. When the user asks for ALL items (e.g. all cities, all directions), list every item — numeric wizard parameters are minimum floors, not caps. Match the user's language in labels.";

export const LLM_CLARIFICATION_JSON_APPENDIX =
  "If the user request is ambiguous or missing critical details, respond with JSON only: {\"clarificationQuestion\":\"your question\"} and optional \"explanation\". Do not change the diagram until the user answers. Otherwise return the normal response shape for this task.";

export function buildLlmSystemPrompt(
  basePrompt: string,
  diagramGuide = "",
): string {
  return [
    LLM_GENERATE_ROLE_PROMPT,
    basePrompt,
    LLM_PLANTUML_RULES,
    formatLlmDiagramGuideBlock(diagramGuide),
    LLM_COMPLETENESS_APPENDIX,
    LLM_JSON_SYSTEM_APPENDIX,
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
}

export const LLM_TEST_USER_PROMPT =
  "Reply with JSON only: {\"plantuml\":\"@startuml\\nAlice -> Bob : ping\\n@enduml\",\"explanation\":\"Connection test: simple sequence message.\"}";

/** Temperature for diagram generation / wizard (richer output). */
export const LLM_TEMPERATURE_GENERATION = 0.6;

/** Temperature for patch, validation retries, and connection tests. */
export const LLM_TEMPERATURE_PRECISE = 0.2;

/** Default max output tokens for diagram generation (large mindmaps / WBS need headroom). */
export const LLM_MAX_TOKENS_GENERATION = 8192;

/** Max output tokens for syntax Q&A and patches. */
export const LLM_MAX_TOKENS_PRECISE = 2048;
