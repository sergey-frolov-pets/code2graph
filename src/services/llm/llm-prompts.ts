export const LLM_JSON_SYSTEM_APPENDIX =
  "Respond with a single JSON object only. No markdown fences. Required field: plantuml (string with valid @startuml/@enduml). Optional: explanation (string).";

export const LLM_MERMAID_RULES =
  "Mermaid rules: return valid Mermaid diagram source. Use diagram-type keywords such as flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, gantt, or erDiagram. Do not use markdown code fences inside the plantuml JSON field.";

export const LLM_JSON_MERMAID_APPENDIX =
  "Respond with a single JSON object only. No markdown fences. Required field: plantuml (string with complete Mermaid source — field name plantuml for API compatibility). Optional: explanation (string).";

export const LLM_PLANTUML_RULES =
  "PlantUML rules: use @startuml and @enduml. For C4 diagrams only use !include from ./plantuml-lib/C4/ or stdlib <...> includes. Do not use !includeurl or external URLs.";

export function buildLlmSystemPrompt(basePrompt: string): string {
  return `${basePrompt}\n\n${LLM_PLANTUML_RULES}\n\n${LLM_JSON_SYSTEM_APPENDIX}`;
}

export function buildLlmMermaidSystemPrompt(basePrompt: string): string {
  return `${basePrompt}\n\n${LLM_MERMAID_RULES}\n\n${LLM_JSON_MERMAID_APPENDIX}`;
}

export const LLM_PATCH_JSON_APPENDIX =
  "Respond with a single JSON object only. No markdown fences. Required field: replacement (string) — the NEW PlantUML text that replaces ONLY the user-selected fragment. Optional: explanation (string). Do not return the full diagram unless the user explicitly asked to rewrite everything.";

export function buildLlmPatchSystemPrompt(basePrompt: string): string {
  return `${basePrompt}\n\n${LLM_PLANTUML_RULES}\n\n${LLM_PATCH_JSON_APPENDIX}`;
}

export const LLM_TEST_USER_PROMPT =
  "Reply with JSON only: {\"plantuml\":\"@startuml\\nAlice -> Bob : ping\\n@enduml\",\"explanation\":\"ok\"}";

export const LLM_SYNTAX_ASK_JSON_APPENDIX =
  "Respond with a single JSON object only. No markdown fences. Required field: answer (string) — explain PlantUML syntax for the user's question using their current diagram as context. Include concrete syntax snippets when helpful. Do not rewrite or return the full diagram source.";

export function buildLlmSyntaxAskSystemPrompt(basePrompt: string): string {
  return `${basePrompt}\n\n${LLM_PLANTUML_RULES}\n\n${LLM_SYNTAX_ASK_JSON_APPENDIX}`;
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
