/**
 * Доступность экспортируемого SVG.
 *
 * Что делает:
 * 1. Помечает корень `role="img"` и `aria-labelledby`, добавляет `<title>`/`<desc>`
 *    первыми детьми — скринридер читает диаграмму как картинку с названием.
 * 2. Префиксует все внутренние `id` и переписывает ссылки на них
 *    (`url(#id)`, `href`, `xlink:href`, `clip-path`, `mask`, `filter`, `<style>`),
 *    чтобы две диаграммы на одной странице не затирали друг друга.
 *
 * Модуль чистый: строка → DOM → строка, без Vue и состояния.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export interface SvgA11yOptions {
  /** Заголовок диаграммы. Пусто — берётся `fallbackTitle`. */
  title?: string;
  /** Необязательное описание для скринридеров. */
  description?: string;
  /** Префикс внутренних id. По умолчанию — стабильный хеш содержимого. */
  idPrefix?: string;
  /** Заголовок на случай пустого `title`. */
  fallbackTitle?: string;
}

export interface SvgA11yReport {
  /** false — SVG уже размечен (или разбор не удался), строка не изменилась. */
  applied: boolean;
  titleId: string;
  descriptionId: string;
  /** Сколько внутренних id получило префикс. */
  renamedIds: number;
}

const URL_REF = /url\(\s*#([^)\s"']+)\s*\)/g;

function asText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function sanitizeIdSegment(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "id";
}

function hashContent(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36).slice(0, 8);
}

function collectIds(root: Element): Set<string> {
  const ids = new Set<string>();
  for (const element of Array.from(root.querySelectorAll("[id]"))) {
    const id = element.getAttribute("id");
    if (id) {
      ids.add(id);
    }
  }
  return ids;
}

function rewriteReferences(value: string, idMap: Map<string, string>): string {
  let next = value.replace(URL_REF, (match, id: string) => {
    const renamed = idMap.get(id);
    return renamed ? `url(#${renamed})` : match;
  });
  if (next.startsWith("#")) {
    const renamed = idMap.get(next.slice(1));
    if (renamed) {
      next = `#${renamed}`;
    }
  }
  return next;
}

/**
 * Размечает SVG для скринридеров и изолирует его внутренние id.
 * Идемпотентна: повторный вызов на уже размеченном SVG ничего не меняет.
 */
export function applySvgAccessibility(
  svg: string,
  options: SvgA11yOptions = {},
): { svg: string; report: SvgA11yReport } {
  const skipped: SvgA11yReport = {
    applied: false,
    titleId: "",
    descriptionId: "",
    renamedIds: 0,
  };

  if (!svg.trim() || typeof DOMParser === "undefined") {
    return { svg, report: skipped };
  }

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    return { svg, report: skipped };
  }

  const root = doc.documentElement;
  if (!root || root.localName !== "svg") {
    return { svg, report: skipped };
  }

  const existingIds = collectIds(root);
  const labelledBy = asText(root.getAttribute("aria-labelledby"));
  if (root.getAttribute("role") === "img" && labelledBy) {
    const targets = labelledBy.split(/\s+/).filter(Boolean);
    if (targets.length > 0 && targets.every((id) => existingIds.has(id))) {
      return {
        svg,
        report: {
          applied: false,
          titleId: targets[0] ?? "",
          descriptionId: targets[1] ?? "",
          renamedIds: 0,
        },
      };
    }
  }

  const title = asText(options.title) || asText(options.fallbackTitle) || "Диаграмма";
  const description = asText(options.description);
  const prefix = asText(options.idPrefix) || `c2g-${hashContent(svg)}`;

  const idMap = new Map<string, string>();
  const used = new Set<string>([`${prefix}-title`, `${prefix}-desc`]);

  for (const element of Array.from(root.querySelectorAll("[id]"))) {
    const oldId = element.getAttribute("id");
    if (!oldId) {
      continue;
    }
    const base = `${prefix}-${sanitizeIdSegment(oldId)}`;
    let nextId = base;
    let suffix = 2;
    while (used.has(nextId)) {
      nextId = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(nextId);
    idMap.set(oldId, nextId);
    element.setAttribute("id", nextId);
  }

  const elements: Element[] = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const element of elements) {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name === "id") {
        continue;
      }
      const next = rewriteReferences(attribute.value, idMap);
      if (next !== attribute.value) {
        element.setAttribute(attribute.name, next);
      }
    }
  }

  // Ссылки внутри <style> (`#node { … }`, `url(#grad)`) — тот же префикс.
  for (const style of Array.from(root.querySelectorAll("style"))) {
    const text = style.textContent ?? "";
    let next = text.replace(URL_REF, (match, id: string) => {
      const renamed = idMap.get(id);
      return renamed ? `url(#${renamed})` : match;
    });
    for (const [oldId, nextId] of idMap) {
      next = next.split(`#${oldId}`).join(`#${nextId}`);
    }
    if (next !== text) {
      style.textContent = next;
    }
  }

  const ensureChild = (tag: "title" | "desc", desiredId: string, text: string): string => {
    const existing = Array.from(root.children).find((child) => child.localName === tag);
    if (existing) {
      const id = existing.getAttribute("id") ?? "";
      if (id) {
        return id;
      }
      existing.setAttribute("id", desiredId);
      if (!asText(existing.textContent)) {
        existing.textContent = text;
      }
      return desiredId;
    }

    const created = doc.createElementNS(SVG_NS, tag);
    created.setAttribute("id", desiredId);
    created.textContent = text;
    root.insertBefore(created, root.firstChild);
    return desiredId;
  };

  const titleId = ensureChild("title", `${prefix}-title`, title);
  let descriptionId = "";
  if (description) {
    // <desc> ставим сразу за <title>, чтобы порядок чтения был предсказуем.
    const titleNode = Array.from(root.children).find((child) => child.localName === "title");
    const descId = ensureChild("desc", `${prefix}-desc`, description);
    if (titleNode) {
      const descNode = Array.from(root.children).find((child) => child.localName === "desc");
      if (descNode && descNode.previousSibling !== titleNode) {
        root.insertBefore(descNode, titleNode.nextSibling);
      }
    }
    descriptionId = descId;
  }

  root.setAttribute("role", "img");
  root.setAttribute(
    "aria-labelledby",
    descriptionId ? `${titleId} ${descriptionId}` : titleId,
  );

  return {
    svg: new XMLSerializer().serializeToString(root),
    report: {
      applied: true,
      titleId,
      descriptionId,
      renamedIds: idMap.size,
    },
  };
}
