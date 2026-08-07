import { expect, test } from "@playwright/test";

test("plantuml gantt sample renders offline in preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".sample-select").selectOption("plantuml:gantt");

  await expect(page.locator(".preview-content svg")).toBeVisible({
    timeout: 60_000,
  });
});
