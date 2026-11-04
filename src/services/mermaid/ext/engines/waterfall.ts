import type { ExtEngine } from "../types";
import { parseWaterfall } from "./waterfall/parser";
import { renderWaterfall } from "./waterfall/renderer";
import type { WaterfallModel } from "./waterfall/types";

export * from "./waterfall/types";
export { parseWaterfall, renderWaterfall };

export const waterfallEngine: ExtEngine<WaterfallModel> = {
  type: "waterfall",
  aliases: ["waterfall", "waterfall-variance", "waterfall-multi", "waterfall-scenario"],
  parse: parseWaterfall,
  render: renderWaterfall,
};
