import type { AppLocale } from "@/constants/i18n";
import { conversionMessages as enMessages } from "@/locales/en/conversion";
import { conversionMessages as ruMessages } from "@/locales/ru/conversion";
import {
  convertDiagram,
  type ConversionMode,
} from "@/services/conversion/pipeline/convert-diagram";
import type {
  ConversionQualityLevel,
} from "@/services/conversion/conversion-report";
import type { DiagramKind } from "@/services/conversion/diagram-ir";

/** Text formats accepted by the MCP tool. Binary/structural formats stay in the editor. */
export const CONVERT_FORMATS = ["plantuml", "mermaid", "d2"] as const;

export type ConvertFormat = (typeof CONVERT_FORMATS)[number];

export const CONVERT_MODES = ["source", "auto"] as const;
export type ConvertMode = (typeof CONVERT_MODES)[number];

export type ConvertToolLocale = "ru" | "en";

export interface ConvertToolInput {
  source: string;
  from: string;
  to: string;
  mode?: ConvertMode;
  locale?: ConvertToolLocale;
}

export interface ConvertLoss {
  id: string;
  label: string;
}

export interface ConvertToolResult {
  ok: boolean;
  blocked: boolean;
  from: string;
  to: string;
  level?: ConversionQualityLevel;
  kind?: DiagramKind;
  targetKind?: DiagramKind;
  mode?: ConversionMode;
  text?: string;
  losses: ConvertLoss[];
  warnings: string[];
  error?: string;
}

const MESSAGES: Record<ConvertToolLocale, Record<string, string>> = {
  ru: ruMessages as unknown as Record<string, string>,
  en: enMessages as unknown as Record<string, string>,
};

export function isConvertFormat(value: string): value is ConvertFormat {
  return (CONVERT_FORMATS as readonly string[]).includes(value);
}

export function lossLabel(id: string, locale: ConvertToolLocale): string {
  const key = `conversion.loss.${id}`;
  return MESSAGES[locale][key] ?? id;
}

function failure(from: string, to: string, error: string): ConvertToolResult {
  return { ok: false, blocked: false, from, to, losses: [], warnings: [], error };
}

/** Convert a text diagram in-process, without a browser or the editor UI. */
export async function convertTool(input: ConvertToolInput): Promise<ConvertToolResult> {
  const { source, from, to } = input;
  const locale: ConvertToolLocale = input.locale === "en" ? "en" : "ru";

  if (!isConvertFormat(from)) {
    return failure(from, to, `Unsupported source format "${from}". Supported: ${CONVERT_FORMATS.join(", ")}.`);
  }
  if (!isConvertFormat(to)) {
    return failure(from, to, `Unsupported target format "${to}". Supported: ${CONVERT_FORMATS.join(", ")}.`);
  }
  if (from === to) {
    return failure(from, to, `Source and target formats are both "${from}".`);
  }
  if (!source.trim()) {
    return failure(from, to, "Source is empty.");
  }

  const mode: ConversionMode = input.mode === "auto" ? "auto" : "source";

  try {
    const result = await convertDiagram({
      source,
      sourceFormat: from,
      targetFormat: to,
      mode,
      locale: locale as AppLocale,
    });

    const report = result.report;
    return {
      ok: result.ok,
      blocked: result.blocked,
      from,
      to,
      level: report.level,
      kind: report.kind,
      targetKind: report.targetKind,
      mode: report.mode as ConversionMode,
      text: result.targetSource,
      losses: report.lossIds.map((id) => ({ id, label: lossLabel(id, locale) })),
      warnings: report.warnings,
      error: result.ok ? undefined : "Conversion was blocked or produced no source.",
    };
  } catch (error) {
    return failure(from, to, error instanceof Error ? error.message : String(error));
  }
}
