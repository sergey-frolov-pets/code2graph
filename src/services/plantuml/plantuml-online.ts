import {
  PLANTUML_ONLINE_ENCODE_PREFIX,
  PLANTUML_ONLINE_SERVER_URL,
} from "@/constants/render-settings";
import type { PlantUmlRenderOptions } from "@/types/plantuml";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { applyDarkModeSkinparams } from "@/utils/plantuml-dark-mode";
import { encodePlantUmlSource } from "@/utils/plantuml-encode";
import {
  isPlantUmlErrorSvg,
  parsePlantUmlErrorFromSvg,
} from "@/utils/plantuml-syntax";

function buildOnlineSvgUrl(encodedSource: string): string {
  return `${PLANTUML_ONLINE_SERVER_URL}/svg/${PLANTUML_ONLINE_ENCODE_PREFIX}${encodedSource}`;
}

export async function renderPlantUmlOnlineToSvg(
  lines: string[],
  options: PlantUmlRenderOptions = {},
): Promise<string> {
  let source = lines.join("\n");

  if (options.dark) {
    source = applyDarkModeSkinparams(source);
  }

  const encoded = await encodePlantUmlSource(source);
  const url = buildOnlineSvgUrl(encoded);

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new LocalizedAppError("engine.onlineNetworkError");
  }

  if (!response.ok) {
    throw new LocalizedAppError("engine.onlineRenderFailed", {
      status: response.status,
    });
  }

  const svg = await response.text();
  if (!svg.trim().startsWith("<")) {
    throw new LocalizedAppError("engine.onlineRenderInvalid");
  }

  if (isPlantUmlErrorSvg(svg)) {
    const issues = parsePlantUmlErrorFromSvg(svg);
    const message = issues[0]?.message ?? "PlantUML server returned an error";
    throw new Error(message);
  }

  return svg;
}
