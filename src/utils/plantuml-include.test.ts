import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalizedAppError } from "@/utils/localized-app-error";
import {
  ARCHIMATE_INCLUDE_PATH,
  clearPlantUmlIncludeCache,
  mapStdlibIncludePath,
  resolvePlantUmlIncludeUrl,
  resolvePlantUmlIncludes,
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

describe("resolvePlantUmlIncludes network boundary", () => {
  afterEach(() => {
    clearPlantUmlIncludeCache();
    vi.unstubAllGlobals();
  });

  it("does not request an external include URL", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolvePlantUmlIncludes(`@startuml
!include https://evil.example/secret.puml
Alice -> Bob
@enduml`),
    ).rejects.toMatchObject({
      messageKey: "include.remoteBlocked",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not request an include outside the bundled library", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      resolvePlantUmlIncludes("!include https://code2graph.ru/api/diagrams/secret.puml"),
    ).rejects.toBeInstanceOf(LocalizedAppError);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads a bundled library include from the app origin", async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(
      async () => new Response("skinparam backgroundColor white\n", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const resolved = await resolvePlantUmlIncludes(
      "!include ./plantuml-lib/C4/C4_Context.puml",
    );

    expect(resolved).toContain("skinparam backgroundColor white");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchMock.mock.calls[0][0];
    expect(requestedUrl).toBe("http://localhost/plantuml-lib/C4/C4_Context.puml");
    expect(requestedUrl).not.toContain("Alice");
  });
});
