/**
 * Заглушка движка: парсер ещё не написан.
 * Песочница должна открываться и показывать внятную ошибку, а не падать на импорте.
 */
import type { ExtDiagramType, ExtEngine } from "./types";

export function createPlaceholderEngine(type: ExtDiagramType): ExtEngine<never> {
  return {
    type,
    aliases: [],
    parse() {
      return {
        ok: false,
        errors: [{ message: `Движок «${type}» ещё не реализован`, line: 1, col: 0 }],
      };
    },
    render() {
      return "";
    },
  };
}
