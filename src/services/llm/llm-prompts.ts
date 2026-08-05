export const LLM_JSON_SYSTEM_APPENDIX =
  "Respond with a single JSON object only. No markdown fences. Required field: plantuml (string with valid @startuml/@enduml). Optional: explanation (string).";

export const LLM_PLANTUML_RULES =
  "PlantUML rules: use @startuml and @enduml. For C4 diagrams only use !include from ./plantuml-lib/C4/ or stdlib <...> includes. Do not use !includeurl or external URLs.";

export function buildLlmSystemPrompt(basePrompt: string): string {
  return `${basePrompt}\n\n${LLM_PLANTUML_RULES}\n\n${LLM_JSON_SYSTEM_APPENDIX}`;
}

export const LLM_TEST_USER_PROMPT =
  "Reply with JSON only: {\"plantuml\":\"@startuml\\nAlice -> Bob : ping\\n@enduml\",\"explanation\":\"ok\"}";
