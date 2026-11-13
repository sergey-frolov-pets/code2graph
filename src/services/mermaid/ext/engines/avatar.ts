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

/**
 * Силуэты — Material Design Icons (Pictogrammers), лицензия Apache-2.0.
 * https://pictogrammers.com/library/mdi/icon/human-male/
 * https://pictogrammers.com/library/mdi/icon/human-female/
 * https://pictogrammers.com/library/mdi/icon/account-question/
 */
const SILHOUETTE_VIEW = 24;
const SILHOUETTE_FILL = "#6e7781";
const SILHOUETTES: Record<AvatarGender, string> = {
  m: "M12 2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m-1.5 5h3a2 2 0 0 1 2 2v5.5H14V22h-4v-7.5H8.5V9a2 2 0 0 1 2-2",
  f: "M12 2a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2m-1.5 20v-6h-3l2.59-7.59C10.34 7.59 11.1 7 12 7s1.66.59 1.91 1.41L16.5 16h-3v6z",
  "?": "M13 8a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4a4 4 0 0 1 4 4m4 10v2H1v-2c0-2.21 3.58-4 8-4s8 1.79 8 4m3.5-3.5V16H19v-1.5zm-2-5H17V9a3 3 0 0 1 3-3a3 3 0 0 1 3 3c0 .97-.5 1.88-1.29 2.41l-.3.19c-.57.4-.91 1.01-.91 1.7v.2H19v-.2c0-1.19.6-2.3 1.59-2.95l.29-.19c.39-.26.62-.69.62-1.16A1.5 1.5 0 0 0 20 7.5A1.5 1.5 0 0 0 18.5 9z",
};

function drawSilhouette(
  svg: SvgBuilder,
  x: number,
  y: number,
  size: number,
  gender: AvatarGender,
): void {
  const pad = size * 0.14;
  const scale = (size - pad * 2) / SILHOUETTE_VIEW;
  svg.group(
    {
      "data-avatar": gender,
      transform: `translate(${fmt(x + pad)} ${fmt(y + pad)}) scale(${fmt(scale)})`,
    },
    () => {
      svg.path(SILHOUETTES[gender], { fill: SILHOUETTE_FILL });
    },
  );
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
  drawSilhouette(svg, x, y, size, node.gender ?? "?");
}
