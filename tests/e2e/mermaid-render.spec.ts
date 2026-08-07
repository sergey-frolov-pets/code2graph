import { expect, test } from "@playwright/test";

test("mermaid gantt sample renders in preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".sample-select").selectOption("mermaid:gantt");

  await expect(page.locator(".preview-content svg")).toBeVisible({
    timeout: 30_000,
  });
});
