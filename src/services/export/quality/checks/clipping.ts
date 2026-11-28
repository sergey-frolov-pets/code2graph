import { textBox, textElements } from "../geometry";
import type { CheckFindings, QualityCheck } from "../types";

/** Допуск: подпись, вылезшая за холст меньше чем на пиксель, не считается. */
const EDGE_SLACK = 1;

/** Текст за пределами viewBox: обрезается при экспорте в PNG. */
export const clippingCheck: QualityCheck = {
  id: "clipping",
  run({ root, width, height }): CheckFindings {
    const details: CheckFindings["details"] = [];
    for (const element of textElements(root)) {
      const box = textBox(element);
      if (!box) {
        continue;
      }
      const outside =
        box.left < -EDGE_SLACK ||
        box.top < -EDGE_SLACK ||
        box.right > width + EDGE_SLACK ||
        box.bottom > height + EDGE_SLACK;
      if (!outside) {
        continue;
      }
      details.push({
        x: Math.round(box.left),
        y: Math.round(box.top),
        refs: [(element.textContent ?? "").trim().slice(0, 40)],
      });
    }
    return { count: details.length, details: details.slice(0, 10) };
  },
};
