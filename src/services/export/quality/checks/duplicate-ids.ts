import type { CheckFindings, QualityCheck } from "../types";

/** Повторяющиеся `id` ломают инлайн: браузер подсвечивает первый элемент. */
export const duplicateIdsCheck: QualityCheck = {
  id: "duplicate-ids",
  run({ root }): CheckFindings {
    const counts = new Map<string, number>();
    for (const element of Array.from(root.querySelectorAll("[id]"))) {
      const id = element.getAttribute("id") ?? "";
      if (!id) {
        continue;
      }
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const duplicates = Array.from(counts.entries()).filter(([, count]) => count > 1);
    return {
      count: duplicates.length,
      details: duplicates
        .slice(0, 10)
        .map(([id, count]) => ({ refs: [`${id} ×${count}`] })),
    };
  },
};
