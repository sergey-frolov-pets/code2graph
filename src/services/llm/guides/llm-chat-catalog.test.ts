import { describe, expect, it } from "vitest";
import {
  acceptChatSyntaxPaths,
  buildLlmChatCatalog,
  composeLoadedSyntaxPages,
  LLM_SYNTAX_REPLY_LINE,
  stripSyntaxPageChrome,
} from "@/services/llm/guides/llm-chat-catalog";
import { bundledLlmPage } from "@/services/llm/guides/llm-page-text";

describe("buildLlmChatCatalog", () => {
  it("lists mermaid subpages and leaves example bodies out", () => {
    const catalog = buildLlmChatCatalog("mermaid");

    expect(catalog).toContain("mermaid/ext/series-analytics.md");
    expect(catalog).toContain("mermaid/ext/series-scale.md");
    expect(catalog).toContain("break");
    expect(catalog).toContain("y2");
    expect(catalog).toContain("selects the Mermaid Ext type");
    expect(catalog).not.toContain("line 160");
    expect(catalog).not.toContain("Follow a link");
    expect(catalog.split(LLM_SYNTAX_REPLY_LINE)).toHaveLength(2);
  });

  it("stays inside the requested language", () => {
    const catalog = buildLlmChatCatalog("plantuml");

    expect(catalog).toContain("plantuml/sequence.md");
    expect(catalog).not.toContain("mermaid/");
  });
});

describe("acceptChatSyntaxPaths", () => {
  it("keeps catalog cards of the current language, at most four", () => {
    expect(
      acceptChatSyntaxPaths(
        [
          "mermaid/ext/series.md",
          "mermaid/ext/series-analytics.md",
          "../secret.md",
          "plantuml/sequence.md",
          "mermaid/shared.md",
          "mermaid/index.md",
        ],
        "mermaid",
      ),
    ).toEqual(["mermaid/ext/series.md", "mermaid/ext/series-analytics.md"]);

    expect(
      acceptChatSyntaxPaths(
        [
          "mermaid/sequence.md",
          "mermaid/class.md",
          "mermaid/state.md",
          "mermaid/er.md",
          "mermaid/pie.md",
        ],
        "mermaid",
      ),
    ).toHaveLength(4);
  });
});

describe("composeLoadedSyntaxPages", () => {
  it("keeps several page bodies and one reply line", () => {
    const series = bundledLlmPage("mermaid/ext/series.md");
    const analytics = bundledLlmPage("mermaid/ext/series-analytics.md");
    const text = composeLoadedSyntaxPages([
      { path: "mermaid/ext/series.md", body: series },
      { path: "mermaid/ext/series-analytics.md", body: analytics },
    ]);

    expect(text).toContain("The first line is only");
    expect(text).toContain("line 160");
    expect(text).toContain("Page: mermaid/ext/series-analytics.md");
    expect(text.split(LLM_SYNTAX_REPLY_LINE)).toHaveLength(2);
    expect(stripSyntaxPageChrome(series)).not.toContain("](");
  });
});
