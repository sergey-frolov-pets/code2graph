import {
  MERMAID_ONLINE_SERVER_URL,
  MERMAID_ONLINE_SVG_PATH,
} from "@/constants/render-settings";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { prepareMermaidSource } from "@/utils/mermaid-source";
import { encodeMermaidStateForInk } from "@/utils/mermaid-encode";

function buildOnlineSvgUrl(encodedState: string, dark: boolean): string {
  const url = new URL(
    `${MERMAID_ONLINE_SERVER_URL}${MERMAID_ONLINE_SVG_PATH}/${encodedState}`,
  );

  if (dark) {
    url.searchParams.set("theme", "dark");
    url.searchParams.set("bgColor", "1b1b1f");
  }

  return url.toString();
}

export async function renderMermaidOnlineToSvg(
  source: string,
  options: { dark?: boolean } = {},
): Promise<string> {
  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    throw new LocalizedAppError("mermaid.emptySource");
  }

  const encoded = await encodeMermaidStateForInk(prepared, options);
  const url = buildOnlineSvgUrl(encoded, Boolean(options.dark));

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new LocalizedAppError("engine.mermaidOnlineNetworkError");
  }

  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 300);
    throw new LocalizedAppError("engine.mermaidOnlineRenderFailed", {
      status: response.status,
      detail: detail || response.statusText,
    });
  }

  const svg = await response.text();
  if (!svg.trim().startsWith("<")) {
    throw new LocalizedAppError("engine.mermaidOnlineRenderInvalid");
  }

  return svg;
}
