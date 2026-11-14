// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  installPlantUmlStdlibNetworkGuard,
  isBundledPlantUmlLibraryUrl,
  plantUmlStdlibBaseHref,
  plantUmlStdlibBundleStaysOnDevice,
  stripOffDeviceSvgResources,
} from "@/utils/offline-render-network";

describe("offline render stays on the device", () => {
  afterEach(() => {
    delete window.PLANTUML_STDLIB_LOADER;
    delete window.PLANTUML_STDLIB_BASE;
  });

  it("allows only bundled plantuml-lib files on the page origin", () => {
    const page = "https://code2graph.ru/editor";

    expect(
      isBundledPlantUmlLibraryUrl(
        "https://code2graph.ru/plantuml-lib/C4/C4_Context.puml",
        page,
      ),
    ).toBe(true);
    expect(
      isBundledPlantUmlLibraryUrl("https://evil.example/lib.puml", page),
    ).toBe(false);
    expect(
      isBundledPlantUmlLibraryUrl(
        "https://code2graph.ru/plantuml-lib/C4/C4_Context.puml?diagram=secret",
        page,
      ),
    ).toBe(false);
    expect(
      isBundledPlantUmlLibraryUrl("https://code2graph.ru/api/secret.puml", page),
    ).toBe(false);
  });

  it("keeps file-protocol library includes on disk", () => {
    expect(
      isBundledPlantUmlLibraryUrl(
        "file:///tmp/app/plantuml-lib/C4/C4_Context.puml",
        "file:///tmp/app/index.html",
      ),
    ).toBe(true);
    expect(
      isBundledPlantUmlLibraryUrl(
        "https://evil.example/plantuml-lib/C4/C4_Context.puml",
        "file:///tmp/app/index.html",
      ),
    ).toBe(false);
  });

  it("loads C4 icon bundles from the bundled plantuml-lib directory", () => {
    expect(plantUmlStdlibBaseHref("https://code2graph.ru/editor", "/")).toBe(
      "https://code2graph.ru/plantuml-lib/",
    );
    expect(plantUmlStdlibBaseHref("https://code2graph.ru/editor", "/app/")).toBe(
      "https://code2graph.ru/app/plantuml-lib/",
    );
    expect(plantUmlStdlibBaseHref("file:///tmp/app/index.html", "/")).toBe(
      "file:///tmp/app/plantuml-lib/",
    );
  });

  it("points the offline engine at local C4 sprites before rendering", () => {
    installPlantUmlStdlibNetworkGuard();
    expect(window.PLANTUML_STDLIB_BASE?.endsWith("/plantuml-lib/")).toBe(true);
    expect(plantUmlStdlibBundleStaysOnDevice("openiconic.js")).toBe(true);
  });

  it("rejects stdlib bundle names that would load a remote script", () => {
    expect(plantUmlStdlibBundleStaysOnDevice("aws.min.js")).toBe(true);
    expect(plantUmlStdlibBundleStaysOnDevice("stdlib/aws.min.js")).toBe(true);
    expect(
      plantUmlStdlibBundleStaysOnDevice("https://evil.example/aws.min.js"),
    ).toBe(false);
    expect(plantUmlStdlibBundleStaysOnDevice("//evil.example/aws.min.js")).toBe(
      false,
    );
    expect(plantUmlStdlibBundleStaysOnDevice("../aws.min.js")).toBe(false);
  });

  it("blocks a remote stdlib loader before a script tag is created", () => {
    installPlantUmlStdlibNetworkGuard();
    const loader = window.PLANTUML_STDLIB_LOADER;
    expect(loader).toBeTypeOf("function");

    const errors: string[] = [];
    const handled = loader?.(
      "https://evil.example/aws.min.js",
      () => {
        throw new Error("remote stdlib must not load");
      },
      (message) => {
        errors.push(message);
      },
    );

    expect(handled).toBe(true);
    expect(errors).toEqual(["include.remoteBlocked"]);
  });

  it("leaves an SVG without external resources byte-for-byte", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><use href="#node"/><rect fill="url(#shade)"/></svg>';
    expect(stripOffDeviceSvgResources(svg)).toBe(svg);
  });

  it("drops external image and stylesheet URLs from rendered SVG", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <style>@import "https://evil.example/font.css"; text { fill: url(https://evil.example/paint.png); }</style>
      <image href="https://evil.example/secret.png" xlink:href="https://evil.example/secret.png"/>
      <use href="#local-shape"/>
      <rect fill="url(#shade)"/>
      <a href="https://plantuml.com/guide"><text>docs</text></a>
    </svg>`;

    const cleaned = stripOffDeviceSvgResources(svg);

    expect(cleaned).not.toContain("evil.example");
    expect(cleaned).toContain('href="#local-shape"');
    expect(cleaned).toContain("url(#shade)");
    expect(cleaned).toContain("https://plantuml.com/guide");
  });

  it("keeps an embedded portrait on the image", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,aaaa" xlink:href="data:image/png;base64,aaaa"/></svg>';
    const cleaned = stripOffDeviceSvgResources(svg);
    expect(cleaned).toContain("data:image/png;base64,aaaa");
  });
});
