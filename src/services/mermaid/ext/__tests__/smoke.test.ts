import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tryRenderExtension, validateExtensionSource } from "../index";
import { assertSvgInvariants } from "./svg-invariants";

const DIR = join(process.cwd(), "sandbox", "fixtures");

const GOOD = ["40-ev-basic.mmd", "41-ev-grid-off.mmd", "30-orgchart-basic.mmd", "32-orgchart-multi-root.mmd"];
const BAD = ["42-ev-mismatch.mmd", "33-orgchart-invalid.mmd", "31-orgchart-cycle.mmd"];

describe("smoke: песочница", () => {
  for (const name of GOOD) {
    it(`рендерит ${name}`, async () => {
      const src = readFileSync(join(DIR, name), "utf8");
      const svg = await tryRenderExtension(src);
      expect(svg).toBeTruthy();
      assertSvgInvariants(svg as string, { minElements: 6 });
      expect(validateExtensionSource(src)?.valid).toBe(true);
    });
  }

  it("битые фикстуры дают внятную ошибку", async () => {
    for (const name of BAD) {
      const src = readFileSync(join(DIR, name), "utf8");
      await expect(tryRenderExtension(src)).rejects.toThrow(/ev|orgchart/);
      const v = validateExtensionSource(src);
      expect(v?.valid).toBe(false);
      const issue = v?.issues[0];
      expect(issue).toBeDefined();
      expect(String(issue?.message ?? "").length).toBeGreaterThan(0);
    }
  });
});
