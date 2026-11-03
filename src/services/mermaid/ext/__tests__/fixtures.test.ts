import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectType } from "../registry";

/**
 * Общий контракт для всех движков расширения.
 * Фикстуры — единственный источник правды: каждая обязана разбираться
 * тем движком, чей тип она объявляет (кроме файлов, помеченных как битые).
 */

const FIXTURES_DIR = join(process.cwd(), "sandbox", "fixtures");

/** Фикстуры, которые обязаны падать с ошибкой разбора. */
const EXPECTED_FAILURES = new Set([
  "07-waterfall-empty.mmd",
  "13-bubble-no-data.mmd",
  "22-heatmap-uneven.mmd",
  "33-orgchart-invalid.mmd",
  "42-ev-mismatch.mmd",
]);

function loadFixtures(): { name: string; source: string }[] {
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".mmd"))
    .sort()
    .map((name) => ({ name, source: readFileSync(join(FIXTURES_DIR, name), "utf8") }));
}

const fixtures = loadFixtures();

describe("фикстуры", () => {
  it("их не меньше 18", () => {
    expect(fixtures.length).toBeGreaterThanOrEqual(18);
  });

  it("каждая распознаётся как тип расширения", () => {
    for (const { name, source } of fixtures) {
      expect(detectType(source), `${name}: тип не распознан`).not.toBeNull();
    }
  });

  it("имена файлов не дублируются", () => {
    const names = fixtures.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("все ожидаемые падения действительно в списке фикстур", () => {
    const names = new Set(fixtures.map((f) => f.name));
    for (const failed of EXPECTED_FAILURES) {
      expect(names.has(failed), `${failed} отсутствует`).toBe(true);
    }
  });
});

/**
 * Проверка разбора всех фикстур конкретным движком.
 * Вызывается из тестов каждого движка.
 */
export function checkFixturesForType(type: string, parse: (src: string) => { ok: boolean; errors: { message: string; line: number; col: number }[] }) {
  const own = fixtures.filter((f) => detectType(f.source) === type);
  expect(own.length, `нет фикстур для типа ${type}`).toBeGreaterThan(0);

  for (const { name, source } of own) {
    const result = parse(source);
    if (EXPECTED_FAILURES.has(name)) {
      expect(result.ok, `${name}: должен упасть, но разобрался`).toBe(false);
      expect(result.errors.length, `${name}: пустой список ошибок`).toBeGreaterThan(0);
      for (const err of result.errors) {
        expect(err.message.length, `${name}: пустое сообщение`).toBeGreaterThan(0);
        expect(err.line, `${name}: line должен быть 1-based`).toBeGreaterThanOrEqual(1);
        expect(err.col, `${name}: col должен быть 0-based`).toBeGreaterThanOrEqual(0);
      }
    } else {
      const detail = result.ok ? "" : `: ${result.errors[0]?.message} (строка ${result.errors[0]?.line})`;
      expect(result.ok, `${name} должен разобраться${detail}`).toBe(true);
    }
  }
}

export { fixtures };
