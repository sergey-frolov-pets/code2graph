import { describe, expect, it } from "vitest";
import { onlineRenderSiteFor } from "@/utils/online-render-site";

describe("onlineRenderSiteFor", () => {
  it("names plantuml.com for PlantUML", () => {
    expect(onlineRenderSiteFor("plantuml", "@startuml\nAlice -> Bob\n@enduml")).toBe(
      "plantuml.com",
    );
  });

  it("names mermaid.ink for a standard Mermaid diagram", () => {
    expect(onlineRenderSiteFor("mermaid", "flowchart LR\n  A --> B")).toBe(
      "mermaid.ink",
    );
  });

  it("skips Mermaid extension types that the online server cannot render", () => {
    expect(onlineRenderSiteFor("mermaid", "waterfall\n  Task: 3")).toBeNull();
  });

  it("skips formats that render only on the device", () => {
    expect(onlineRenderSiteFor("graphml", "<graphml />")).toBeNull();
    expect(onlineRenderSiteFor("d2", "x -> y")).toBeNull();
    expect(onlineRenderSiteFor(undefined, "@startuml\n@enduml")).toBeNull();
  });
});