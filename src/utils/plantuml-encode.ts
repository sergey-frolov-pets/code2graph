function encode6bit(byte: number): string {
  if (byte < 10) {
    return String.fromCharCode(48 + byte);
  }

  let value = byte - 10;
  if (value < 26) {
    return String.fromCharCode(65 + value);
  }

  value -= 26;
  if (value < 26) {
    return String.fromCharCode(97 + value);
  }

  value -= 26;
  if (value === 0) {
    return "-";
  }

  if (value === 1) {
    return "_";
  }

  return "?";
}

function append3bytes(byte1: number, byte2: number, byte3: number): string {
  const chunk1 = byte1 >> 2;
  const chunk2 = ((byte1 & 0x3) << 4) | (byte2 >> 4);
  const chunk3 = ((byte2 & 0xf) << 2) | (byte3 >> 6);
  const chunk4 = byte3 & 0x3f;

  return (
    encode6bit(chunk1 & 0x3f) +
    encode6bit(chunk2 & 0x3f) +
    encode6bit(chunk3 & 0x3f) +
    encode6bit(chunk4 & 0x3f)
  );
}

export function encodePlantUmlPayload(deflated: Uint8Array): string {
  let encoded = "";

  for (let index = 0; index < deflated.length; index += 3) {
    const byte1 = deflated[index] ?? 0;
    const byte2 = deflated[index + 1] ?? 0;
    const byte3 = deflated[index + 2] ?? 0;

    if (index + 2 === deflated.length) {
      encoded += append3bytes(byte1, byte2, 0);
    } else if (index + 1 === deflated.length) {
      encoded += append3bytes(byte1, 0, 0);
    } else {
      encoded += append3bytes(byte1, byte2, byte3);
    }
  }

  return encoded;
}

async function deflateUtf8(text: string): Promise<Uint8Array> {
  const input = new TextEncoder().encode(text);

  if (typeof CompressionStream !== "undefined") {
    const compressedStream = new Response(
      new Blob([input]).stream().pipeThrough(new CompressionStream("deflate")),
    );
    const buffer = await compressedStream.arrayBuffer();
    return new Uint8Array(buffer);
  }

  const { deflateSync } = await import("node:zlib");
  return deflateSync(input);
}

export async function encodePlantUmlSource(text: string): Promise<string> {
  const deflated = await deflateUtf8(text);
  return encodePlantUmlPayload(deflated);
}
