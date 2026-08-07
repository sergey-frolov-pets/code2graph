import { expect, test } from "@playwright/test";

test("mermaid gantt sample renders in preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".sample-select").selectOption("mermaid:gantt");

  const svg = page.locator(".preview-content svg");
  await expect(svg).toBeVisible({ timeout: 30_000 });

  const box = await svg.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(120);
  expect(box!.height).toBeGreaterThan(40);
});
