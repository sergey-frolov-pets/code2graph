import { inflate } from "pako";

const PDF_STREAM_KEYWORD = "stream";
const PDF_ENDSTREAM_KEYWORD = "endstream";
const PDF_FLATE_FILTER = "FlateDecode";
const PDF_STREAM_LOOKBACK_CHARS = 400;
const PDF_LATIN1_CHUNK = 0x8000;
const PDF_UTF16_BE_BOM_FIRST = 0xfe;
const PDF_UTF16_BE_BOM_SECOND = 0xff;
const PDF_HEX_PAIR = 2;

const PDF_LITERAL_TJ = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
const PDF_LITERAL_QUOTE = /\(((?:\\.|[^\\)])*)\)\s*'/g;
const PDF_HEX_TJ = /<([0-9A-Fa-f\s]+)>\s*Tj/g;
const PDF_TJ_ARRAY = /\[([\s\S]*?)\]\s*TJ/g;
const PDF_ARRAY_LITERAL = /\(((?:\\.|[^\\)])*)\)/g;
const PDF_ARRAY_HEX = /<([0-9A-Fa-f\s]+)>/g;

function latin1(bytes: Uint8Array): string {
  let text = "";
  for (let offset = 0; offset < bytes.length; offset += PDF_LATIN1_CHUNK) {
    text += String.fromCharCode(...bytes.subarray(offset, offset + PDF_LATIN1_CHUNK));
  }
  return text;
}

function decodePdfLiteral(value: string): string {
  return value.replace(/\\([0-7]{1,3}|.)/g, (_match, token: string) => {
    if (/^[0-7]+$/.test(token)) {
      return String.fromCharCode(Number.parseInt(token, 8));
    }
    switch (token) {
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "b":
        return "\b";
      case "f":
        return "\f";
      default:
        return token;
    }
  });
}

function decodePdfHex(hex: string): string {
  const cleaned = hex.replace(/\s+/g, "");
  if (!cleaned) {
    return "";
  }
  const padded = cleaned.length % PDF_HEX_PAIR === 1 ? `${cleaned}0` : cleaned;
  const bytes = new Uint8Array(padded.length / PDF_HEX_PAIR);
  for (let index = 0; index < bytes.length; index += 1) {
    const start = index * PDF_HEX_PAIR;
    bytes[index] = Number.parseInt(padded.slice(start, start + PDF_HEX_PAIR), 16);
  }
  if (
    bytes.length >= PDF_HEX_PAIR &&
    bytes[0] === PDF_UTF16_BE_BOM_FIRST &&
    bytes[1] === PDF_UTF16_BE_BOM_SECOND
  ) {
    let text = "";
    for (let index = PDF_HEX_PAIR; index + 1 < bytes.length; index += PDF_HEX_PAIR) {
      text += String.fromCharCode((bytes[index] << 8) | bytes[index + 1]);
    }
    return text;
  }
  return latin1(bytes);
}

function collectTextOperators(source: string, chunks: string[]): void {
  for (const match of source.matchAll(PDF_LITERAL_TJ)) {
    chunks.push(decodePdfLiteral(match[1] ?? ""));
  }
  for (const match of source.matchAll(PDF_LITERAL_QUOTE)) {
    chunks.push(decodePdfLiteral(match[1] ?? ""));
  }
  for (const match of source.matchAll(PDF_HEX_TJ)) {
    chunks.push(decodePdfHex(match[1] ?? ""));
  }
  for (const match of source.matchAll(PDF_TJ_ARRAY)) {
    const arrayBody = match[1] ?? "";
    for (const literal of arrayBody.matchAll(PDF_ARRAY_LITERAL)) {
      chunks.push(decodePdfLiteral(literal[1] ?? ""));
    }
    for (const hex of arrayBody.matchAll(PDF_ARRAY_HEX)) {
      chunks.push(decodePdfHex(hex[1] ?? ""));
    }
  }
}

function inflatePdfStreams(bytes: Uint8Array): Uint8Array[] {
  const text = latin1(bytes);
  const streams: Uint8Array[] = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const streamAt = text.indexOf(PDF_STREAM_KEYWORD, searchFrom);
    if (streamAt < 0) {
      break;
    }
    const previous = streamAt > 0 ? text[streamAt - 1] : "";
    if (previous && /[A-Za-z]/.test(previous)) {
      searchFrom = streamAt + PDF_STREAM_KEYWORD.length;
      continue;
    }

    const lookback = text.slice(Math.max(0, streamAt - PDF_STREAM_LOOKBACK_CHARS), streamAt);
    if (!lookback.includes(PDF_FLATE_FILTER)) {
      searchFrom = streamAt + PDF_STREAM_KEYWORD.length;
      continue;
    }

    let dataStart = streamAt + PDF_STREAM_KEYWORD.length;
    if (text[dataStart] === "\r") {
      dataStart += 1;
    }
    if (text[dataStart] === "\n") {
      dataStart += 1;
    }

    const end = text.indexOf(PDF_ENDSTREAM_KEYWORD, dataStart);
    if (end < 0) {
      break;
    }
    let dataEnd = end;
    if (text[dataEnd - 1] === "\n") {
      dataEnd -= 1;
    }
    if (text[dataEnd - 1] === "\r") {
      dataEnd -= 1;
    }

    try {
      streams.push(inflate(bytes.subarray(dataStart, dataEnd)));
    } catch {
      // Битый поток пропускаем: остальной текст PDF всё ещё может быть полезен.
    }
    searchFrom = end + PDF_ENDSTREAM_KEYWORD.length;
  }

  return streams;
}

/** Достаёт текстовые операторы PDF. Картинки и шрифты не читает. */
export function extractPdfText(bytes: Uint8Array): string {
  const chunks: string[] = [];
  const raw = latin1(bytes);
  collectTextOperators(raw, chunks);
  for (const inflated of inflatePdfStreams(bytes)) {
    collectTextOperators(latin1(inflated), chunks);
  }
  return chunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
