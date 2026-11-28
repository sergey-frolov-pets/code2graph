import { boxesOverlap, textBox, textElements } from "../geometry";
import type { CheckFindings, QualityCheck } from "../types";

interface LabelBox {
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Наложение подписей друг на друга: текст читается хуже, чем должен. */
export const overlapCheck: QualityCheck = {
  id: "overlap",
  run({ root, labelSlackPx }): CheckFindings {
    const labels: LabelBox[] = [];
    for (const element of textElements(root)) {
      const box = textBox(element);
      if (box) {
        labels.push({ text: (element.textContent ?? "").trim(), ...box });
      }
    }

    const details: CheckFindings["details"] = [];
    for (let first = 0; first < labels.length; first += 1) {
      for (let second = first + 1; second < labels.length; second += 1) {
        const a = labels[first];
        const b = labels[second];
        if (!boxesOverlap(a, b, labelSlackPx)) {
          continue;
        }
        details.push({
          x: Math.round(a.left),
          y: Math.round(a.top),
          refs: [a.text.slice(0, 30), b.text.slice(0, 30)],
        });
      }
    }
    return { count: details.length, details: details.slice(0, 10) };
  },
};
