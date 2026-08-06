import type {
  CompletionItem,
  CompletionPrefixInfo,
  CompletionQuery,
} from "@/utils/completion-types";
import {
  MAX_COMPLETION_ITEMS,
  MIN_COMPLETION_PREFIX_LENGTH,
} from "@/utils/completion-types";

export type { CompletionItem, CompletionKind, CompletionQuery } from "@/utils/completion-types";

type MermaidDiagramKind =
  | "flowchart"
  | "sequence"
  | "class"
  | "state"
  | "er"
  | "gantt"
  | "pie"
  | "unknown";

const DIAGRAM_DECLARATIONS: CompletionItem[] = [
  { label: "flowchart", insertText: "flowchart TD", kind: "mermaid", detailKey: "editor.completion.mermaidFlowchart" },
  { label: "graph", insertText: "graph TD", kind: "mermaid", detailKey: "editor.completion.mermaidFlowchart" },
  { label: "sequenceDiagram", insertText: "sequenceDiagram", kind: "mermaid", detailKey: "editor.completion.mermaidSequence" },
  { label: "classDiagram", insertText: "classDiagram", kind: "mermaid", detailKey: "editor.completion.mermaidClass" },
  { label: "stateDiagram-v2", insertText: "stateDiagram-v2", kind: "mermaid", detailKey: "editor.completion.mermaidState" },
  { label: "erDiagram", insertText: "erDiagram", kind: "mermaid", detailKey: "editor.completion.mermaidEr" },
  { label: "gantt", insertText: "gantt", kind: "mermaid", detailKey: "editor.completion.mermaidGantt" },
  { label: "pie", insertText: "pie showData", kind: "mermaid", detailKey: "editor.completion.mermaidPie" },
  { label: "mindmap", insertText: "mindmap", kind: "mermaid", detailKey: "editor.completion.mermaidMindmap" },
];

const COMMON_VOCABULARY: CompletionItem[] = [
  { label: "title", insertText: "title ", kind: "mermaid" },
  { label: "%%", insertText: "%% ", kind: "mermaid", detailKey: "editor.completion.mermaidComment" },
];

const FLOWCHART_VOCABULARY: CompletionItem[] = [
  { label: "subgraph", insertText: 'subgraph "Group"', kind: "mermaid", detailKey: "editor.completion.mermaidSubgraph" },
  { label: "direction TB", insertText: "direction TB", kind: "mermaid" },
  { label: "direction LR", insertText: "direction LR", kind: "mermaid" },
  { label: "direction BT", insertText: "direction BT", kind: "mermaid" },
  { label: "direction RL", insertText: "direction RL", kind: "mermaid" },
  { label: "style", insertText: "style Node fill:#E3F2FD,stroke:#1565C0", kind: "mermaid", detailKey: "editor.completion.mermaidStyle" },
  { label: "classDef", insertText: "classDef highlight fill:#FFF3E0,stroke:#E65100", kind: "mermaid", detailKey: "editor.completion.mermaidClassDef" },
  { label: "linkStyle", insertText: "linkStyle default stroke:#2E7D32", kind: "mermaid", detailKey: "editor.completion.mermaidLinkStyle" },
  { label: "-->", insertText: "A --> B", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
  { label: "---", insertText: "A --- B", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
  { label: "-.->", insertText: "A -.-> B", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
  { label: "==>", insertText: "A ==> B", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
];

const SEQUENCE_VOCABULARY: CompletionItem[] = [
  { label: "participant", insertText: 'participant App as "Application"', kind: "mermaid" },
  { label: "actor", insertText: "actor User", kind: "mermaid" },
  { label: "autonumber", insertText: "autonumber", kind: "mermaid" },
  { label: "activate", insertText: "activate App", kind: "mermaid" },
  { label: "deactivate", insertText: "deactivate App", kind: "mermaid" },
  { label: "Note", insertText: "Note right of App: Message", kind: "mermaid", detailKey: "editor.completion.mermaidNote" },
  { label: "alt", insertText: "alt Success", kind: "mermaid", detailKey: "editor.completion.alt" },
  { label: "else", insertText: "else Failure", kind: "mermaid", detailKey: "editor.completion.else" },
  { label: "opt", insertText: "opt Optional", kind: "mermaid", detailKey: "editor.completion.opt" },
  { label: "loop", insertText: "loop Each item", kind: "mermaid", detailKey: "editor.completion.loop" },
  { label: "par", insertText: "par Parallel", kind: "mermaid", detailKey: "editor.completion.par" },
  { label: "->>", insertText: "A->>B: message", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
  { label: "-->>", insertText: "A-->>B: response", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
  { label: "->x", insertText: "A->xB: lost", kind: "mermaid", detailKey: "editor.completion.mermaidArrow" },
];

const CLASS_VOCABULARY: CompletionItem[] = [
  { label: "class", insertText: "class Animal {\n  +String name\n  +move()\n}", kind: "mermaid" },
  { label: "interface", insertText: "class Feedable {\n  <<interface>>\n  +feed()\n}", kind: "mermaid" },
  { label: "namespace", insertText: 'namespace Domain {\n  class User\n}', kind: "mermaid", detailKey: "editor.completion.mermaidNamespace" },
  { label: "<|--", insertText: "Animal <|-- Dog", kind: "mermaid", detailKey: "editor.completion.mermaidRelation" },
  { label: "*--", insertText: "House *-- Room", kind: "mermaid", detailKey: "editor.completion.mermaidRelation" },
  { label: "o--", insertText: "Car o-- Wheel", kind: "mermaid", detailKey: "editor.completion.mermaidRelation" },
  { label: "-->", insertText: "User --> Order", kind: "mermaid", detailKey: "editor.completion.mermaidRelation" },
  { label: "..>", insertText: "Service ..> Repository", kind: "mermaid", detailKey: "editor.completion.mermaidRelation" },
];

const STATE_VOCABULARY: CompletionItem[] = [
  { label: "state", insertText: 'state "Processing" as processing', kind: "mermaid" },
  { label: "[*]", insertText: "[*] --> Idle", kind: "mermaid", detailKey: "editor.completion.mermaidStateNode" },
  { label: "note", insertText: "note right of Idle : Waiting", kind: "mermaid", detailKey: "editor.completion.note" },
  { label: "direction TB", insertText: "direction TB", kind: "mermaid" },
  { label: "direction LR", insertText: "direction LR", kind: "mermaid" },
];

const ER_VOCABULARY: CompletionItem[] = [
  { label: "||--o{", insertText: "CUSTOMER ||--o{ ORDER : places", kind: "mermaid", detailKey: "editor.completion.mermaidErRel" },
  { label: "}|--||", insertText: "ORDER }|--|| PRODUCT : contains", kind: "mermaid", detailKey: "editor.completion.mermaidErRel" },
  { label: "||--||", insertText: "A ||--|| B : link", kind: "mermaid", detailKey: "editor.completion.mermaidErRel" },
  { label: "}o--o{", insertText: "A }o--o{ B : link", kind: "mermaid", detailKey: "editor.completion.mermaidErRel" },
];

const GANTT_VOCABULARY: CompletionItem[] = [
  { label: "dateFormat", insertText: "dateFormat YYYY-MM-DD", kind: "mermaid" },
  { label: "axisFormat", insertText: "axisFormat %m/%d", kind: "mermaid" },
  { label: "section", insertText: "section Development", kind: "mermaid", detailKey: "editor.completion.mermaidSection" },
  { label: "task", insertText: "Task name :taskId, 2024-01-01, 30d", kind: "mermaid", detailKey: "editor.completion.mermaidTask" },
  { label: "milestone", insertText: "Milestone :milestone, 2024-02-01, 0d", kind: "mermaid", detailKey: "editor.completion.mermaidMilestone" },
  { label: "excludes", insertText: "excludes weekends", kind: "mermaid" },
];

const PIE_VOCABULARY: CompletionItem[] = [
  { label: "showData", insertText: "showData", kind: "mermaid" },
  { label: "title", insertText: "title Distribution", kind: "mermaid" },
];

const CONTEXT_CLOSERS: Record<string, CompletionItem[]> = {
  alt: [
    { label: "else", insertText: "else ", kind: "context", detailKey: "editor.completion.else" },
    { label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" },
  ],
  opt: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  loop: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  par: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  subgraph: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
  namespace: [{ label: "end", insertText: "end", kind: "context", detailKey: "editor.completion.end" }],
};

export function extractMermaidCompletionPrefix(
  line: string,
  column: number,
): CompletionPrefixInfo {
  const before = line.slice(0, column);
  const word = before.match(/[A-Za-z_][\w-]*$|%%$/);
  return {
    prefix: word?.[0] ?? "",
    replaceStart: column - (word?.[0]?.length ?? 0),
    mode: "word",
  };
}

function detectMermaidDiagramKind(lines: string[]): MermaidDiagramKind {
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (!trimmed || trimmed.startsWith("%%")) {
      continue;
    }

    if (trimmed.startsWith("flowchart") || trimmed.startsWith("graph ")) {
      return "flowchart";
    }
    if (trimmed.startsWith("sequencediagram")) {
      return "sequence";
    }
    if (trimmed.startsWith("classdiagram")) {
      return "class";
    }
    if (trimmed.startsWith("statediagram")) {
      return "state";
    }
    if (trimmed.startsWith("erdiagram")) {
      return "er";
    }
    if (trimmed.startsWith("gantt")) {
      return "gantt";
    }
    if (trimmed.startsWith("pie")) {
      return "pie";
    }
    if (trimmed.startsWith("mindmap")) {
      return "unknown";
    }
    break;
  }

  return "unknown";
}

function getVocabularyForKind(kind: MermaidDiagramKind): CompletionItem[] {
  switch (kind) {
    case "flowchart":
      return [...COMMON_VOCABULARY, ...FLOWCHART_VOCABULARY];
    case "sequence":
      return [...COMMON_VOCABULARY, ...SEQUENCE_VOCABULARY];
    case "class":
      return [...COMMON_VOCABULARY, ...CLASS_VOCABULARY];
    case "state":
      return [...COMMON_VOCABULARY, ...STATE_VOCABULARY];
    case "er":
      return [...COMMON_VOCABULARY, ...ER_VOCABULARY];
    case "gantt":
      return [...COMMON_VOCABULARY, ...GANTT_VOCABULARY];
    case "pie":
      return [...COMMON_VOCABULARY, ...PIE_VOCABULARY];
    default:
      return [...COMMON_VOCABULARY, ...DIAGRAM_DECLARATIONS];
  }
}

function isNewLineContext(line: string, prefixInfo: CompletionPrefixInfo): boolean {
  const beforePrefix = line.slice(0, prefixInfo.replaceStart);
  return beforePrefix.trim().length === 0;
}

function analyzeOpenMermaidBlocks(
  lines: string[],
  lineNumber: number,
): string[] {
  const openBlocks: string[] = [];
  const blockStarts = Object.keys(CONTEXT_CLOSERS);

  for (let index = 0; index < lineNumber; index += 1) {
    const trimmed = lines[index]?.trim().toLowerCase() ?? "";
    if (!trimmed || trimmed.startsWith("%%")) {
      continue;
    }

    const startKeyword = blockStarts.find((keyword) => {
      if (keyword === "subgraph") {
        return trimmed.startsWith("subgraph");
      }
      return trimmed.startsWith(keyword);
    });

    if (startKeyword) {
      openBlocks.push(startKeyword);
      continue;
    }

    if (trimmed === "end" || trimmed.startsWith("end ")) {
      openBlocks.pop();
    }
  }

  return openBlocks;
}

export function getMermaidCompletions(query: CompletionQuery): CompletionItem[] {
  const results: CompletionItem[] = [];
  const seen = new Set<string>();
  const normalizedPrefix = query.prefixInfo.prefix.toLowerCase();
  const currentLine = query.lines[query.lineNumber - 1] ?? "";
  const onNewLine = isNewLineContext(currentLine, query.prefixInfo);
  const diagramKind = detectMermaidDiagramKind(query.lines);

  const addItems = (items: CompletionItem[]): void => {
    for (const item of items) {
      if (seen.has(item.label)) {
        continue;
      }
      seen.add(item.label);
      results.push(item);
    }
  };

  if (onNewLine) {
    const openBlocks = analyzeOpenMermaidBlocks(query.lines, query.lineNumber);
    for (let index = openBlocks.length - 1; index >= 0; index -= 1) {
      const block = openBlocks[index];
      const closers = (CONTEXT_CLOSERS[block] ?? []).filter(
        (item) =>
          normalizedPrefix.length === 0 ||
          item.label.toLowerCase().startsWith(normalizedPrefix),
      );
      addItems(closers);
    }
  }

  if (
    normalizedPrefix.length >= MIN_COMPLETION_PREFIX_LENGTH ||
    normalizedPrefix === "%%" ||
    (diagramKind === "unknown" && normalizedPrefix.length >= 1)
  ) {
    const vocabulary = getVocabularyForKind(diagramKind);
    const matched = vocabulary.filter((item) =>
      item.label.toLowerCase().startsWith(normalizedPrefix),
    );
    addItems(matched);
  }

  return results.slice(0, MAX_COMPLETION_ITEMS);
}
