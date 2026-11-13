import { parseHistogram } from "./histogram/parser";
import { renderHistogram } from "./histogram/renderer";
import type { HistogramModel } from "./histogram/types";
import type { ExtEngine } from "../types";

export type { HistogramModel } from "./histogram/types";
export { parseHistogram } from "./histogram/parser";

export const histogramEngine: ExtEngine<HistogramModel> = {
  type: "histogram",
  aliases: ["histogram", "hist", "dist"],
  parse: parseHistogram,
  render: renderHistogram,
};
