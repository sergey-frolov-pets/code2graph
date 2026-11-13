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
  moveSticker: "Перетащить стикер",
  sticker: "Комментарий",
  stickerColor: "Цвет стикера",
  saveCopy: "Сохранить копию с правками",
  hideMarks: "Скрыть правки",
  showMarks: "Показать правки",
  pen: "Карандаш",
  eraser: "Ластик",
  penColor: "Цвет линии",
  penWidth: "Толщина линии",
  copySuffix: "копия",
  keys: "Управление с клавиатуры",
  keysClose: "Закрыть",
  keysHelp: [
    "Проигрывание",
    "",
    "← → ↑ ↓ — предыдущий и следующий кадр",
    "Enter или Пробел — смотреть и пауза",
    "Home — в начало, End — в конец",
    "Tab и Shift+Tab — по кнопкам и стикерам",
    "M — свободное перемещение",
    "? или F1 — эта подсказка",
    "Esc — закрыть подсказку или пауза",
    "",
    "Свободное перемещение",
    "",
    "Стрелки — двигать схему, Shift — быстрее",
    "+ и − — масштаб, 0 — к этому кадру",
    "Enter — добавить стикер",
    "P — карандаш, E — ластик, [ и ] — толщина линии",
    "C — сохранить вид в PNG",
    "H — скрыть или показать правки",
    "S — сохранить копию",
    "M — к проигрыванию",
    "Esc — выключить карандаш или ластик, затем к проигрыванию",
  ].join("\n"),
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

  it("drives the saved tour from the keyboard and opens the guide in the export language", () => {
    const doc = openPlayer(renderPresentationHtml(source()));
    const stage = doc.getElementById("c2g-stage");
    const help = doc.getElementById("c2g-help");
    const guide = doc.getElementById("c2g-keys");

    help?.click();
    expect(guide?.hidden).toBe(false);
    expect(help?.getAttribute("aria-expanded")).toBe("true");
    expect(guide?.textContent).toContain("Проигрывание");
    expect(guide?.textContent).toContain("Свободное перемещение");
    expect(guide?.textContent).toContain("Tab");
    expect(guide?.textContent).toContain("Enter");
    expect(guide?.textContent).toContain("Esc");
    expect(guide?.querySelector("h2")?.textContent).toBe("Управление с клавиатуры");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(guide?.hidden).toBe(true);
    (doc.activeElement as HTMLElement | null)?.blur();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(doc.activeElement?.id).toBe("c2g-mode");
    (doc.activeElement as HTMLElement | null)?.blur();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(doc.activeElement?.id).toBe("c2g-repeat");
    (doc.activeElement as HTMLElement | null)?.blur();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(stage?.dataset.phase).toBe("travel");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(stage?.dataset.index).toBe("0");
    expect(stage?.dataset.phase).toBe("dwell");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(stage?.dataset.index).toBe("1");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(doc.getElementById("c2g-play")?.dataset.state).toBe("pause");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(doc.getElementById("c2g-play")?.dataset.state).toBe("play");

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1", bubbles: true }));
    expect(guide?.hidden).toBe(false);
    expect(guide?.contains(doc.activeElement)).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(guide?.contains(doc.activeElement)).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM", key: "ь", bubbles: true }));
    expect(stage?.dataset.mode).toBe("explore");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const sticker = doc.querySelector(".c2g-sticker");
    expect(sticker).toBeInstanceOf(HTMLElement);
    expect(doc.activeElement?.classList.contains("c2g-sticker-text")).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(sticker?.classList.contains("is-active")).toBe(false);
    expect(stage?.dataset.mode).toBe("explore");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyP", key: "з", bubbles: true }));
    expect(stage?.classList.contains("is-drawing")).toBe(true);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(stage?.classList.contains("is-drawing")).toBe(false);
    expect(stage?.dataset.mode).toBe("explore");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(stage?.dataset.mode).toBe("playback");
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
    expect(html).toContain("content: attr(aria-label)");
    expect(doc.getElementById("c2g-camera")?.getAttribute("aria-label")).toBe("Сохранить вид в PNG");
    expect(doc.getElementById("c2g-pen")?.getAttribute("aria-label")).toBe("Карандаш");
    expect(doc.getElementById("c2g-save-copy")?.getAttribute("aria-label")).toBe("Сохранить копию с правками");
  });

  it("pans and zooms the saved tour, then saves a PNG with a sticker", async () => {
    const downloads: string[] = [];
    const painted: string[] = [];
    const imageSrcs: string[] = [];
    const blobs: Blob[] = [];
    const realGetContext = HTMLCanvasElement.prototype.getContext;
    const realClick = HTMLAnchorElement.prototype.click;
    const realCreate = URL.createObjectURL;
    const realRevoke = URL.revokeObjectURL;
    const realSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
    let blobSeq = 0;
    URL.createObjectURL = (blob: Blob) => {
      blobs.push(blob);
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
        imageSrcs.push(value);
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
      arc() {},
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
    expect(scene?.contains(sticker as Node)).toBe(true);
    expect(text?.getAttribute("data-placeholder")).toBe("Комментарий");
    expect((sticker as HTMLElement).style.width).toBe("168px");
    expect((sticker as HTMLElement).classList.contains("is-active")).toBe(true);
    const grip = sticker?.querySelector(".c2g-sticker-move");
    expect(grip?.tagName).toBe("BUTTON");
    expect(grip?.getAttribute("aria-label")).toBe("Перетащить стикер");
    expect(grip?.querySelectorAll("circle")).toHaveLength(6);
    const beforeDragLeft = (sticker as HTMLElement).style.left;
    const beforeDragTop = (sticker as HTMLElement).style.top;
    grip?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 12,
      clientY: 12,
      pointerId: 8,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 36,
      clientY: 28,
      pointerId: 8,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 8, bubbles: true }));
    expect((sticker as HTMLElement).style.left).not.toBe(beforeDragLeft);
    expect((sticker as HTMLElement).style.top).not.toBe(beforeDragTop);
    const anchoredLeft = (sticker as HTMLElement).style.left;
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
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2, bubbles: true }));
    const transformAtAnchor = scene?.style.transform;

    stage?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 200,
      clientY: 80,
      pointerId: 3,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 230,
      clientY: 90,
      pointerId: 3,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 3, bubbles: true }));
    expect((sticker as HTMLElement).style.left).toBe(anchoredLeft);
    expect(scene?.style.transform).not.toBe(transformAtAnchor);

    sticker?.querySelector<HTMLElement>("[data-fill='#ffd6e0']")?.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true,
    }));
    expect((sticker as HTMLElement).getAttribute("data-fill")).toBe("#ffd6e0");
    expect((sticker as HTMLElement).style.getPropertyValue("--c2g-note")).toBe("#ffd6e0");

    sticker?.dispatchEvent(new FocusEvent("focusout", { relatedTarget: doc.body }));
    expect((sticker as HTMLElement).classList.contains("is-active")).toBe(false);
    const playerCss = doc.querySelector("style")?.textContent ?? "";
    expect(playerCss).toContain(".c2g-sticker:not(.is-active) .c2g-sticker-ui");
    expect(playerCss).not.toMatch(/\.c2g-sticker:not\(\.is-active\)\s*\{[^}]*transparent/);
    expect(playerCss).toMatch(/#c2g-pen-colors\s*\{[^}]*flex-flow:\s*row nowrap/);
    (sticker as HTMLElement).classList.add("is-active");

    const pen = doc.getElementById("c2g-pen");
    expect(pen?.querySelector(".c2g-icon-pen")).not.toBeNull();
    expect(pen?.querySelector(".c2g-icon-pencil")).not.toBeNull();
    pen?.click();
    expect(stage?.classList.contains("is-drawing")).toBe(true);
    expect(pen?.getAttribute("aria-pressed")).toBe("true");
    const toolOrder = [...(doc.getElementById("c2g-pen-tools")?.children ?? [])].map((node) => node.id);
    expect(toolOrder.indexOf("c2g-pen-width")).toBeLessThan(toolOrder.indexOf("c2g-pen-colors"));
    const widthInput = doc.getElementById("c2g-pen-width") as HTMLInputElement | null;
    if (widthInput) {
      widthInput.value = "6";
      widthInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    doc.querySelector<HTMLElement>("#c2g-pen-colors [data-color='#0f6cbd']")?.click();
    stage?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 100,
      clientY: 80,
      pointerId: 6,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 180,
      clientY: 140,
      pointerId: 6,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 6, bubbles: true }));
    const ink = doc.getElementById("c2g-ink");
    const drawn = ink?.querySelector("polyline");
    expect(scene?.contains(ink as Node)).toBe(true);
    expect(drawn?.getAttribute("stroke")).toBe("#0f6cbd");
    expect(drawn?.getAttribute("stroke-width")).toBe("6");
    const drawnPoints = drawn?.getAttribute("points");
    doc.getElementById("c2g-pen")?.click();
    const transformWithInk = scene?.style.transform;
    stage?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 30,
      clientY: 30,
      pointerId: 7,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 70,
      clientY: 50,
      pointerId: 7,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 7, bubbles: true }));
    expect(drawn?.getAttribute("points")).toBe(drawnPoints);
    expect(scene?.style.transform).not.toBe(transformWithInk);

    const eraser = doc.getElementById("c2g-eraser");
    expect(eraser?.getAttribute("aria-label")).toBe("Ластик");
    eraser?.click();
    expect(stage?.classList.contains("is-erasing")).toBe(true);
    expect(stage?.classList.contains("is-drawing")).toBe(false);
    expect(pen?.getAttribute("aria-pressed")).toBe("false");
    expect(eraser?.getAttribute("aria-pressed")).toBe("true");
    const exploreAt = playerCss.indexOf("#c2g-stage.is-exploring");
    const drawAt = playerCss.indexOf("#c2g-stage.is-drawing");
    const eraseAt = playerCss.indexOf("#c2g-stage.is-erasing");
    expect(drawAt).toBeGreaterThan(exploreAt);
    expect(eraseAt).toBeGreaterThan(drawAt);
    expect(playerCss.slice(drawAt, eraseAt)).toContain("data:image/svg+xml");
    expect(playerCss.slice(eraseAt)).toContain("data:image/svg+xml");
    expect(doc.documentElement.innerHTML).toContain("cursor:inherit");
    stage?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 140,
      clientY: 110,
      pointerId: 9,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 160,
      clientY: 125,
      pointerId: 9,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 9, bubbles: true }));
    expect(ink?.querySelector("polyline")).toBeNull();
    eraser?.click();
    expect(stage?.classList.contains("is-erasing")).toBe(false);
    pen?.click();
    stage?.dispatchEvent(new PointerEvent("pointerdown", {
      clientX: 40,
      clientY: 40,
      pointerId: 11,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointermove", {
      clientX: 90,
      clientY: 70,
      pointerId: 11,
      bubbles: true,
    }));
    window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 11, bubbles: true }));
    pen?.click();
    expect(ink?.querySelector("polyline")).not.toBeNull();

    const marks = doc.getElementById("c2g-marks");
    marks?.click();
    expect(stage?.classList.contains("is-marks-hidden")).toBe(true);
    expect(marks?.getAttribute("aria-label")).toBe("Показать правки");
    expect(marks?.getAttribute("aria-pressed")).toBe("true");
    marks?.click();
    expect(stage?.classList.contains("is-marks-hidden")).toBe(false);

    try {
      doc.getElementById("c2g-camera")?.click();
      await new Promise((resolve) => { setTimeout(resolve, 0); });
      expect(downloads).toEqual(["Walk tour.png"]);
      expect(painted).toContain("image");
      expect(painted).toContain("Заметка на схеме");
      expect(painted).not.toContain("Walk / tour");
      const svgSources = imageSrcs.filter((src) => src.includes("svg"));
      expect(svgSources.length).toBeGreaterThan(0);
      expect(svgSources.every((src) => src.startsWith("data:image/svg+xml"))).toBe(true);

      if (text) text.textContent = "Заметка на схеме</script><img src=x>";
      doc.getElementById("c2g-save-copy")?.click();
      expect(downloads).toContain("Walk tour копия.html");
      const htmlBlob = blobs.find((blob) => blob.type.startsWith("text/html"));
      expect(htmlBlob).toBeTruthy();
      const saved = await htmlBlob?.text();
      expect(saved).toContain("Заметка на схеме");
      expect(saved).toContain("#0f6cbd");
      expect(saved?.toLowerCase()).not.toContain("</script><img");

      const handleAgain = sticker?.querySelector(".c2g-sticker-resize");
      handleAgain?.dispatchEvent(new PointerEvent("pointerdown", {
        clientX: 0,
        clientY: 0,
        pointerId: 5,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent("pointermove", {
        clientX: -500,
        clientY: -500,
        pointerId: 5,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 5, bubbles: true }));
      expect((sticker as HTMLElement).style.width).toBe("18px");
      expect((sticker as HTMLElement).style.height).toBe("18px");
      expect(parseFloat((sticker as HTMLElement).style.fontSize)).toBeCloseTo((14 * 18) / 112, 2);

      doc.getElementById("c2g-zoom-in")?.click();
      const zoomedScale = cameraOf(scene?.style.transform).scale;
      doc.getElementById("c2g-pen")?.click();
      const zoomedWidth = doc.getElementById("c2g-pen-width") as HTMLInputElement | null;
      if (zoomedWidth) {
        zoomedWidth.value = "6";
        zoomedWidth.dispatchEvent(new Event("input", { bubbles: true }));
      }
      stage?.dispatchEvent(new PointerEvent("pointerdown", {
        clientX: 24,
        clientY: 24,
        pointerId: 12,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent("pointermove", {
        clientX: 96,
        clientY: 64,
        pointerId: 12,
        bubbles: true,
      }));
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 12, bubbles: true }));
      const scaledLines = ink?.querySelectorAll("polyline");
      const scaledLine = scaledLines?.[scaledLines.length - 1];
      expect(parseFloat(scaledLine?.getAttribute("stroke-width") ?? "")).toBeCloseTo(6 / zoomedScale, 2);
      doc.getElementById("c2g-pen")?.click();
      const stickerCount = doc.querySelectorAll(".c2g-sticker").length;
      doc.getElementById("c2g-sticker")?.click();
      const scaledSticker = doc.querySelectorAll(".c2g-sticker")[stickerCount] as HTMLElement | undefined;
      expect(parseFloat(scaledSticker?.style.width ?? "")).toBeCloseTo(168 / zoomedScale, 2);
      expect(parseFloat(scaledSticker?.style.height ?? "")).toBeCloseTo(112 / zoomedScale, 2);
      expect(parseFloat(scaledSticker?.style.fontSize ?? "")).toBeCloseTo(14 / zoomedScale, 2);
      expect(parseFloat(doc.getElementById("c2g-stage")?.style.getPropertyValue("--c2g-inv") ?? "")).toBeCloseTo(1 / zoomedScale, 2);
      expect(scaledSticker?.querySelector(".c2g-sticker-chrome")).not.toBeNull();
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
    expect(doc.getElementById("c2g-notes")?.hidden).toBe(false);
    expect(scene?.querySelector(".c2g-sticker")).not.toBeNull();
    expect(scene?.querySelector("#c2g-ink polyline")).not.toBeNull();
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
