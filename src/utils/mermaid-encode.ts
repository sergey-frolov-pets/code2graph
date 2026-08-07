export interface MermaidLiveState {
  code: string;
  mermaid: string;
  updateEditor: boolean;
  autoSync: boolean;
  updateDiagram: boolean;
}

export function buildMermaidLiveState(
  source: string,
  options: { dark?: boolean } = {},
): MermaidLiveState {
  const theme = options.dark ? "dark" : "default";

  return {
    code: source,
    mermaid: JSON.stringify({ theme }),
    updateEditor: false,
    autoSync: true,
    updateDiagram: true,
  };
}

async function deflateToBase64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const stream = new Blob([data])
    .stream()
    .pipeThrough(new CompressionStream("deflate"));
  const buffer = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_");
}

export async function encodeMermaidStateForInk(
  source: string,
  options: { dark?: boolean } = {},
): Promise<string> {
  const state = buildMermaidLiveState(source, options);
  const serialized = await deflateToBase64Url(JSON.stringify(state));
  return `pako:${serialized}`;
}
