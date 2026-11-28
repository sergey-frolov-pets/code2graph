import {
  boxCenter,
  containingShape,
  edges,
  pointSegmentDistance,
  segmentsOf,
  shapeItems,
  textBox,
  textElements,
} from "../geometry";
import type { CheckFindings, QualityCheck } from "../types";

/**
 * Подпись далеко от своей связи.
 *
 * «Своя» связь — ближайший отрезок. Подписи внутри фигур (текст узла) не
 * проверяем: расстояние до связи для них смысла не имеет.
 */
export const labelDistanceCheck: QualityCheck = {
  id: "label-distance",
  run({ root, labelDistancePx }): CheckFindings {
    const segments = edges(root).flatMap(segmentsOf);
    if (segments.length === 0) {
      return { count: 0, details: [] };
    }

    const items = shapeItems(root);
    const details: CheckFindings["details"] = [];

    for (const element of textElements(root)) {
      const box = textBox(element);
      if (!box) {
        continue;
      }
      const center = boxCenter(box);
      if (containingShape(items, center)) {
        continue;
      }
      const nearest = Math.min(...segments.map((segment) => pointSegmentDistance(center, segment)));
      if (nearest <= labelDistancePx) {
        continue;
      }
      details.push({
        x: Math.round(center.x),
        y: Math.round(center.y),
        refs: [(element.textContent ?? "").trim().slice(0, 40), `${Math.round(nearest)} px`],
      });
    }

    return { count: details.length, details: details.slice(0, 10) };
  },
};
