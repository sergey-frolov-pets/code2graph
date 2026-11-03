import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tryRenderExtension } from "../index";
import { assertSvgInvariants } from "./svg-invariants";

/**
 * Golden-эталоны: рендер каждой фикстуры в светлой и тёмной теме
 * сверяется с файлом в sandbox/golden/.
 *
 * Рендер детерминирован (без DOM, времени и случайности), поэтому
 * побайтовое сравнение корректно. Обновить эталоны после осознанного
 * изменения раскладки: `node sandbox/scripts/gen-golden.mjs`.
 */

const FIXTURES = join(process.cwd(), "sandbox", "fixtures");
const GOLDEN = join(process.cwd(), "sandbox", "golden");

const MODES = [
  { suffix: "", options: {} },
  { suffix: ".dark", options: { dark: true } },
] as const;

const fixtures = readdirSync(FIXTURES)
  .filter((f) => f.endsWith(".mmd"))
  .sort();

describe("golden: эталоны рендера", () => {
  it("каталог эталонов существует", () => {
    expect(existsSync(GOLDEN)).toBe(true);
  });

  for (const name of fixtures) {
    const base = name.replace(/\.mmd$/, "");
    const source = readFileSync(join(FIXTURES, name), "utf8");

    for (const mode of MODES) {
      const goldenName = `${base}${mode.suffix}.svg`;

      it(`${goldenName} совпадает с эталоном`, async () => {
        const goldenPath = join(GOLDEN, goldenName);
        expect(existsSync(goldenPath), `нет эталона ${goldenName}`).toBe(true);
        const expected = readFileSync(goldenPath, "utf8");

        let actual: string;
        try {
          const svg = await tryRenderExtension(source, mode.options);
          expect(svg, "тип не распознан как расширение").not.toBeNull();
          actual = svg as string;
        } catch (e) {
          // Битые фикстуры: эталон — текст ошибки.
          actual = `ERROR: ${e instanceof Error ? e.message : String(e)}\n`;
        }

        expect(actual).toBe(expected);

        // Успешный рендер дополнительно проверяется общими инвариантами.
        if (!actual.startsWith("ERROR")) {
          assertSvgInvariants(actual, { minElements: 1 });
        }
      });
    }
  }

  it("нет лишних эталонов без фикстур", () => {
    const expected = new Set(
      fixtures.flatMap((f) => MODES.map((m) => `${f.replace(/\.mmd$/, "")}${m.suffix}.svg`)),
    );
    const actual = readdirSync(GOLDEN).filter((f) => f.endsWith(".svg"));
    const orphans = actual.filter((f) => !expected.has(f));
    expect(orphans, `лишние эталоны: ${orphans.join(", ")}`).toEqual([]);
  });
});
