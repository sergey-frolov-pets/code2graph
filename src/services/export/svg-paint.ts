/**
 * Офлайн PlantUML пишет прозрачную заливку как `#RRGGBBAA` (`#00000000`).
 * В части браузеров и при разборе SVG как картинки такой цвет не читается
 * и фигура закрашивается чёрным по умолчанию: папки, рамки, границы C4.
 * Нулевая альфа становится `none`, непрозрачный цвет — обычным `#RRGGBB`.
 */

const HEX8 = /^#([0-9a-fA-F]{8})$/;
const HEX8_TOKEN = /#([0-9a-fA-F]{8})\b/g;
const PAINT_ATTRIBUTES = ["fill", "stroke", "stop-color", "flood-color", "lighting-color"];

interface RgbPaint {
  rgb: string;
  alpha: number;
}

function parseHex8(value: string): RgbPaint | null {
  const match = HEX8.exec(value.trim());
  if (!match) {
    return null;
  }
  const digits = match[1];
  return {
    rgb: `#${digits.slice(0, 6)}`,
    alpha: Number.parseInt(digits.slice(6), 16) / 255,
  };
}

function opacityAttribute(name: string): string | null {
  if (name === "fill" || name === "stop-color" || name === "flood-color") {
    return "fill-opacity";
  }
  if (name === "stroke") {
    return "stroke-opacity";
  }
  return null;
}

function applyPaintAttribute(element: Element, name: string, value: string): void {
  const paint = parseHex8(value);
  if (!paint) {
    return;
  }
  if (paint.alpha <= 0) {
    element.setAttribute(name, "none");
    return;
  }

  element.setAttribute(name, paint.rgb);
  if (paint.alpha >= 1) {
    return;
  }

  const opacityName = opacityAttribute(name);
  if (!opacityName) {
    return;
  }
  const existing = Number.parseFloat(element.getAttribute(opacityName) ?? "1");
  const next = (Number.isFinite(existing) ? existing : 1) * paint.alpha;
  element.setAttribute(opacityName, String(Math.round(next * 1000) / 1000));
}

function rewriteStylePaints(style: string): string {
  return style.replace(HEX8_TOKEN, (token) => {
    const paint = parseHex8(token);
    if (!paint || paint.alpha <= 0) {
      return "none";
    }
    return paint.rgb;
  });
}

function fallbackRewrite(svg: string): string {
  return svg.replace(HEX8_TOKEN, (token) => {
    const paint = parseHex8(token);
    if (!paint || paint.alpha <= 0) {
      return "none";
    }
    return paint.rgb;
  });
}

export function normalizeSvgPaintColors(svg: string): string {
  if (!svg.includes("<svg") || !/#(?:[0-9a-fA-F]{8})\b/.test(svg)) {
    return svg;
  }
  if (typeof DOMParser === "undefined") {
    return fallbackRewrite(svg);
  }

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return fallbackRewrite(svg);
  }

  const elements = [root, ...root.querySelectorAll("*")];
  for (const element of elements) {
    for (const name of PAINT_ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value) {
        applyPaintAttribute(element, name, value);
      }
    }
    const style = element.getAttribute("style");
    if (style && /#(?:[0-9a-fA-F]{8})\b/.test(style)) {
      element.setAttribute("style", rewriteStylePaints(style));
    }
    if (element.tagName.toLowerCase() === "style" && element.textContent) {
      element.textContent = rewriteStylePaints(element.textContent);
    }
  }

  return new XMLSerializer().serializeToString(root);
}
