import { expect, test } from "@playwright/test";
import { waitForPreviewReady } from "./helpers/preview";

async function expectSampleRenders(page: import("@playwright/test").Page, sampleId: string) {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".sample-select").selectOption(`mermaid:${sampleId}`);

  await expect(page.locator(".preview-error")).toHaveCount(0, { timeout: 30_000 });
  await waitForPreviewReady(page);

  const svg = page.locator('.preview-content svg[aria-roledescription]').first();
  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(80);
  expect(box!.height).toBeGreaterThan(40);

  const svgHtml = await svg.innerHTML();
  expect(svgHtml).not.toMatch(/syntax error/i);
}

test("mermaid sankey sample renders in preview", async ({ page }) => {
  await expectSampleRenders(page, "sankey");
});

test("mermaid architecture sample renders in preview", async ({ page }) => {
  await expectSampleRenders(page, "architecture");
});
