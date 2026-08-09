import { expect, test } from "@playwright/test";
import { waitForPreviewReady } from "./helpers/preview";

test("mermaid gantt sample renders in preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".sample-select").selectOption("mermaid:gantt");

  await waitForPreviewReady(page);
  const svg = page.locator(".preview-content svg");

  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(120);
  expect(box!.height).toBeGreaterThan(40);
});
