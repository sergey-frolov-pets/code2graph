// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  activeTrack,
  addOverlay,
  captureViewpoint,
  createPresentation,
} from "@/services/presentation/model";
import {
  presentationHtmlFileName,
  renderPresentationHtml,
  type PresentationHtmlSource,
} from "@/services/presentation/html-export";
import type { PresentationTrack } from "@/services/presentation/types";
import { LocalizedAppError } from "@/utils/localized-app-error";

const FRAME_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const DIAGRAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect id="diagram-box" width="200" height="100" fill="#fff"/></svg>`;

const LABELS = {
  first: "В начало",
  prev: "Назад",
  next: "Дальше",
  play: "Смотреть",
  pause: "Пауза",
  repeat: "По кругу",
};

function tour(name = "Walk / tour"): PresentationTrack {
  let document = createPresentation(name);
  document = captureViewpoint(document, document.activeTrackId, {
    anchorX: 0.25,
    anchorY: 0.3,
    scale: 1,
  });
  document = captureViewpoint(document, document.activeTrackId, {
    anchorX: 0.8,
    anchorY: 0.7,
    scale: 2,
  });
  const track = activeTrack(document);
  const first = track?.viewpoints[0];
  const second = track?.viewpoints[1];
  if (!track || !first || !second) {
    throw new Error("fixture");
  }
  document = addOverlay(document, track.id, { kind: "viewpoint", id: first.id }, "rect");
  document = addOverlay(document, track.id, { kind: "viewpoint", id: second.id }, "text");
  document = addOverlay(document, track.id, { kind: "viewpoint", id: first.id }, "arrow");
  const next = activeTrack(document);
  if (!next) {
    throw new Error("fixture");
  }
  return next;
}

function source(patch: Partial<PresentationHtmlSource> = {}): PresentationHtmlSource {
  return {
    svg: DIAGRAM_SVG,
    frameHref: FRAME_PNG,
    track: tour(),
    showOverlays: true,
    imageWidth: 200,
    imageHeight: 100,
    theme: {
      background: "#f4f7fb",
      accent: "#0f6cbd",
      surface: "#ffffff",
      text: "#1a1f24",
    },
    lang: "ru",
    dir: "ltr",
    labels: LABELS,
    ...patch,
  };
}

function openPlayer(html: string): Document {
  const requestFrame = window.requestAnimationFrame;
  const cancelFrame = window.cancelAnimationFrame;
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  document.open();
  document.write(html);
  document.close();
  window.requestAnimationFrame = requestFrame;
  window.cancelAnimationFrame = cancelFrame;
  return document;
}

describe("presentation html export", () => {
  it("names the file after the track", () => {
    expect(presentationHtmlFileName("Walk / tour")).toBe("Walk tour.html");
    expect(presentationHtmlFileName("   ")).toBe("presentation.html");
    expect(presentationHtmlFileName("demo.HTML")).toBe("demo.HTML");
  });

  it("embeds the diagram, the picture, and a step player", () => {
    const track = tour();
    const html = renderPresentationHtml(source({ track }));
    const doc = openPlayer(html);

    expect(doc.documentElement.lang).toBe("ru");
    expect(doc.title).toBe("Walk / tour");
    expect(doc.getElementById("c2g-prev")?.getAttribute("aria-label")).toBe("Назад");
    expect(doc.getElementById("c2g-next")?.getAttribute("aria-label")).toBe("Дальше");
    expect(doc.getElementById("c2g-index")?.textContent).toBe("1 / 2");
    expect(doc.getElementById("c2g-frame")?.getAttribute("src")).toBe(FRAME_PNG);
    expect(doc.getElementById("c2g-diagram-wrap")?.shadowRoot?.querySelector("#diagram-box")).not.toBeNull();
    expect(doc.getElementById("c2g-scene")?.getAttribute("style")).toContain("translate");

    const firstId = track.viewpoints[0]?.id ?? "";
    const secondId = track.viewpoints[1]?.id ?? "";
    const firstOverlay = doc.querySelector(`[data-owner-id="${firstId}"]`);
    const secondOverlay = doc.querySelector(`[data-owner-id="${secondId}"]`);
    expect((firstOverlay as HTMLElement | null)?.style.display ?? "").not.toBe("none");
    expect((secondOverlay as HTMLElement | null)?.style.display).toBe("none");
    expect(html).toContain("marker-end=\"url(#c2g-arrow-end-");

    doc.getElementById("c2g-next")?.click();
    expect(doc.getElementById("c2g-stage")?.dataset.phase).toBe("travel");
    doc.getElementById("c2g-first")?.click();
    expect(doc.getElementById("c2g-stage")?.dataset.phase).toBe("dwell");
    expect(doc.getElementById("c2g-stage")?.dataset.index).toBe("0");
    doc.getElementById("c2g-play")?.click();
    expect(doc.getElementById("c2g-play")?.dataset.state).toBe("pause");
  });

  it("keeps a hostile title and diagram script out of the running page", () => {
    const html = renderPresentationHtml(source({
      track: tour("</script><img src=x onerror=alert(1)>"),
      svg: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><script>window.hacked = true</script><rect id="kept" width="80" height="40"/></svg>`,
      frameHref: "javascript:alert(1)",
    }));
    expect(html.toLowerCase()).not.toContain("</script><img");
    expect(html).not.toContain("javascript:");
    const doc = openPlayer(html);
    expect(doc.getElementById("c2g-index")?.textContent).toBe("1 / 2");
    expect(doc.getElementById("c2g-diagram-wrap")?.shadowRoot?.querySelector("#kept")).not.toBeNull();
    expect(doc.getElementById("c2g-diagram-wrap")?.shadowRoot?.querySelector("script")).toBeNull();
    expect((window as unknown as { hacked?: boolean }).hacked).toBeUndefined();
    expect(doc.getElementById("c2g-frame-wrap")?.hasAttribute("hidden")).toBe(true);
  });

  it("omits overlays when they are hidden and rejects an empty tour", () => {
    const html = renderPresentationHtml(source({
      showOverlays: false,
      theme: {
        background: "transparent",
        accent: "#0f6cbd",
        surface: "#ffffff",
        text: "#1a1f24",
      },
    }));
    expect(html).toContain("c2g-checker");
    expect(new DOMParser().parseFromString(html, "text/html").querySelector("[data-owner-id]")).toBeNull();

    expect(() => renderPresentationHtml(source({
      track: { ...tour(), viewpoints: [], transitions: [], overlays: [] },
    }))).toThrow(LocalizedAppError);
    expect(() => renderPresentationHtml(source({ svg: "not a diagram" }))).toThrow(LocalizedAppError);
  });
});
