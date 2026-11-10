import type { RenderMode } from "@/constants/render-settings";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { waitForMermaidReady } from "@/services/mermaid/mermaid-engine";
import { prepareMermaidSankeyUnicode } from "@/services/mermaid/sankey-unicode";
import {
  checkMermaidSyntax,
  parseMermaidErrorLine,
  parseMermaidErrorMessage,
} from "@/utils/mermaid-syntax";
import { prepareMermaidSource } from "@/utils/mermaid-source";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

async function ensureMermaidParserInitialized(dark: boolean): Promise<void> {
  const mermaid = await loadMermaid();
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
  });
}

export async function validateMermaidSyntax(
  source: string,
  darkMode = false,
  _renderMode?: RenderMode,
): Promise<SyntaxCheckResult> {
  const staticCheck = checkMermaidSyntax(source);
  if (!staticCheck.valid) {
    return staticCheck;
  }

  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    return {
      valid: false,
      issues: [{ severity: "error", messageKey: "syntax.issue.empty" }],
    };
  }

  // Расширение Mermaid: свои типы проверяем своим парсером, mermaid.parse не зовём.
  // В проде __MERMAID_EXT__ = false → блок вырезается на этапе сборки.
  if (__MERMAID_EXT__) {
    const { validateExtensionSource } = await import("@/services/mermaid/ext");
    const extResult = validateExtensionSource(source);
    if (extResult) return extResult;
  }

  try {
    await waitForMermaidReady(darkMode);
    await ensureMermaidParserInitialized(darkMode);
    const mermaid = await loadMermaid();
    // Лексер sankey принимает в имени узла только ASCII. Отрисовка
    // подменяет такие подписи перед разбором — проверка делает то же,
    // иначе кириллический пример помечается ошибкой, хотя схема рисуется.
    const parseSource = prepareMermaidSankeyUnicode(prepared).source;
    await mermaid.parse(parseSource);
    return { valid: true, issues: [] };
  } catch (error) {
    const message = parseMermaidErrorMessage(error);
    const line = parseMermaidErrorLine(error);

    return {
      valid: false,
      issues: [
        {
          severity: "error",
          message,
          messageKey: message ? undefined : "syntax.issue.mermaid.engineError",
          line,
        },
      ],
    };
  }
}
