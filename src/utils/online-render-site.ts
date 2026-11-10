import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { onlineRenderSiteLabel } from "@/constants/render-settings";
import { getLanguageModule } from "@/languages/registry";
import { stripPresentationBlock } from "@/services/presentation/codec";
import { isMermaidExtDeclaration } from "@/utils/mermaid-syntax";

/**
 * Сайт, на который уйдёт исходник при разовой онлайн-генерации.
 * Пусто, если формат рисуется только локально или сервер этот тип не принимает.
 */
export function onlineRenderSiteFor(
  format: DiagramFormat | undefined,
  source: string,
): string | null {
  if (!format) {
    return null;
  }

  const language = getLanguageModule(format);
  const probe = language.onlineProbe;
  if (!language.definition.supportsOnlineRender || !probe) {
    return null;
  }

  if (
    probe === "mermaid" &&
    isMermaidExtDeclaration(stripPresentationBlock(source))
  ) {
    return null;
  }

  return onlineRenderSiteLabel(probe);
}
