// @vitest-environment jsdom

import { createApp, h, nextTick, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SnippetsPanel from "@/components/SnippetsPanel.vue";
import { BUILTIN_SNIPPETS } from "@/constants/builtin-snippets";
import {
  resolveSnippetCategoryFromDiagram,
  useSnippets,
} from "@/composables/useSnippets";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { getDiagramFormatDefinition } from "@/languages/registry";
import {
  parseSnippetsExportPayload,
  parseSnippetsFromText,
  serializeSnippetsToText,
  SNIPPETS_TEXT_BLOCK_END,
  STORAGE_KEY_CUSTOM_SNIPPETS,
} from "@/storage/snippets";
import { SNIPPET_LANGUAGE_IDS, type CustomSnippet } from "@/types/snippets";

describe("builtin snippets coverage", () => {
  it("supports snippets on every diagram format except GraphML", () => {
    expect(getDiagramFormatDefinition("plantuml").supportsSnippets).toBe(true);
    expect(getDiagramFormatDefinition("mermaid").supportsSnippets).toBe(true);
    expect(getDiagramFormatDefinition("wiremark").supportsSnippets).toBe(true);
    expect(getDiagramFormatDefinition("d2").supportsSnippets).toBe(true);
    expect(getDiagramFormatDefinition("structurizr").supportsSnippets).toBe(true);
    expect(getDiagramFormatDefinition("graphml").supportsSnippets).toBe(false);
  });

  it("includes built-in snippets for every snippet language and excludes graphml", () => {
    for (const language of SNIPPET_LANGUAGE_IDS) {
      const items = BUILTIN_SNIPPETS.filter((item) => item.language === language);
      expect(items.length).toBeGreaterThan(0);
    }

    const languagesInCatalog = new Set<string>(
      BUILTIN_SNIPPETS.map((item) => item.language),
    );
    expect(languagesInCatalog.has("graphml")).toBe(false);
  });
});

describe("snippets text serialization & import", () => {
  it("round-trips custom snippets through text file format including multiline code and delimiters", () => {
    const sample: CustomSnippet[] = [
      {
        id: "custom-1",
        language: "mermaid",
        categoryId: "sequence",
        title: "Auth handshake",
        description: "JWT verification\nstep",
        content: `sequenceDiagram\n  Client->>API: Token\n${SNIPPETS_TEXT_BLOCK_END}\n  API-->>Client: 200 OK`,
        createdAt: "2026-01-10T10:00:00.000Z",
        updatedAt: "2026-01-11T12:00:00.000Z",
      },
      {
        id: "custom-2",
        language: "d2",
        categoryId: "architecture",
        title: "D2 service",
        content: 'api: "API" {shape: hexagon}',
        createdAt: "2026-01-10T10:00:00.000Z",
        updatedAt: "2026-01-11T12:00:00.000Z",
      },
    ];

    const text = serializeSnippetsToText(sample);
    const parsedFromText = parseSnippetsFromText(text);
    const parsedAuto = parseSnippetsExportPayload(text);

    expect(parsedFromText).toEqual(sample);
    expect(parsedAuto).toEqual(sample);
  });

  it("maintains backward compatibility with legacy PlantUML JSON exports without language field", () => {
    const legacyJson = JSON.stringify({
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      snippets: [
        {
          id: "legacy-1",
          title: "Legacy snippet",
          content: "Alice -> Bob : Hi",
          categoryId: "sequence",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const parsed = parseSnippetsExportPayload(legacyJson);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.language).toBe("plantuml");
    expect(parsed[0]?.categoryId).toBe("sequence");
  });

  it("rejects arbitrary unrecognized text on import", () => {
    expect(() => parseSnippetsExportPayload("hello world")).toThrow(
      "invalid_format",
    );
  });
});

describe("useSnippets filtering, cross-cutting search & active diagram defaults", () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_SNIPPETS);
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY_CUSTOM_SNIPPETS);
  });

  it("selects language and diagram type tags from the active diagram by default", () => {
    const mermaidState = useSnippets({
      initialFormat: "mermaid",
      initialSource: "sequenceDiagram\n  Alice->>Bob: ping",
    });
    expect(mermaidState.activeLanguage.value).toBe("mermaid");
    expect(mermaidState.activeCategory.value).toBe("sequence");

    const d2Sql = useSnippets({
      initialFormat: "d2",
      initialSource: "users: {\n  shape: sql_table\n  id: int\n}",
    });
    expect(d2Sql.activeLanguage.value).toBe("d2");
    expect(d2Sql.activeCategory.value).toBe("er");

    const wiremark = useSnippets({
      initialFormat: "wiremark",
      initialSource: 'Wireframe #login mobile\n  Button "OK"',
    });
    expect(wiremark.activeLanguage.value).toBe("wiremark");
    expect(wiremark.activeCategory.value).toBe("wireframe");
  });

  it("leaves both language and diagram type unselected when editor format is GraphML", () => {
    const graphmlSource = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="directed"><node id="n1"/></graph>
</graphml>`;

    const snippets = useSnippets({
      initialFormat: "graphml",
      initialSource: graphmlSource,
    });

    expect(snippets.activeLanguage.value).toBeNull();
    expect(snippets.activeCategory.value).toBeNull();
    expect(snippets.filterItems().length).toBe(BUILTIN_SNIPPETS.length);
  });

  it("toggles language and category tags off when clicked again", () => {
    const snippets = useSnippets({
      initialFormat: "plantuml",
      initialSource: "@startuml\nclass User\n@enduml",
    });

    expect(snippets.activeLanguage.value).toBe("plantuml");
    expect(snippets.activeCategory.value).toBe("classes");

    snippets.toggleCategoryTag("classes");
    expect(snippets.activeCategory.value).toBeNull();

    snippets.toggleLanguageTag("plantuml");
    expect(snippets.activeLanguage.value).toBeNull();
  });

  it("matches every search token against the full snippet code and ignores title-only hits", () => {
    const snippets = useSnippets();

    snippets.searchQuery.value = "deploymentNode Kubernetes";
    const found = snippets.filterItems();
    expect(found).toHaveLength(1);
    expect(found[0]?.kind === "builtin" && found[0].id).toBe(
      "structurizr-deployment",
    );

    snippets.searchQuery.value = "primary_key foreign_key";
    const tables = snippets.filterItems();
    expect(tables).toHaveLength(1);
    expect(tables[0]?.kind === "builtin" && tables[0].id).toBe("d2-sql-table");

    snippets.searchQuery.value = "Формы узлов";
    expect(snippets.filterItems()).toHaveLength(0);

    snippets.searchQuery.value = "Прямоугольник, цилиндр";
    expect(snippets.filterItems()).toHaveLength(0);

    snippets.addCustomSnippet({
      language: "plantuml",
      title: "Секретное название",
      description: "только в описании",
      content: "alpha beta\ngamma delta",
    });

    snippets.searchQuery.value = "секретное название";
    expect(snippets.filterItems()).toHaveLength(0);

    snippets.searchQuery.value = "только в описании";
    expect(snippets.filterItems()).toHaveLength(0);

    snippets.searchQuery.value = "beta   gamma";
    const customFound = snippets.filterItems();
    expect(customFound).toHaveLength(1);
    expect(customFound[0]?.kind).toBe("custom");

    snippets.setActiveLanguage("plantuml");
    snippets.searchQuery.value = "deploymentNode";
    expect(snippets.filterItems()).toHaveLength(0);
  });

  it("merges and replaces custom snippets from text files without duplicating identical entries", () => {
    const snippets = useSnippets({ initialFormat: "mermaid" });
    const created = snippets.addCustomSnippet({
      language: "mermaid",
      categoryId: "flowchart",
      title: "Custom Decision",
      content: "flowchart LR\n  A --> B",
    });

    const exportedText = serializeSnippetsToText([
      created,
      {
        id: "imported-wiremark",
        language: "wiremark",
        categoryId: "wireframe",
        title: "Header bar",
        content: 'AppBar\n  Toolbar\n    Typography h6 "App"',
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ]);

    const merged = snippets.importCustomSnippets(exportedText, "merge");
    expect(merged).toEqual({ imported: 1, skipped: 1 });
    expect(snippets.customSnippets.value).toHaveLength(2);

    const replaced = snippets.importCustomSnippets(
      serializeSnippetsToText([
        {
          id: "only-one",
          language: "d2",
          categoryId: "custom",
          title: "Single D2",
          content: "a -> b",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ]),
      "replace",
    );
    expect(replaced).toEqual({ imported: 1, skipped: 0 });
    expect(snippets.customSnippets.value).toHaveLength(1);
    expect(snippets.customSnippets.value[0]?.language).toBe("d2");
  });

  it("maps diagram sources across formats to snippet categories", () => {
    expect(
      resolveSnippetCategoryFromDiagram("pie\n  \"A\" : 40", "mermaid"),
    ).toBe("charts");
    expect(
      resolveSnippetCategoryFromDiagram("@startwbs\n* Root\n@endwbs", "plantuml"),
    ).toBe("wbs");
    expect(
      resolveSnippetCategoryFromDiagram(
        'workspace {\n  views {\n    dynamic app "Flow" {\n    }\n  }\n}',
        "structurizr",
      ),
    ).toBe("sequence");
    expect(
      resolveSnippetCategoryFromDiagram("<graphml/>", "graphml"),
    ).toBeNull();
  });
});

describe("SnippetsPanel default pressed tags", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.removeItem(STORAGE_KEY_CUSTOM_SNIPPETS);
  });

  it("renders pressed language & category tags for Mermaid flowchart and unpressed for GraphML", async () => {
    const format = ref<DiagramFormat>("mermaid");
    const source = ref("flowchart TD\n  A --> B");
    const open = ref(true);

    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp({
      setup() {
        return () =>
          h(SnippetsPanel, {
            open: open.value,
            diagramFormat: format.value,
            source: source.value,
          });
      },
    });
    app.mount(host);
    await nextTick();

    const mermaidBtn = document.body.querySelector(
      '[data-testid="snippets-lang-mermaid"]',
    );
    const flowchartBtn = document.body.querySelector(
      '[data-testid="snippets-cat-flowchart"]',
    );
    expect(mermaidBtn?.getAttribute("aria-pressed")).toBe("true");
    expect(flowchartBtn?.getAttribute("aria-pressed")).toBe("true");

    format.value = "graphml";
    source.value = '<?xml version="1.0"?><graphml><graph/></graphml>';
    await nextTick();

    const activeTags = document.body.querySelectorAll(
      ".snippets-panel__tag.is-active",
    );
    expect(activeTags).toHaveLength(0);
    expect(document.body.querySelector('[data-testid="snippets-lang-graphml"]')).toBeNull();

    app.unmount();
    host.remove();
  });

  it("filters the open panel by snippet code rather than the card title", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp({
      setup() {
        return () =>
          h(SnippetsPanel, {
            open: true,
            diagramFormat: "mermaid",
            source: "flowchart TD\n  A --> B",
          });
      },
    });
    app.mount(host);
    await nextTick();

    const input = document.body.querySelector<HTMLInputElement>(
      '[data-testid="snippets-search"]',
    );
    expect(input).not.toBeNull();

    input!.value = "Diamond";
    input!.dispatchEvent(new Event("input"));
    await nextTick();

    const previews = [
      ...document.body.querySelectorAll(".snippet-card__preview"),
    ].map((node) => node.textContent ?? "");
    expect(previews).toHaveLength(1);
    expect(previews[0]).toContain("Diamond");
    expect(previews[0]).not.toContain("Формы узлов");

    input!.value = "Формы узлов";
    input!.dispatchEvent(new Event("input"));
    await nextTick();

    expect(document.body.querySelector(".snippet-card")).toBeNull();
    expect(document.body.querySelector(".snippets-panel__empty")).not.toBeNull();

    app.unmount();
    host.remove();
  });
});
