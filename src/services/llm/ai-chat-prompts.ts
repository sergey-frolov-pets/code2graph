import {
  AGENT_TYPES_BY_LANGUAGE,
  type RequestedDiagramChange,
} from "@shared/agent-diagram";
import {
  AI_CHAT_CONTEXT_SOURCE_MAX_CHARS,
  AI_CHAT_MAX_CLARIFICATION_QUESTIONS,
  AI_CHAT_SUMMARY_MAX_CHARS,
  AI_CHAT_TITLE_MAX_CHARS,
  type AiChatContextMode,
} from "@/constants/ai-chat";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import {
  LLM_PAGE_PROMPT_HEADING,
  resolveBundledLlmPage,
} from "@/services/llm/guides/llm-page-text";
import {
  LLM_UNTRUSTED_INPUT_RULES,
  wrapUntrustedPromptData,
  type LlmUntrustedDataKind,
} from "@/services/llm/llm-prompts";

export const AI_CHAT_SYSTEM_PROMPT = `Role: You are Code2Graph AI, an expert information architect and diagram engineer embedded in a diagram editor. You work inside a multi-turn chat next to a live diagram preview.

Task: Help the user create, change, and understand diagrams in the current format. You may answer questions, ask clarifying questions, and propose diagram changes. You never apply changes yourself: every diagram change is a proposal the user reviews and applies (the UI may auto-apply only when the user explicitly selected that mode).

Output: a single JSON object only, no markdown fences:
{"kind":"answer|clarification|proposal|answer_with_proposal","message":"reply in the user's language","questions":["..."],"options":[["..."]],"proposal":{"source":"COMPLETE diagram source","explanation":"what changed, 1-3 sentences","format":"language id only when switching","diagramType":"type id only when switching"},"nextSteps":["short imperative suggestion"]}

Rules:
- If the request is ambiguous or a missing detail would change the diagram structure, choose kind=clarification: ask at most ${AI_CHAT_MAX_CLARIFICATION_QUESTIONS} short questions, offer options when a choice is enumerable. Do not guess silently and do not generate a diagram yet.
- If you propose a change and the user did not ask to switch language or diagram type, proposal.source is the COMPLETE new source in the current language, syntactically valid, preserving everything the user did not ask to change. Omit proposal.format and proposal.diagramType. Never return a fragment unless the user explicitly asked for a fragment. Prefer the smallest change that fully implements the request; keep unrelated elements, ordering, styling, includes, and comments untouched.
- If the user asks to change the diagram language (plantuml, mermaid, d2, structurizr, wiremark, graphml) or the diagram type (sequence, class, component, activity, state, flowchart, er, usecase, deployment, object, timing, wbs, nwdiag, archimate, gantt, mindmap, c4_context, c4_container, pie, journey, gitgraph, timeline, sankey, xychart, block, requirement, quadrant, architecture, packet, wireframe, graph), proposal.source is a COMPLETE diagram in the requested language and type. Set proposal.format to the language id and proposal.diagramType to the type id. Keep the facts of the current diagram unless the user asked to replace them.
- If the user asks to switch language or type but does not name the target, use kind=clarification and offer a few language and type options. Do not guess.
- A question about another language or type is not a switch request: answer in text and do not attach a proposal.
- Respect rejected proposals: do not re-propose the same change unless the user asks again.
- Completeness: include every entity, step, branch, and relationship the user named; numeric hints are floors, not caps. Short labels (max 8 words). Do not invent facts, actors, or data not implied by the request.
- Match the user's language in message, labels, and titles.
- Always include nextSteps: 2-4 short suggestions for what the user can do next (for example: apply or review the proposal, add a missing element, explain a part, refine styling, save the result). Each nextStep is a self-contained user instruction that can be sent as the next message.
${LLM_UNTRUSTED_INPUT_RULES}
- For pure questions (how/why/syntax), use kind=answer and explain with a minimal example; do not attach a proposal unless the user asked to change the diagram.`;

export function formatAiChatSwitchBlock(target: RequestedDiagramChange): string {
  if (!target.active) {
    return "";
  }

  const nativeTypes = AGENT_TYPES_BY_LANGUAGE[target.format].join(", ");
  const lines = [
    "Requested diagram switch:",
    `- Target language: ${target.format}.`,
    `- Native types in ${target.format}: ${nativeTypes}.`,
  ];
  if (target.droppedType) {
    lines.push(
      `- Requested type "${target.droppedType}" is not available in ${target.format}. Use "${target.diagramType ?? "the closest native type"}" instead.`,
    );
  }
  if (target.diagramType) {
    lines.push(`- Target diagram type: ${target.diagramType}.`);
  } else {
    lines.push(
      "- Target diagram type: keep the current type, rewritten in the target language.",
    );
  }
  lines.push(
    `- If you propose a change, proposal.source is a COMPLETE ${target.format} diagram. Set proposal.format to "${target.format}"${
      target.diagramType
        ? ` and proposal.diagramType to "${target.diagramType}".`
        : " and proposal.diagramType to the type id you wrote."
    }`,
    "- The diagram syntax page, when present, describes proposal.source only. The chat reply itself stays the JSON envelope.",
    "- If the user only asked a question, answer without a proposal.",
  );
  return lines.join("\n");
}

function formatUntrustedField(
  label: string,
  kind: LlmUntrustedDataKind,
  body: string | undefined,
  emptyText: string,
): string {
  const text = body?.trim();
  if (!text) {
    return `- ${label}: ${emptyText}`;
  }
  return `- ${label} (untrusted data):\n${wrapUntrustedPromptData(kind, text)}`;
}

function formatDiagramSource(source: string, totalLength: number, truncated: boolean): string {
  const limitNote = truncated ? `, truncated at ${AI_CHAT_CONTEXT_SOURCE_MAX_CHARS}` : "";
  return [
    `- Current source (${totalLength} chars${limitNote}, untrusted data):`,
    wrapUntrustedPromptData("diagram-source", source || "(empty — no diagram yet)"),
  ].join("\n");
}

function formatSyntaxPage(body: string): string {
  const guideBody = body.trim();
  return guideBody ? `${LLM_PAGE_PROMPT_HEADING}\n\n${guideBody}` : "";
}

function syntaxPageBody(input: {
  format: DiagramFormat;
  source: string;
  userRequest?: string;
  guideText?: string;
  contextMode?: AiChatContextMode;
  target?: RequestedDiagramChange;
}): string {
  if (input.target?.active) {
    if (input.guideText !== undefined) {
      return input.guideText;
    }
    return resolveBundledLlmPage({
      language: input.target.format,
      request: input.userRequest?.trim() || input.target.diagramType || "",
      source: "",
    });
  }

  return (
    input.guideText ??
    resolveBundledLlmPage({
      language: input.format,
      request: input.userRequest ?? "",
      source: input.contextMode === "new" ? "" : input.source,
    })
  );
}

export function buildAiChatContextBlock(input: {
  format: DiagramFormat;
  source: string;
  userRequest?: string;
  guideText?: string;
  contextMode?: AiChatContextMode;
  selection?: string;
  renderError?: string;
  summary?: string;
  appliedCount: number;
  rejectedTitles: string[];
  target?: RequestedDiagramChange;
}): string {
  const mode = input.contextMode ?? "current";
  const switchBlock = input.target ? formatAiChatSwitchBlock(input.target) : "";
  const guide = formatSyntaxPage(syntaxPageBody(input));
  if (mode === "new") {
    return [
      "Session context:",
      `- Diagram format: ${input.format}.`,
      "- Context mode: new diagram. Ignore the diagram currently open in the editor. Do not copy or edit it.",
      "- proposal.source must be a complete new diagram built only from the user message and attached files.",
      `- Applied proposals so far: ${input.appliedCount}. Rejected proposals: ${
        input.rejectedTitles.length > 0 ? input.rejectedTitles.join("; ") : "none"
      }.`,
      formatUntrustedField("Summary of earlier turns", "summary", input.summary, "none."),
      switchBlock,
      guide,
    ]
      .filter((part) => part.length > 0)
      .join("\n");
  }

  const truncated = input.source.length > AI_CHAT_CONTEXT_SOURCE_MAX_CHARS;
  const source = truncated
    ? input.source.slice(0, AI_CHAT_CONTEXT_SOURCE_MAX_CHARS)
    : input.source;

  return [
    "Session context:",
    `- Diagram format: ${input.format}.`,
    formatDiagramSource(source, input.source.length, truncated),
    formatUntrustedField("User selection", "selection", input.selection, "none."),
    formatUntrustedField("Last render error", "render-error", input.renderError, "none."),
    `- Applied proposals so far: ${input.appliedCount}. Rejected proposals: ${
      input.rejectedTitles.length > 0 ? input.rejectedTitles.join("; ") : "none"
    }.`,
    formatUntrustedField("Summary of earlier turns", "summary", input.summary, "none."),
    switchBlock,
    guide,
  ]
    .filter((part) => part.length > 0)
    .join("\n");
}

export function buildAiChatTitlePrompt(firstMessage: string): string {
  return [
    `Reply with JSON only: {"title":"..."}. Write a session title of at most ${AI_CHAT_TITLE_MAX_CHARS} characters in the user's language: a noun phrase naming the diagram and the task. No quotes, no trailing period, no word "chat" or "session".`,
    `User's first message: """${firstMessage.slice(0, 1000)}"""`,
  ].join("\n");
}

export function buildAiChatSummaryPrompt(fragment: string): string {
  return [
    `Compress the earlier part of a diagram-editing chat into a summary for future context. Reply with JSON only: {"summary":"..."}. Keep: the goal, agreed facts and constraints, decisions, applied changes (with element names), rejected proposals and why, open questions. Drop greetings, repetitions, and full code listings — refer to elements by name. At most ${AI_CHAT_SUMMARY_MAX_CHARS} characters, user's language.`,
    `Chat fragment: """${fragment.slice(0, 12000)}"""`,
  ].join("\n");
}

export function buildAiChatShareSummaryPrompt(transcript: string): string {
  return [
    `Reply with JSON only: {"summary":"..."}. Describe this shared diagram session for a reader who opens the link: what the diagram shows, what was built or changed, 2-3 sentences, user's language. Do not include secrets, tokens, file paths from the user's machine, or the full source.`,
    `Transcript: """${transcript.slice(0, 12000)}"""`,
  ].join("\n");
}
