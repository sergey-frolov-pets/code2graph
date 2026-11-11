import {
  isDiagramFormat,
  type DiagramFormat,
} from "@/constants/diagram-format-ids";
import {
  readSessionItem,
  removeSessionItem,
  writeSessionItem,
} from "@/core/safe-storage";

export interface LandingSample {
  format: DiagramFormat;
  source: string;
  label: string;
}

export const LANDING_SAMPLE_STORAGE_KEY = "code2graph.landingSample";

export function writeLandingSample(sample: LandingSample): boolean {
  return writeSessionItem(LANDING_SAMPLE_STORAGE_KEY, JSON.stringify(sample));
}

/** One-shot handoff: the editor consumes the sample exactly once. */
export function consumeLandingSample(): LandingSample | null {
  const raw = readSessionItem(LANDING_SAMPLE_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  removeSessionItem(LANDING_SAMPLE_STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as Partial<LandingSample>;
    if (
      typeof parsed.source !== "string" ||
      !parsed.source.trim() ||
      typeof parsed.label !== "string" ||
      typeof parsed.format !== "string" ||
      !isDiagramFormat(parsed.format)
    ) {
      return null;
    }
    return {
      format: parsed.format,
      source: parsed.source,
      label: parsed.label.trim() || parsed.format,
    };
  } catch {
    return null;
  }
}
