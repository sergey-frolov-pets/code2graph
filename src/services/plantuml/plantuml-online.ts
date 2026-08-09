import {
  PLANTUML_ONLINE_ENCODE_PREFIX,
  PLANTUML_ONLINE_MAX_URL_LENGTH,
  PLANTUML_ONLINE_PROBE_ENCODED,
  PLANTUML_ONLINE_PROBE_TIMEOUT_MS,
  PLANTUML_ONLINE_SERVER_URL,
} from "@/constants/render-settings";
import type { PlantUmlRenderOptions } from "@/types/plantuml";
import { isFileProtocol } from "@/pwa/installPromptState";
import { createFetchTimeoutSignal } from "@/utils/fetch-timeout";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { applyDarkModeSkinparams } from "@/utils/plantuml-dark-mode";
import { encodePlantUmlSource } from "@/utils/plantuml-encode";
import {
  isPlantUmlErrorSvg,
  parsePlantUmlErrorFromSvg,
} from "@/utils/plantuml-syntax";

let plantUmlServerReachable: boolean | null = null;
let plantUmlProbePromise: Promise<boolean> | null = null;

function buildOnlineSvgUrl(encodedSource: string): string {
  return `${PLANTUML_ONLINE_SERVER_URL}/svg/${PLANTUML_ONLINE_ENCODE_PREFIX}${encodedSource}`;
}

function buildPlantUmlProbeUrl(): string {
  return buildOnlineSvgUrl(PLANTUML_ONLINE_PROBE_ENCODED);
}

export function resetPlantUmlServerConnectivity(): void {
  plantUmlServerReachable = null;
  plantUmlProbePromise = null;
}

export function getPlantUmlServerReachable(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  if (isFileProtocol()) {
    return false;
  }

  if (plantUmlServerReachable !== null) {
    return plantUmlServerReachable;
  }

  return navigator.onLine;
}

export async function probePlantUmlServerConnectivity(): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  if (isFileProtocol()) {
    plantUmlServerReachable = false;
    return false;
  }

  if (!navigator.onLine) {
    plantUmlServerReachable = false;
    return false;
  }

  if (plantUmlProbePromise) {
    return plantUmlProbePromise;
  }

  plantUmlProbePromise = (async () => {
    try {
      const response = await fetch(buildPlantUmlProbeUrl(), {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: createFetchTimeoutSignal(PLANTUML_ONLINE_PROBE_TIMEOUT_MS),
      });
      const body = await response.text();
      plantUmlServerReachable =
        response.ok && body.trim().startsWith("<") && !isPlantUmlErrorSvg(body);
    } catch {
      plantUmlServerReachable = false;
    }

    plantUmlProbePromise = null;
    return plantUmlServerReachable;
  })();

  return plantUmlProbePromise;
}

export async function renderPlantUmlOnlineToSvg(
  lines: string[],
  options: PlantUmlRenderOptions = {},
): Promise<string> {
  if (isFileProtocol()) {
    throw new LocalizedAppError("engine.plantumlOnlineFileProtocol");
  }

  let source = lines.join("\n");

  if (options.dark) {
    source = applyDarkModeSkinparams(source);
  }

  const encoded = await encodePlantUmlSource(source);
  const url = buildOnlineSvgUrl(encoded);

  if (url.length > PLANTUML_ONLINE_MAX_URL_LENGTH) {
    throw new LocalizedAppError("engine.plantumlOnlineUrlTooLong");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: createFetchTimeoutSignal(PLANTUML_ONLINE_PROBE_TIMEOUT_MS),
    });
  } catch {
    throw new LocalizedAppError("engine.plantumlOnlineNetworkError");
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

  plantUmlServerReachable = true;
  return svg;
}
