import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { renderPlantUmlOnlineToSvg } from "@/services/plantuml/plantuml-online";
import { enqueueRender } from "@/services/plantuml/render-queue";
import { loadEngine } from "@/services/plantuml/vendor-loader";
import type { PlantUmlRenderOptions } from "@/types/plantuml";

export async function renderPlantUmlToSvg(
  lines: string[],
  options: PlantUmlRenderOptions = {},
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<string> {
  if (isOnlineRenderMode(renderMode)) {
    return renderPlantUmlOnlineToSvg(lines, options);
  }

  const engine = await loadEngine();

  return enqueueRender(
    () =>
      new Promise<string>((resolve, reject) => {
        engine.renderToString(
          lines,
          (svg) => resolve(svg),
          (message) => reject(new Error(message)),
          options,
        );
      }),
  );
}

export function isVizGlobalReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.Viz);
}

export function isPlantUmlEngineReady(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.PlantUML?.renderToString)
  );
}

export function isEngineReady(): boolean {
  return isVizGlobalReady() && isPlantUmlEngineReady();
}

export async function waitForEngineReady(): Promise<void> {
  await loadEngine();
}
