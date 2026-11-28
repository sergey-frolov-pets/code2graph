import {
  ancestorOffset,
  boxCenter,
  contrastRatio,
  containingShape,
  inheritedPaint,
  parseColorRgb,
  shapeItems,
  textBox,
  textElements,
} from "../geometry";
import type { CheckFindings, QualityCheck } from "../types";

const WHITE: [number, number, number] = [255, 255, 255];

/**
 * Контраст текста к подложке по WCAG AA.
 *
 * Подложка — самая маленькая фигура под подписью (в SVG текст узла не вложен
 * в его `<rect>`, поэтому ищем геометрически). Прозрачная заливка и градиенты
 * не разбираются: тогда фоном считается белый холст.
 */
export const contrastCheck: QualityCheck = {
  id: "contrast",
  run({ root, minContrast }): CheckFindings {
    const items = shapeItems(root);
    const details: CheckFindings["details"] = [];

    for (const element of textElements(root)) {
      const box = textBox(element);
      if (!box) {
        continue;
      }
      const shape = containingShape(items, boxCenter(box));
      const background = (shape && parseColorRgb(inheritedPaint(shape.element, "fill"))) || WHITE;
      const fill = parseColorRgb(inheritedPaint(element, "fill")) ?? [0, 0, 0];
      const ratio = contrastRatio(fill, background);
      if (ratio >= minContrast) {
        continue;
      }
      const shift = ancestorOffset(element);
      details.push({
        x: Math.round(box.left - shift.x),
        y: Math.round(box.top - shift.y),
        refs: [(element.textContent ?? "").trim().slice(0, 40), `${ratio.toFixed(2)}:1`],
      });
    }

    return { count: details.length, details: details.slice(0, 10) };
  },
};
