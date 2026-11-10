import type { WizardDiagramType, WizardLanguage } from "@/constants/llm-wizard";
import {
  LLM_GENERATE_ROLE_PROMPT,
  LLM_WIZARD_ROLE_PROMPT,
} from "@/services/llm/diagram-format-rules";
import {
  formatLlmDiagramGuideBlock,
  guideForWizardDiagram,
} from "@/services/llm/guides/llm-diagram-guides";

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

export function buildLlmMermaidSystemPrompt(
  basePrompt: string,
  diagramGuide = "",
): string {
  return [
    LLM_GENERATE_ROLE_PROMPT,
    basePrompt,
    LLM_MERMAID_RULES,
    formatLlmDiagramGuideBlock(diagramGuide),
    LLM_COMPLETENESS_APPENDIX,
    LLM_JSON_MERMAID_APPENDIX,
  ]
    .filter((part) => part.trim().length > 0)
    .join("\n\n");
}

const LLM_EXTRA_LANGUAGE_RULES: Record<string, string> = {
  graphml:
    "GraphML rules: return a complete graphml document. Do not use markdown fences inside the plantuml JSON field.",
  d2: "D2 rules: return D2 source with shapes and -> connections. Do not use markdown fences inside the plantuml JSON field.",
  structurizr:
    "Structurizr rules: return one workspace DSL document. Do not use markdown fences inside the plantuml JSON field.",
  wiremark:
    "WireMark rules: return a Wireframe document with quoted labels. Do not use markdown fences inside the plantuml JSON field.",
};

export function buildWizardLlmSystemPrompt(
  basePrompt: string,
  formatRules: string,
  language: WizardLanguage,
  diagramType?: WizardDiagramType,
): string {
  const jsonAppendix =
    language === "mermaid"
      ? LLM_JSON_MERMAID_APPENDIX
      : language === "plantuml"
        ? LLM_JSON_WIZARD_PLANTUML_APPENDIX
        : `${LLM_JSON_OUTPUT_PREFIX} Required field: plantuml (string with complete ${language} source — field name plantuml for API compatibility). Optional: explanation (string).`;

  const languageRules =
    language === "mermaid"
      ? LLM_MERMAID_RULES
      : LLM_EXTRA_LANGUAGE_RULES[language];
  const formatRulesBlock = languageRules
    ? [languageRules, formatRules].join("\n\n")
    : formatRules;

  const diagramGuide = diagramType
    ? guideForWizardDiagram(language, diagramType)
    : "";

  return [
    LLM_WIZARD_ROLE_PROMPT,
    basePrompt,
    formatRulesBlock,
    formatLlmDiagramGuideBlock(diagramGuide),
    jsonAppendix,
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
