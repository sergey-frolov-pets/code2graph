import {
  LLM_GENERATE_ROLE_PROMPT,
  LLM_WIZARD_ROLE_PROMPT,
} from "@/services/llm/diagram-format-rules";

export const LLM_JSON_OUTPUT_PREFIX =
  "Respond with a single JSON object only. No markdown fences outside the JSON.";

export const LLM_JSON_PLANTUML_FIELDS =
  "Required field: plantuml (string with complete diagram source). Optional: explanation (string) — summarize structure and main themes.";

export const LLM_JSON_SYSTEM_APPENDIX = `${LLM_JSON_OUTPUT_PREFIX} ${LLM_JSON_PLANTUML_FIELDS} Use @startuml/@enduml unless the format rules specify another @start* / @end* pair.`;

export const LLM_MERMAID_RULES =
  "Mermaid rules: return valid Mermaid diagram source. Use the correct diagram-type keyword (flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, gantt, erDiagram, mindmap, etc.). Do not use markdown code fences inside the plantuml JSON field.";

export const LLM_JSON_WIZARD_PLANTUML_APPENDIX = `${LLM_JSON_OUTPUT_PREFIX} ${LLM_JSON_PLANTUML_FIELDS} Use the correct @start* / @end* pair for the requested diagram type.`;

export const LLM_JSON_MERMAID_APPENDIX = `${LLM_JSON_OUTPUT_PREFIX} Required field: plantuml (string with complete Mermaid source — field name plantuml for API compatibility). Optional: explanation (string).`;

export const LLM_PLANTUML_RULES =
  "PlantUML rules: For standard diagrams use @startuml and @enduml. For C4 diagrams only use !include from ./plantuml-lib/C4/ or stdlib <...> includes. Do not use !includeurl or external URLs.";

export const LLM_COMPLETENESS_APPENDIX =
  "Completeness: Include all entities, steps, branches, and relationships from the user request. Never return a minimal toy diagram when the user asked for a rich structure. When the user asks for ALL items (e.g. all cities, all directions), list every item — numeric wizard parameters are minimum floors, not caps. Match the user's language in labels.";

export const LLM_CLARIFICATION_JSON_APPENDIX =
  "If the user request is ambiguous or missing critical details, respond with JSON only: {\"clarificationQuestion\":\"your question\"} and optional \"explanation\". Do not change the diagram until the user answers. Otherwise return the normal response shape for this task.";

export const LLM_SYNTAX_ASK_CLARIFICATION_APPENDIX =
  "If the question is unclear, respond with JSON {\"clarificationQuestion\":\"...\"}. Otherwise respond with {\"answer\":\"...\"} (thorough answer with syntax examples).";

export const LLM_WIZARD_PLANNING_APPENDIX =
  "You help plan a diagram before generation. If requirements are unclear, respond with JSON {\"clarificationQuestion\":\"...\"}. Otherwise respond with JSON {\"message\":\"brief acknowledgment or summary\"}. Do not generate diagram source yet.";

export function buildLlmSystemPrompt(basePrompt: string): string {
  return [
    LLM_GENERATE_ROLE_PROMPT,
    basePrompt,
    LLM_PLANTUML_RULES,
    LLM_COMPLETENESS_APPENDIX,
    LLM_JSON_SYSTEM_APPENDIX,
  ].join("\n\n");
}

export function buildLlmMermaidSystemPrompt(basePrompt: string): string {
  return [
    LLM_GENERATE_ROLE_PROMPT,
    basePrompt,
    LLM_MERMAID_RULES,
    LLM_COMPLETENESS_APPENDIX,
    LLM_JSON_MERMAID_APPENDIX,
  ].join("\n\n");
}

export function buildWizardLlmSystemPrompt(
  basePrompt: string,
  formatRules: string,
  language: "plantuml" | "mermaid",
): string {
  const jsonAppendix =
    language === "mermaid"
      ? LLM_JSON_MERMAID_APPENDIX
      : LLM_JSON_WIZARD_PLANTUML_APPENDIX;

  const formatRulesBlock =
    language === "mermaid"
      ? [LLM_MERMAID_RULES, formatRules].join("\n\n")
      : formatRules;

  return [
    LLM_WIZARD_ROLE_PROMPT,
    basePrompt,
    formatRulesBlock,
    jsonAppendix,
  ].join("\n\n");
}

export const LLM_PATCH_COMPLETENESS_APPENDIX =
  "Apply the user's request fully within the selected fragment or full diagram. Do not make token-sized edits when the request implies substantive changes.";

export const LLM_PATCH_JSON_APPENDIX = `${LLM_JSON_OUTPUT_PREFIX} Required field: replacement (string) — the NEW PlantUML text that replaces ONLY the user-selected fragment. Optional: explanation (string). Do not return the full diagram unless the user explicitly asked to rewrite everything. ${LLM_CLARIFICATION_JSON_APPENDIX}`;

export function buildLlmPatchSystemPrompt(basePrompt: string): string {
  return [
    LLM_GENERATE_ROLE_PROMPT,
    basePrompt,
    LLM_PLANTUML_RULES,
    LLM_PATCH_COMPLETENESS_APPENDIX,
    LLM_PATCH_JSON_APPENDIX,
  ].join("\n\n");
}

export const LLM_TEST_USER_PROMPT =
  "Reply with JSON only: {\"plantuml\":\"@startuml\\nAlice -> Bob : ping\\n@enduml\",\"explanation\":\"Connection test: simple sequence message.\"}";

export const LLM_SYNTAX_ASK_JSON_APPENDIX = `${LLM_JSON_OUTPUT_PREFIX} ${LLM_SYNTAX_ASK_CLARIFICATION_APPENDIX} Match the user's language. Do not rewrite or return the full diagram source unless the user explicitly asked for a full rewrite.`;

export function buildLlmSyntaxAskSystemPrompt(basePrompt: string): string {
  return [
    basePrompt,
    LLM_PLANTUML_RULES,
    LLM_SYNTAX_ASK_JSON_APPENDIX,
  ].join("\n\n");
}

export function buildSyntaxAskUserPrompt(source: string, question: string): string {
  return [
    "Current diagram source:",
    "```plantuml",
    source,
    "```",
    "",
    "User question about syntax:",
    question,
  ].join("\n");
}

/** Temperature for diagram generation / wizard (richer output). */
export const LLM_TEMPERATURE_GENERATION = 0.6;

/** Temperature for patch, validation retries, and connection tests. */
export const LLM_TEMPERATURE_PRECISE = 0.2;

/** Default max output tokens for diagram generation (large mindmaps / WBS need headroom). */
export const LLM_MAX_TOKENS_GENERATION = 8192;

/** Max output tokens for syntax Q&A and patches. */
export const LLM_MAX_TOKENS_PRECISE = 2048;
