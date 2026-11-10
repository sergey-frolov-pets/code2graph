export const PRESENTATION_TRANSPARENT_COLOR = "transparent";

export const OVERLAY_OPACITY_MIN = 0;

export const OVERLAY_OPACITY_MAX = 1;

export const OVERLAY_OPACITY_STEP = 0.05;

const HEX_BYTE = 255;

const HEX_SHORT = /^#(?:[0-9a-fA-F]{3})$/;

const HEX_OPAQUE = /^#(?:[0-9a-fA-F]{6})$/;

const HEX_ALPHA = /^#(?:[0-9a-fA-F]{8})$/;

function expandHex(value: string): string {
  if (HEX_SHORT.test(value)) {
    const [red, green, blue] = value.slice(1).split("");
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }
  return value.slice(0, 7).toLowerCase();
}

function clampOpacity(value: number): number {
  return Math.min(OVERLAY_OPACITY_MAX, Math.max(OVERLAY_OPACITY_MIN, value));
}

/** Empty keeps the theme. Transparent and #rgb/#rrggbb/#rrggbbaa are custom paint. */
export function readOverlayPaint(value: unknown): string {
  if (value === PRESENTATION_TRANSPARENT_COLOR) {
    return PRESENTATION_TRANSPARENT_COLOR;
  }
  if (typeof value !== "string") {
    return "";
  }
  if (HEX_SHORT.test(value) || HEX_OPAQUE.test(value)) {
    return expandHex(value);
  }
  if (HEX_ALPHA.test(value)) {
    return value.toLowerCase();
  }
  return "";
}

export function overlayColorOpacity(value: string): number {
  if (value === PRESENTATION_TRANSPARENT_COLOR) {
    return OVERLAY_OPACITY_MIN;
  }
  if (HEX_ALPHA.test(value)) {
    return Number.parseInt(value.slice(7, 9), 16) / HEX_BYTE;
  }
  return OVERLAY_OPACITY_MAX;
}

export function overlayColorOpaqueHex(value: string, fallback: string): string {
  if (HEX_SHORT.test(value) || HEX_OPAQUE.test(value) || HEX_ALPHA.test(value)) {
    return expandHex(value);
  }
  return fallback;
}

export function overlayColorWithOpacity(hex: string, opacity: number): string {
  const clamped = clampOpacity(opacity);
  if (clamped <= OVERLAY_OPACITY_MIN) {
    return PRESENTATION_TRANSPARENT_COLOR;
  }
  const opaque = expandHex(hex);
  if (clamped >= OVERLAY_OPACITY_MAX) {
    return opaque;
  }
  const alpha = Math.round(clamped * HEX_BYTE).toString(16).padStart(2, "0");
  return `${opaque}${alpha}`;
}

/** CSS color for an overlay paint, or the theme fallback when the paint is empty. */
export function overlayCssColor(value: string, fallback: string): string {
  if (!value) {
    return fallback;
  }
  if (value === PRESENTATION_TRANSPARENT_COLOR) {
    return PRESENTATION_TRANSPARENT_COLOR;
  }
  return value;
}
