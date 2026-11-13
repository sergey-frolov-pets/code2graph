import { clamp, esc, fmt, type SvgBuilder } from "../common";

/** Сторона блока фото по умолчанию, когда аватар включён. */
export const AVATAR_DEFAULT_PX = 48;
export const AVATAR_MIN_PX = 24;
export const AVATAR_MAX_PX = 128;

/** m — мужской, f — женский, ? — пол неизвестен. */
export type AvatarGender = "m" | "f" | "?";

export interface NodeAvatar {
  photo?: string;
  /** Нет значения — рисуется силуэт со знаком вопроса. */
  gender?: AvatarGender;
  /** `avatar=off` на узле. */
  hidden?: boolean;
}

const DATA_IMAGE_RE =
  /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+/]+=*$/i;
const HTTP_IMAGE_RE = /^https?:\/\/[^\s"'<>]+$/i;

/** http(s) или data:image png/jpeg/gif/webp. Иначе null. */
export function sanitizePhotoHref(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^javascript:/i.test(value) || /^data:(?!image\/)/i.test(value)) return null;
  if (DATA_IMAGE_RE.test(value.replace(/\s+/g, ""))) return value.replace(/\s+/g, "");
  if (HTTP_IMAGE_RE.test(value)) return value;
  return null;
}

export function parseGender(raw: string): AvatarGender | null {
  switch (raw.trim().toLowerCase()) {
    case "m":
    case "male":
    case "man":
    case "м":
      return "m";
    case "f":
    case "female":
    case "woman":
    case "ж":
      return "f";
    case "?":
    case "u":
    case "unknown":
    case "none":
    case "н":
      return "?";
    default:
      return null;
  }
}

/**
 * `avatar 48`, `avatar off`, `avatar on`.
 * null — строка не про аватар.
 */
export function parseAvatarDirective(
  raw: string,
): { enabled: boolean; size: number } | { error: string } | null {
  const line = raw.trim();
  if (!/^avatar\b/i.test(line)) return null;
  const rest = line.replace(/^avatar\s*/i, "").trim();
  if (!rest || /^(on|default)$/i.test(rest)) {
    return { enabled: true, size: AVATAR_DEFAULT_PX };
  }
  if (/^(off|none|hide)$/i.test(rest)) return { enabled: false, size: 0 };
  const size = Number(rest.replace(/px$/i, "").replace(",", "."));
  if (!Number.isFinite(size) || size <= 0) {
    return { error: `размер фото: ожидается число или off, получено «${rest}»` };
  }
  return { enabled: true, size: clamp(size, AVATAR_MIN_PX, AVATAR_MAX_PX) };
}

/** Сторона блока у конкретного узла. 0 — блок скрыт. */
export function avatarBoxSize(framePx: number, node: NodeAvatar): number {
  if (!(framePx > 0) || node.hidden) return 0;
  return framePx;
}

function scaleGroup(
  svg: SvgBuilder,
  x: number,
  y: number,
  size: number,
  draw: () => void,
): void {
  svg.group(
    { transform: `translate(${fmt(x)} ${fmt(y)}) scale(${fmt(size / 64)})` },
    draw,
  );
}

function drawMale(svg: SvgBuilder): void {
  svg.circle(32, 16, 10, { fill: "#c9d1d9", stroke: "#8b949e", "stroke-width": 1.5 });
  svg.path("M14 62 L20 34 Q32 26 44 34 L50 62 Z", { fill: "#8b949e" });
}

function drawFemale(svg: SvgBuilder): void {
  svg.path("M16 20 Q32 0 48 20 Q44 10 32 10 Q20 10 16 20 Z", { fill: "#6e7781" });
  svg.circle(32, 18, 9, { fill: "#c9d1d9", stroke: "#8b949e", "stroke-width": 1.5 });
  svg.path("M18 62 L24 36 Q32 30 40 36 L46 62 Q32 54 18 62 Z", { fill: "#8b949e" });
}

function drawUnknown(svg: SvgBuilder): void {
  svg.circle(30, 18, 10, { fill: "#c9d1d9", stroke: "#8b949e", "stroke-width": 1.5 });
  svg.path("M14 62 L20 36 Q30 28 40 36 L46 62 Z", { fill: "#8b949e" });
  svg.circle(50, 14, 10, { fill: "#ffffff", stroke: "#656d76", "stroke-width": 1.4 });
  svg.text(50, 18, "?", {
    "font-size": 14,
    "font-weight": 700,
    fill: "#1f2328",
  });
}

/** Квадрат фото, силуэт или снимок. Снимок заменяет силуэт. */
export function renderAvatarBox(
  svg: SvgBuilder,
  x: number,
  y: number,
  size: number,
  node: NodeAvatar,
  clipId: string,
): void {
  svg.rect(x, y, size, size, {
    fill: "#f6f8fa",
    stroke: "#d0d7de",
    "stroke-width": 1,
    rx: 4,
  });
  if (node.photo) {
    svg.raw(
      `<defs><clipPath id="${esc(clipId)}"><rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(size)}" height="${fmt(size)}" rx="4"/></clipPath></defs>`,
    );
    svg.raw(
      `<image href="${esc(node.photo)}" x="${fmt(x)}" y="${fmt(y)}" width="${fmt(size)}" height="${fmt(size)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${esc(clipId)})"/>`,
    );
    return;
  }
  const gender = node.gender ?? "?";
  scaleGroup(svg, x, y, size, () => {
    if (gender === "m") drawMale(svg);
    else if (gender === "f") drawFemale(svg);
    else drawUnknown(svg);
  });
}
