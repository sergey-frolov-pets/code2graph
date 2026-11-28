import {
  edges,
  pointInBox,
  segmentCrossesBox,
  segmentsOf,
  shapeBox,
  shapes,
} from "../geometry";
import type { CheckFindings, QualityCheck } from "../types";

/**
 * Связь пересекает чужой узел.
 *
 * Своим считается узел, внутри которого лежит конец связи: линии, выходящие
 * из фигуры, не считаются пересечением. Кривые Безье не разбираются — такие
 * связи проверка пропускает, чтобы не давать ложных срабатываний.
 */
export const edgeCrossingCheck: QualityCheck = {
  id: "edge-crossing",
  run({ root }): CheckFindings {
    const boxes = shapes(root)
      .map((element) => ({ element, box: shapeBox(element) }))
      .filter((item): item is { element: Element; box: NonNullable<ReturnType<typeof shapeBox>> } =>
        item.box !== null,
      );

    const details: CheckFindings["details"] = [];
    for (const element of edges(root)) {
      for (const segment of segmentsOf(element)) {
        const [start, end] = segment;
        for (const { element: shape, box } of boxes) {
          if (shape === element) {
            continue;
          }
          if (pointInBox(start, box) || pointInBox(end, box)) {
            continue;
          }
          if (!segmentCrossesBox(segment, box)) {
            continue;
          }
          details.push({
            x: Math.round((start.x + end.x) / 2),
            y: Math.round((start.y + end.y) / 2),
            refs: [element.getAttribute("id") ?? element.tagName.toLowerCase(), shape.tagName.toLowerCase()],
          });
        }
      }
    }
    return { count: details.length, details: details.slice(0, 10) };
  },
};
