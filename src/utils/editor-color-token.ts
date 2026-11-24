const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;

export interface HexColorToken {
  start: number;
  end: number;
  value: string;
}

/** Hex-цвет в тексте, если каретка стоит на нём или сразу после него. */
export function findHexColorAt(
  text: string,
  offset: number,
): HexColorToken | null {
  HEX_COLOR.lastIndex = 0;
  let match = HEX_COLOR.exec(text);
  while (match) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return { start, end, value: match[0] };
    }
    if (start > offset) {
      return null;
    }
    match = HEX_COLOR.exec(text);
  }
  return null;
}

/** Значение для `<input type="color">`: всегда `#rrggbb`. */
export function hexToColorInput(value: string): string {
  const body = value.slice(1);
  if (body.length === 3 || body.length === 4) {
    const [red, green, blue] = body;
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase();
  }
  return `#${body.slice(0, 6)}`.toLowerCase();
}

export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
    value.trim(),
  );
}
