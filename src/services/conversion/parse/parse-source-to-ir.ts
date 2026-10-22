import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { parseSourceWithFramework } from "@/services/conversion/conversion-framework";

export class DiagramParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramParseError";
  }
}

export function parseSourceToIr(
  source: string,
  format: DiagramFormat,
): DiagramIR {
  return parseSourceWithFramework(source, format);
}

export function safeParseSourceToIr(
  source: string,
  format: DiagramFormat,
): { ir: DiagramIR | null; error: string | null } {
  try {
    return { ir: parseSourceToIr(source, format), error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "conversion.error.parseFailed";
    return { ir: null, error: message };
  }
}
