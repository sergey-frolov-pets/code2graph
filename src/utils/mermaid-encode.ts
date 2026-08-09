import { deflate } from "pako";

export interface MermaidLiveState {
  code: string;
  mermaid: string;
  updateDiagram: boolean;
  rough: boolean;
}

export function buildMermaidLiveState(
  source: string,
  options: { dark?: boolean } = {},
): MermaidLiveState {
  const theme = options.dark ? "dark" : "default";

  return {
    code: source,
    mermaid: JSON.stringify({ theme }),
    updateDiagram: true,
    rough: false,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
}

function deflateToBase64Url(input: string): string {
  const data = new TextEncoder().encode(input);
  const compressed = deflate(data, { level: 9 });
  return bytesToBase64Url(compressed);
}

export async function encodeMermaidStateForInk(
  source: string,
  options: { dark?: boolean } = {},
): Promise<string> {
  const state = buildMermaidLiveState(source, options);
  const serialized = deflateToBase64Url(JSON.stringify(state));
  return `pako:${serialized}`;
}
