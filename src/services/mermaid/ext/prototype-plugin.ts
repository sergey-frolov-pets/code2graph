/**
 * Прототип официального пути: регистрация внешней диаграммы через
 * mermaid.registerLazyLoadedDiagrams(). Проверяем, что API работает на 11.17.2
 * и что наш рендерер может отдавать SVG.
 *
 * Если прототип проходит — этап 1A становится основным путём (меньше кода,
 * бесплатная тема/aria/sanitize/совместимость с mermaid.ink).
 */
import type { DiagramDefinition } from "mermaid";

const WATERFALL_RE = /^\s*waterfall(-variance|-multi|-scenario)?\b/i;

interface Bar {
  label: string;
  value: number;
  kind: "start" | "delta" | "total";
  sign: 1 | -1;
}

interface WaterfallModel {
  title: string;
  bars: Bar[];
}

/** Минимальный парсер прототипа: `=N : label`, `+N : label`, `-N : label`. */
function parseWaterfall(text: string): WaterfallModel {
  const model: WaterfallModel = { title: "", bars: [] };
  let running = 0;
  const lines = text.split(/\r?\n/);

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("%%")) continue;

    if (/^title\s+/i.test(raw)) {
      model.title = raw.replace(/^title\s+/i, "").trim();
      continue;
    }
    if (/^y(-axis)?\s/i.test(raw)) continue; // диапазон оси в прототипе не используем

    const m = raw.match(/^(=|\+|-)\s*(-?\d+(?:\.\d+)?)\s*(?::\s*(.*))?$/);
    if (!m) {
      throw new Error(`Неизвестная строка ${i + 1}: «${raw}»`);
    }
    const sign = m[1] === "-" ? -1 : 1;
    const amount = Number(m[2]) * (m[1] === "-" ? -1 : 1);
    const label = (m[3] ?? "").trim() || String(amount);

    if (m[1] === "=") {
      running = amount;
      model.bars.push({ label, value: running, kind: "start", sign: 1 });
    } else {
      running += amount;
      model.bars.push({ label, value: running, kind: "delta", sign });
    }
  }
  return model;
}

/** Рендер в DOM-контейнер — так требует DiagramRenderer Mermaid. */
function drawWaterfall(text: string, id: string): void {
  const container = document.getElementById(id);
  if (!container) return;

  const model = parseWaterfall(text);
  const W = 640;
  const H = 320;
  const padL = 48;
  const padB = 48;
  const padT = 40;
  const plotW = W - padL - 24;
  const plotH = H - padT - padB;

  const values = model.bars.map((b) => b.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values) || 1;
  const span = max - min || 1;
  const yOf = (v: number) => padT + plotH - ((v - min) / span) * plotH;

  const barW = Math.min(80, plotW / Math.max(model.bars.length, 1) - 12);
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-roledescription="waterfallDiagram">`,
  );
  if (model.title) {
    parts.push(
      `<text x="${W / 2}" y="22" text-anchor="middle" font-size="15" font-weight="600">${esc(model.title)}</text>`,
    );
  }
  // нулевая линия
  parts.push(
    `<line x1="${padL}" y1="${yOf(0)}" x2="${padL + plotW}" y2="${yOf(0)}" stroke="#9aa0a6" stroke-width="1"/>`,
  );

  let prevValue = 0;
  model.bars.forEach((bar, i) => {
    const x = padL + i * (plotW / model.bars.length) + (plotW / model.bars.length - barW) / 2;
    const from = bar.kind === "delta" ? prevValue : 0;
    const to = bar.value;
    const y = yOf(Math.max(from, to));
    const h = Math.max(2, Math.abs(yOf(from) - yOf(to)));
    const fill =
      bar.kind === "delta" ? (bar.sign > 0 ? "#16a34a" : "#dc2626") : "#2563eb";

    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}"/>`,
    );
    parts.push(
      `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" font-size="11">${bar.value}</text>`,
    );
    parts.push(
      `<text x="${(x + barW / 2).toFixed(1)}" y="${(H - padB + 18).toFixed(1)}" text-anchor="middle" font-size="11" fill="#5f6368">${esc(bar.label)}</text>`,
    );
    prevValue = to;
  });

  parts.push("</svg>");
  container.innerHTML = parts.join("");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const waterfallPrototype: DiagramDefinition = {
  parser: {
    parse: (text: string) => {
      parseWaterfall(text); // бросает Error с номером строки при мусоре
    },
  },
  // db не нужен: прототип парсит дважды (в parse и в draw) — для проверки API этого достаточно
  db: { getDiagramTitle: () => "", clear: () => {} },
  renderer: {
    draw: (text: string, id: string) => {
      drawWaterfall(text, id);
    },
  },
  styles: () => "",
} as unknown as DiagramDefinition;

export const waterfallExternal = {
  id: "waterfall",
  detector: (txt: string) => WATERFALL_RE.test(txt),
  loader: async () => ({ id: "waterfall", diagram: waterfallPrototype }),
};
