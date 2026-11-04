import { LAYOUT_ENGINES } from "@/constants";
import { DEFAULT_RENDER_MODE } from "@/constants/render-settings";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { bootFormatEngine, renderDiagram } from "@/formats";
import type { FormatContext } from "@/formats/types";

const renderTailByFormat = new Map<string, Promise<void>>();

/**
 * Рисует пример со страницы языка тем же движком, что и редактор.
 * Очередь на формат не даёт движкам рендерить один и тот же тип параллельно.
 */
export function renderLanguageDiagramThumb(
  format: DiagramFormat,
  source: string,
  dark: boolean,
): Promise<string> {
  const context: FormatContext = {
    layout: LAYOUT_ENGINES.smetana,
    diagramDarkMode: dark,
    renderMode: DEFAULT_RENDER_MODE,
  };
  const key = `${format}:${dark ? "dark" : "light"}`;
  const previous = renderTailByFormat.get(key) ?? Promise.resolve();
  const render = previous.then(async () => {
    await bootFormatEngine(format, context);
    return renderDiagram(format, source, context);
  });
  renderTailByFormat.set(
    key,
    render.then(
      () => undefined,
      () => undefined,
    ),
  );
  return render;
}
