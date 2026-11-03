import { describe, expect, it } from "vitest";
import { tryRenderExtension, validateExtensionSource } from "../index";

describe("tryRenderExtension", () => {
  it("возвращает null для штатного Mermaid", async () => {
    expect(await tryRenderExtension("graph TD\nA-->B")).toBeNull();
    expect(await tryRenderExtension("")).toBeNull();
  });

  it("бросает ошибку с префиксом типа при невалидном источнике", async () => {
    await expect(tryRenderExtension("waterfall\ntitle Пусто")).rejects.toThrow(/\[waterfall\]/);
  });

  it("возвращает SVG для валидного источника", async () => {
    const svg = await tryRenderExtension(`waterfall
=10 : A
+5 : B
=15 : C`);
    expect(svg).toMatch(/^<svg/);
  });

  it("прокидывает dark в рендер", async () => {
    const src = `waterfall
=10 : A
=10 : B`;
    const light = await tryRenderExtension(src, { dark: false });
    const dark = await tryRenderExtension(src, { dark: true });
    expect(light).not.toBe(dark);
  });
});

describe("validateExtensionSource", () => {
  it("возвращает null для штатного Mermaid", () => {
    expect(validateExtensionSource("graph TD\nA-->B")).toBeNull();
  });

  it("валидный источник → valid: true", () => {
    const r = validateExtensionSource(`waterfall
=10 : A
=10 : B`);
    expect(r).toMatchObject({ valid: true, issues: [] });
  });

  it("невалидный источник → valid: false с номером строки", () => {
    const r = validateExtensionSource(`waterfall
+10 : A`);
    expect(r?.valid).toBe(false);
    expect(r?.issues[0].line).toBeGreaterThanOrEqual(1);
    expect(r?.issues[0].severity).toBe("error");
  });
});

describe("SVG-корень для экспорта", () => {
  it("задаёт width/height явно, чтобы PNG не вышел дефолтным 800×600", async () => {
    const svg = await tryRenderExtension(`waterfall
=10 : A
+5 : B
=15 : C`);

    const root = svg!.match(/<svg[^>]*>/)?.[0] ?? "";
    const viewBox = root.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(viewBox).not.toBeNull();

    const width = root.match(/\bwidth="([\d.]+)"/)?.[1];
    const height = root.match(/\bheight="([\d.]+)"/)?.[1];
    expect(Number(width)).toBeCloseTo(Number(viewBox![1]), 1);
    expect(Number(height)).toBeCloseTo(Number(viewBox![2]), 1);
  });
});
