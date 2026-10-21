import type { WizardDiagramType, WizardLanguage } from "@/constants/llm-wizard";

const GUIDE_FILE_PATTERN = /^\.\/([^/]+)\/([^/]+)\.md$/;

const guideModules = import.meta.glob<string>("./**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const guideByKey = new Map<string, string>();

function readGuideModule(source: unknown): string {
  if (typeof source === "string") {
    return source.trim();
  }

  if (
    source &&
    typeof source === "object" &&
    "default" in source &&
    typeof source.default === "string"
  ) {
    return source.default.trim();
  }

  return "";
}

for (const [path, source] of Object.entries(guideModules)) {
  const match = GUIDE_FILE_PATTERN.exec(path);
  const text = readGuideModule(source);
  if (!match || !text) {
    continue;
  }

  guideByKey.set(`${match[1]}:${match[2]}`, text);
}

const GUIDE_ALIASES: Record<string, string> = {
  "mermaid:graph": "mermaid:flowchart",
};

export const LLM_DIAGRAM_GUIDE_HEADING =
  "Diagram-type guide (follow exactly):";

export interface LlmDiagramGuideTarget {
  language: string;
  diagramType: string;
}

function guideKey(language: string, diagramType: string): string {
  return `${language}:${diagramType}`;
}

export function listLlmDiagramGuideKeys(): string[] {
  return [...guideByKey.keys()].sort();
}

export function getLlmDiagramGuide(language: string, diagramType: string): string {
  const key = guideKey(language, diagramType);
  const resolved = GUIDE_ALIASES[key] ?? key;
  return guideByKey.get(resolved) ?? "";
}

export function formatLlmDiagramGuideBlock(guide: string): string {
  const trimmed = guide.trim();
  if (!trimmed) {
    return "";
  }

  return `${LLM_DIAGRAM_GUIDE_HEADING}\n\n${trimmed}`;
}

export function guideForWizardDiagram(
  language: WizardLanguage,
  diagramType: WizardDiagramType,
): string {
  return getLlmDiagramGuide(language, diagramType);
}

const SOURCE_MARKERS: Array<{
  target: LlmDiagramGuideTarget;
  pattern: RegExp;
}> = [
  { target: { language: "ditaa", diagramType: "diagram" }, pattern: /@startditaa\b/i },
  { target: { language: "plantuml", diagramType: "mindmap" }, pattern: /@startmindmap\b/i },
  { target: { language: "plantuml", diagramType: "gantt" }, pattern: /@startgantt\b/i },
  { target: { language: "plantuml", diagramType: "wbs" }, pattern: /@startwbs\b/i },
  { target: { language: "plantuml", diagramType: "nwdiag" }, pattern: /@startnwdiag\b/i },
  {
    target: { language: "plantuml", diagramType: "c4_container" },
    pattern: /C4_Container\.puml/,
  },
  {
    target: { language: "plantuml", diagramType: "c4_context" },
    pattern: /C4_Context\.puml/,
  },
  {
    target: { language: "plantuml", diagramType: "archimate" },
    pattern: /<archimate\/Archimate>/i,
  },
];

const PROMPT_MARKERS: Array<{
  target: LlmDiagramGuideTarget;
  pattern: RegExp;
}> = [
  { target: { language: "ditaa", diagramType: "diagram" }, pattern: /\bditaa\b/i },
  {
    target: { language: "graphviz", diagramType: "graph" },
    pattern: /\bgraphviz\b[^\n]{0,40}\bundirected\b|\bundirected\b[^\n]{0,40}\bgraphviz\b/i,
  },
  {
    target: { language: "graphviz", diagramType: "digraph" },
    pattern: /\bgraphviz\b|\bdigraph\b/i,
  },
  {
    target: { language: "plantuml", diagramType: "c4_container" },
    pattern: /c4[\s_-]*container|контейнерн/i,
  },
  {
    target: { language: "plantuml", diagramType: "c4_context" },
    pattern: /\bc4\b|system\s+context|контекстн\w*\s+диаграмм/i,
  },
  { target: { language: "plantuml", diagramType: "archimate" }, pattern: /archimate/i },
  {
    target: { language: "plantuml", diagramType: "nwdiag" },
    pattern: /\bnwdiag\b|network\s+diagram|сетев\w*\s+диаграмм/i,
  },
  {
    target: { language: "plantuml", diagramType: "timing" },
    pattern: /timing\s+diagram|диаграмм\w*\s+синхрон/i,
  },
  {
    target: { language: "plantuml", diagramType: "wbs" },
    pattern: /\bwbs\b|work\s+breakdown|иерарх\w*\s+работ/i,
  },
  { target: { language: "plantuml", diagramType: "gantt" }, pattern: /\bgantt\b|гант/i },
  {
    target: { language: "plantuml", diagramType: "mindmap" },
    pattern: /mind\s*map|\bmindmap\b|интеллект-карт|карт\w*\s+мысл/i,
  },
  {
    target: { language: "plantuml", diagramType: "deployment" },
    pattern: /deployment\s+diagram|диаграмм\w*\s+разв[её]рт/i,
  },
  {
    target: { language: "plantuml", diagramType: "usecase" },
    pattern: /use\s*case|вариант\w*\s+использован/i,
  },
  {
    target: { language: "plantuml", diagramType: "object" },
    pattern: /object\s+diagram|диаграмм\w*\s+объект/i,
  },
  {
    target: { language: "plantuml", diagramType: "er" },
    pattern: /\ber\b|entity[\s-]relationship|er-диаграмм/i,
  },
  {
    target: { language: "plantuml", diagramType: "state" },
    pattern: /state\s+diagram|диаграмм\w*\s+состоян/i,
  },
  {
    target: { language: "plantuml", diagramType: "activity" },
    pattern: /activity\s+diagram|swimlane|диаграмм\w*\s+активност/i,
  },
  {
    target: { language: "plantuml", diagramType: "component" },
    pattern: /component\s+diagram|диаграмм\w*\s+компонент/i,
  },
  {
    target: { language: "plantuml", diagramType: "class" },
    pattern: /class\s+diagram|диаграмм\w*\s+класс/i,
  },
  {
    target: { language: "plantuml", diagramType: "sequence" },
    pattern: /sequence\s+diagram|диаграмм\w*\s+последовательност/i,
  },
];

function lineMatches(source: string, pattern: RegExp): boolean {
  return source.split(/\r?\n/).some((line) => pattern.test(line.trim()));
}

function detectGraphvizFromDot(source: string): LlmDiagramGuideTarget | null {
  if (!/@startdot\b/i.test(source)) {
    return null;
  }

  if (/^\s*graph\b/m.test(source) && !/^\s*digraph\b/m.test(source)) {
    return { language: "graphviz", diagramType: "graph" };
  }

  return { language: "graphviz", diagramType: "digraph" };
}

function detectPlantUmlGuideFromSource(source: string): LlmDiagramGuideTarget | null {
  const dotTarget = detectGraphvizFromDot(source);
  if (dotTarget) {
    return dotTarget;
  }

  for (const marker of SOURCE_MARKERS) {
    if (marker.pattern.test(source)) {
      return marker.target;
    }
  }

  if (lineMatches(source, /^(concise|robust)\b/i)) {
    return { language: "plantuml", diagramType: "timing" };
  }

  if (lineMatches(source, /^entity\b/i)) {
    return { language: "plantuml", diagramType: "er" };
  }

  if (lineMatches(source, /^usecase\b/i)) {
    return { language: "plantuml", diagramType: "usecase" };
  }

  if (lineMatches(source, /^object\b/i)) {
    return { language: "plantuml", diagramType: "object" };
  }

  if (lineMatches(source, /^node\b/i) && /\bartifact\b/i.test(source)) {
    return { language: "plantuml", diagramType: "deployment" };
  }

  if (/\[\*\]/.test(source) && lineMatches(source, /^state\b/i)) {
    return { language: "plantuml", diagramType: "state" };
  }

  if (
    lineMatches(source, /^\|[^|]+\|/) &&
    (lineMatches(source, /^:[^;\n]+;/) || /^\s*start\s*$/m.test(source))
  ) {
    return { language: "plantuml", diagramType: "activity" };
  }

  if (lineMatches(source, /^(class|interface|enum|abstract\s+class)\b/i)) {
    return { language: "plantuml", diagramType: "class" };
  }

  if (lineMatches(source, /^(actor|participant|boundary|control)\b/i)) {
    return { language: "plantuml", diagramType: "sequence" };
  }

  if (lineMatches(source, /^\[[^\]]+\]/)) {
    return { language: "plantuml", diagramType: "component" };
  }

  return null;
}

function detectPlantUmlGuideFromPrompt(text: string): LlmDiagramGuideTarget | null {
  for (const marker of PROMPT_MARKERS) {
    if (marker.pattern.test(text)) {
      return marker.target;
    }
  }

  return null;
}

export function resolvePlantUmlDiagramGuideTarget(
  text: string,
): LlmDiagramGuideTarget | null {
  return detectPlantUmlGuideFromSource(text) ?? detectPlantUmlGuideFromPrompt(text);
}

export function guideForPlantUmlText(text: string): string {
  const target = resolvePlantUmlDiagramGuideTarget(text);
  if (!target) {
    return "";
  }

  return getLlmDiagramGuide(target.language, target.diagramType);
}
