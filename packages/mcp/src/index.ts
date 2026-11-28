import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  AGENT_DIAGRAM_LANGUAGES,
  generateDiagramScaffold,
  listDiagramFormats,
  planDiagram,
  type AgentDiagramLocale,
} from "../../../packages/shared/src/agent-diagram.js";
import { resolveLlmPage } from "../../../packages/shared/src/llm-pages.js";
import { attachDiagramImage } from "./attach-image.js";
import { CONVERT_FORMATS, convertTool, type ConvertToolLocale } from "./convert.js";
import { readLlmPageFile } from "./llm-page-file.js";

const formatSchema = z.enum(AGENT_DIAGRAM_LANGUAGES);
const localeSchema = z.enum(["ru", "en"]);
const directionSchema = z.enum(["TB", "LR"]);
const sizeSchema = z.enum(["doc-inline", "slide-16x9", "social-og", "print-a4"]);
const detailSchema = z.enum(["faithful", "balanced", "simplified"]);
const audienceSchema = z.enum(["engineer", "mixed", "executive"]);

const sizeDescription =
  "Frame preset: doc-inline (960px, 12px labels), slide-16x9 (1600×900, 16px), social-og (1200×630, 14px), print-a4 (1240×1754, 14px). Also widens node and rank spacing.";
const detailDescription =
  "Detail ceiling: faithful ≤24 nodes, balanced ≤12, simplified ≤7. Exceeding it returns a warning with the degradation ladder (decor → duplicates → leaf clusters → infrastructure); nothing is removed.";
const audienceDescription =
  "Label wording: engineer (technical names), mixed (plain nouns), executive (outcome names). Changes wording only, never the number of nodes.";

const server = new McpServer({
  name: "code2graph",
  version: "1.0.0",
});

function jsonText(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

function markdownText(text: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text }],
  };
}

server.registerTool(
  "list_diagram_formats",
  {
    description:
      "List every diagram language connected to Code2Graph and the diagram types each language accepts.",
    inputSchema: {},
  },
  async () => jsonText({ formats: listDiagramFormats() }),
);

server.registerTool(
  "list_capabilities",
  {
    description:
      "Return one markdown index of Code2Graph diagram languages, or one language when language is set. Card bodies are not included. Does not render a diagram.",
    inputSchema: {
      language: formatSchema
        .optional()
        .describe("Limit the index to plantuml, mermaid, graphml, wiremark, d2, or structurizr"),
    },
  },
  async ({ language }) => {
    const page = resolveLlmPage({ language, request: "" });
    return markdownText(readLlmPageFile(page.path));
  },
);

server.registerTool(
  "get_syntax",
  {
    description:
      "Return one markdown syntax page for the editor source. Pass path from a previous link (and from, the page that contained the link), or request text plus an optional language. Linked pages are not merged in. Does not render a diagram.",
    inputSchema: {
      request: z.string().optional().describe("What the diagram should show"),
      language: formatSchema.optional(),
      path: z
        .string()
        .optional()
        .describe("Catalog path or a relative link from a previous page"),
      from: z
        .string()
        .optional()
        .describe("Catalog path of the page that contained the relative link"),
    },
  },
  async ({ request, language, path, from }) => {
    if (path?.trim()) {
      return markdownText(readLlmPageFile(path, from));
    }
    const page = resolveLlmPage({
      language,
      request: request ?? "",
    });
    return markdownText(readLlmPageFile(page.path));
  },
);

server.registerTool(
  "convert_diagram",
  {
    description:
      "Convert diagram source between the text languages PlantUML, Mermaid, and D2 in-process. Returns the converted source, the quality level, and the list of semantics that may be lost. Does not render an image.",
    inputSchema: {
      source: z.string().describe("Diagram source to convert"),
      from: z.enum(CONVERT_FORMATS).describe("Source language: plantuml, mermaid, or d2"),
      to: z.enum(CONVERT_FORMATS).describe("Target language: plantuml, mermaid, or d2"),
      locale: z.enum(["ru", "en"]).optional().describe("Language for loss labels, ru by default"),
    },
  },
  async ({ source, from, to, locale }) => {
    const result = await convertTool({
      source,
      from,
      to,
      locale: locale as ConvertToolLocale | undefined,
    });
    return jsonText(result);
  },
);

server.registerTool(
  "plan_diagram",
  {
    description:
      "Choose the Code2Graph language and diagram type for a natural-language request. Recognises semantic patterns (fan-in-queue, lifecycle-phase, secure-paved-road, governance-catalog, paired-policy-traces) and checks a complexity budget when counts are given. Takes the output handles size, detail, and audience and returns a one-line fidelity receipt. Does not generate source.",
    inputSchema: {
      request: z.string().describe("What the diagram should show"),
      format: formatSchema
        .optional()
        .describe("Force plantuml, mermaid, graphml, wiremark, d2, or structurizr"),
      pattern: z
        .string()
        .optional()
        .describe(
          "Force a semantic pattern id: fan-in-queue, lifecycle-phase, secure-paved-road, governance-catalog, paired-policy-traces",
        ),
      complexity: z
        .object({
          nodes: z.number().int().min(0).optional(),
          edges: z.number().int().min(0).optional(),
          lifelines: z.number().int().min(0).optional(),
          entities: z.number().int().min(0).optional(),
          lanes: z.number().int().min(0).optional(),
          depth: z.number().int().min(0).optional(),
          steps: z.number().int().min(0).optional(),
        })
        .optional()
        .describe("Planned counts; returns budget warnings when a per-type limit is exceeded"),
      size: sizeSchema.optional().describe(sizeDescription),
      detail: detailSchema.optional().describe(detailDescription),
      audience: audienceSchema.optional().describe(audienceDescription),
    },
  },
  async ({ request, format, pattern, complexity, size, detail, audience }) =>
    jsonText(planDiagram({ request, format, pattern, complexity, size, detail, audience })),
);

server.registerTool(
  "generate_diagram",
  {
    description:
      "Pick a Code2Graph language and return diagram source plus a rendered image. Uses CODE2GRAPH_API_URL for the source when set, otherwise builds the scaffold locally. The image is a separate MCP image block: PNG for PlantUML, D2, Structurizr (Kroki), GraphML, and WireMark; JPEG for Mermaid (mermaid.ink). Languages: PlantUML, Mermaid, GraphML, WireMark, D2, Structurizr. Output handles: size (frame and typography), detail (advisory node ceiling), audience (label wording); every result carries a one-line fidelity receipt.",
    inputSchema: {
      request: z.string().describe("What the diagram should show"),
      format: formatSchema.optional(),
      diagramType: z.string().optional(),
      locale: localeSchema.optional(),
      direction: directionSchema.optional(),
      count: z.number().int().min(1).max(8).optional(),
      size: sizeSchema.optional().describe(sizeDescription),
      detail: detailSchema.optional().describe(detailDescription),
      audience: audienceSchema.optional().describe(audienceDescription),
    },
  },
  async ({ request, format, diagramType, locale, direction, count, size, detail, audience }) => {
    const remote = await generateFromSite({
      request,
      format,
      diagramType,
      locale,
      direction,
      count,
      size,
      detail,
      audience,
    });
    if (remote) {
      return attachDiagramImage(remote);
    }

    const generated = generateDiagramScaffold({
      request,
      format,
      diagramType,
      locale,
      direction,
      count,
      size,
      detail,
      audience,
    });
    return attachDiagramImage({
      ...generated.plan,
      source: generated.scaffold.source,
      fileName: generated.scaffold.fileName,
      warnings: generated.scaffold.warnings,
      fidelity: generated.scaffold.fidelity,
    });
  },
);

async function generateFromSite(body: {
  request: string;
  format?: string;
  diagramType?: string;
  locale?: AgentDiagramLocale;
  direction?: "TB" | "LR";
  count?: number;
  size?: string;
  detail?: string;
  audience?: string;
}): Promise<unknown | null> {
  const baseUrl = process.env.CODE2GRAPH_API_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = process.env.CODE2GRAPH_API_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}/api/agent/diagrams/scaffold`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Code2Graph scaffold failed with ${response.status}: ${detail.slice(0, 200)}`,
    );
  }

  return response.json() as Promise<unknown>;
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
