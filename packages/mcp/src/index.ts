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
import { readLlmPageFile } from "./llm-page-file.js";

const formatSchema = z.enum(AGENT_DIAGRAM_LANGUAGES);
const localeSchema = z.enum(["ru", "en"]);
const directionSchema = z.enum(["TB", "LR"]);

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
  "plan_diagram",
  {
    description:
      "Choose the Code2Graph language and diagram type for a natural-language request. Does not generate source.",
    inputSchema: {
      request: z.string().describe("What the diagram should show"),
      format: formatSchema
        .optional()
        .describe("Force plantuml, mermaid, graphml, wiremark, d2, or structurizr"),
    },
  },
  async ({ request, format }) => jsonText(planDiagram({ request, format })),
);

server.registerTool(
  "generate_diagram",
  {
    description:
      "Pick a Code2Graph language and return diagram source plus a rendered image. Uses CODE2GRAPH_API_URL for the source when set, otherwise builds the scaffold locally. The image is a separate MCP image block: PNG for PlantUML, D2, Structurizr (Kroki), GraphML, and WireMark; JPEG for Mermaid (mermaid.ink). Languages: PlantUML, Mermaid, GraphML, WireMark, D2, Structurizr.",
    inputSchema: {
      request: z.string().describe("What the diagram should show"),
      format: formatSchema.optional(),
      diagramType: z.string().optional(),
      locale: localeSchema.optional(),
      direction: directionSchema.optional(),
      count: z.number().int().min(1).max(8).optional(),
    },
  },
  async ({ request, format, diagramType, locale, direction, count }) => {
    const remote = await generateFromSite({
      request,
      format,
      diagramType,
      locale,
      direction,
      count,
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
    });
    return attachDiagramImage({
      ...generated.plan,
      source: generated.scaffold.source,
      fileName: generated.scaffold.fileName,
      warnings: generated.scaffold.warnings,
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
