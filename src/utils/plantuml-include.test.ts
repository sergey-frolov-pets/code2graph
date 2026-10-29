import { describe, expect, it } from "vitest";
import {
  ARCHIMATE_INCLUDE_PATH,
  mapStdlibIncludePath,
  resolvePlantUmlIncludeUrl,
} from "@/utils/plantuml-include";

describe("ARCHIMATE_INCLUDE_PATH", () => {
  it("points to bundled local archimate library", () => {
    expect(ARCHIMATE_INCLUDE_PATH).toBe(
      "./plantuml-lib/archimate/Archimate.puml",
    );
  });
});

describe("mapStdlibIncludePath", () => {
  it("maps archimate stdlib include to local .puml path", () => {
    expect(mapStdlibIncludePath("<archimate/Archimate>")).toBe(
      "./plantuml-lib/archimate/Archimate.puml",
    );
  });

  it("keeps explicit .puml extension", () => {
    expect(mapStdlibIncludePath("<archimate/Archimate.puml>")).toBe(
      "./plantuml-lib/archimate/Archimate.puml",
    );
  });

  it("returns non-stdlib paths unchanged", () => {
    expect(mapStdlibIncludePath("./plantuml-lib/C4/C4_Context.puml")).toBe(
      "./plantuml-lib/C4/C4_Context.puml",
    );
  });
});

describe("resolvePlantUmlIncludeUrl", () => {
  const appBaseUrl = "https://code2graph.ru/editor";

  it("resolves stdlib archimate includes from app root, not parent include", () => {
    const parentUrl =
      "https://code2graph.ru/plantuml-lib/archimate/Archimate.puml";

    expect(
      resolvePlantUmlIncludeUrl(
        "<archimate/themes/shared_style>",
        parentUrl,
        appBaseUrl,
      ),
    ).toBe(
      "https://code2graph.ru/plantuml-lib/archimate/themes/shared_style.puml",
    );
  });

  it("resolves relative includes from parent include directory", () => {
    const parentUrl =
      "https://code2graph.ru/plantuml-lib/archimate/Archimate.puml";

    expect(
      resolvePlantUmlIncludeUrl("themes/shared_style.puml", parentUrl, appBaseUrl),
    ).toBe(
      "https://code2graph.ru/plantuml-lib/archimate/themes/shared_style.puml",
    );
  });
});
