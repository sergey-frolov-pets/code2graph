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
  explore: "Свободное перемещение",
  playback: "К проигрыванию",
  zoomIn: "Увеличить",
  zoomOut: "Уменьшить",
  zoomLevel: "Масштаб {percent}%",
  resetView: "К этому кадру",
  savePng: "Сохранить вид в PNG",
  addSticker: "Добавить стикер",
  removeSticker: "Убрать стикер",
  resizeSticker: "Изменить размер стикера",
  sticker: "Комментарий",
};

function cameraOf(value: string | null | undefined): { x: number; y: number; scale: number } {
  const match = /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/.exec(value ?? "");
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(value ?? "");
  }
  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

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
    const bar = doc.getElementById("c2g-bar");
    expect(bar?.classList.contains("is-dim")).toBe(true);
    expect(bar?.classList.contains("is-held")).toBe(true);
    bar?.dispatchEvent(new Event("pointerleave"));
    expect(bar?.classList.contains("is-dim")).toBe(true);
    expect(bar?.classList.contains("is-held")).toBe(false);
    bar?.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true }));
    expect(bar?.classList.contains("is-revealed")).toBe(true);
    doc.getElementById("c2g-play")?.click();
    expect(bar?.classList.contains("is-dim")).toBe(false);
    expect(doc.getElementById("c2g-zoom")?.hidden).toBe(true);
    expect(doc.getElementById("c2g-mode")?.getAttribute("aria-label")).toBe("Свободное перемещение");
  });

  it("pans and zooms the saved tour, then saves a PNG with a sticker", async () => {
    const downloads: string[] = [];
    const painted: string[] = [];
    const realGetContext = HTMLCanvasElement.prototype.getContext;
    const realClick = HTMLAnchorElement.prototype.click;
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const realSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    let blobSeq = 0;
    URL.createObjectURL = () => {
      blobSeq += 1;
      return `blob:test-${blobSeq}`;
    };
    URL.revokeObjectURL = () => {};
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      configurable: true,
      enumerable: realSrc?.enumerable ?? true,
      get() {
        return realSrc?.get?.call(this) ?? "";
      },
      set(value: string) {
        const handler = this.onload;
        if (typeof handler === "function") handler.call(this, new Event("load"));
        realSrc?.set?.call(this, value);
      },
    });
    HTMLCanvasElement.prototype.getContext = (() => ({
      setTransform() {},
      translate() {},
      scale() {},
      fillRect() {},
      drawImage() { painted.push("image"); },
      save() {},
      restore() {},
      beginPath() {},
      rect() {},
      moveTo() {},
      lineTo() {},
      arcTo() {},
      closePath() {},
      fill() {},
      stroke() {},
      clip() {},
      fillText(value: string) { painted.push(value); },
      measureText(value: string) { return { width: value.length * 8 }; },
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback) {
      callback(new Blob(["png"], { type: "image/png" }));
    };
    HTMLAnchorElement.prototype.click = function clickDownload() {
      downloads.push(this.download);
    };

    const html = renderPresentationHtml(source());
    const doc = openPlayer(html);
    const scene = doc.getElementById("c2g-scene");
    const stage = doc.getElementById("c2g-stage");
    const before = cameraOf(scene?.style.transform);

    doc.getElementById("c2g-mode")?.click();
    expect(doc.getElementById("c2g-transport")?.hidden).toBe(true);
    expect(doc.getElementById("c2g-zoom")?.hidden).toBe(false);
    expect(doc.getElementById("c2g-repeat-wrap")?.hidden).toBe(true);
    expect(doc.getElementById("c2g-mode")?.getAttribute("aria-label")).toBe("К проигрыванию");
    expect(stage?.dataset.mode).toBe("explore");
    expect(cameraOf(scene?.style.transform)).toEqual(before);

    doc.getElementById("c2g-zoom-in")?.click();
    const zoomed = cameraOf(scene?.style.transform);
    expect(zoomed.scale).toBeCloseTo(before.scale * 1.15, 5);
    expect(doc.getElementById("c2g-zoom-level")?.textContent).toBe(`${Math.round(zoomed.scale * 100)}%`);
    expect(doc.getElementById("c2g-zoom-level")?.getAttribute("aria-label")).toBe(
      `Масштаб ${Math.round(zoomed.scale * 100)}%`,
    );

    doc.getElementById("c2g-zoom-reset")?.click();
    expect(cameraOf(scene?.style.transform)).toEqual(before);

    stage?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 80,
      clientY: 60,
      pointerId: 1,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 120,
      clientY: 40,
      pointerId: 1,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", {
      clientX: 120,
      clientY: 40,
      pointerId: 1,
      bubbles: true,
    }));
    const panned = cameraOf(scene?.style.transform);
    expect(panned.x).toBeCloseTo(before.x + 40, 5);
    expect(panned.y).toBeCloseTo(before.y - 20, 5);

    doc.getElementById("c2g-sticker")?.click();
    const sticker = doc.querySelector(".c2g-sticker");
    const text = sticker?.querySelector(".c2g-sticker-text");
    expect(sticker).toBeInstanceOf(HTMLElement);
    expect(text?.getAttribute("data-placeholder")).toBe("Комментарий");
    expect((sticker as HTMLElement).style.width).toBe("168px");
    if (text) text.textContent = "Заметка на схеме";
    const handle = sticker?.querySelector(".c2g-sticker-resize");
    handle?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 10,
      clientY: 10,
      pointerId: 2,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 40,
      clientY: 28,
      pointerId: 2,
      bubbles: true,
    }));
    expect((sticker as HTMLElement).style.width).toBe("198px");
    expect((sticker as HTMLElement).style.height).toBe("130px");

    try {
      doc.getElementById("c2g-camera")?.click();
      await new Promise((resolve) => { setTimeout(resolve, 0); });
      expect(downloads).toEqual(["Walk tour.png"]);
      expect(painted).toContain("image");
      expect(painted).toContain("Заметка на схеме");
      expect(painted).not.toContain("Walk / tour");
    } finally {
      HTMLCanvasElement.prototype.getContext = realGetContext;
      HTMLAnchorElement.prototype.click = realClick;
      URL.createObjectURL = realCreate;
      URL.revokeObjectURL = realRevoke;
      if (realSrc) Object.defineProperty(HTMLImageElement.prototype, "src", realSrc);
    }

    doc.getElementById("c2g-mode")?.click();
    expect(doc.getElementById("c2g-transport")?.hidden).toBe(false);
    expect(doc.getElementById("c2g-zoom")?.hidden).toBe(true);
    expect(cameraOf(scene?.style.transform)).toEqual(before);
    expect(doc.getElementById("c2g-notes")?.hidden).toBe(true);
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
