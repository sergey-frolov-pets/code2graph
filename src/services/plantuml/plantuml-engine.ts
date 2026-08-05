import type { PlantUmlRenderOptions } from "@/types/plantuml";
import { enqueueRender } from "@/services/plantuml/render-queue";
import { loadEngine } from "@/services/plantuml/vendor-loader";

export async function renderPlantUmlToSvg(
  lines: string[],
  options: PlantUmlRenderOptions = {},
): Promise<string> {
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
