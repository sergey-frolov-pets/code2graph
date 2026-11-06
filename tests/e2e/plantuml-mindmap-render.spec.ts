import { expect, test } from "@playwright/test";
import { waitForPreviewReady, skipIfOfflinePlantUmlUnavailable } from "./helpers/preview";

test("plantuml mindmap sample renders offline in preview", async ({ page }) => {
  await page.goto("/#/app");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await skipIfOfflinePlantUmlUnavailable(page);
  await page.locator(".sample-select").selectOption("plantuml:mindmap");

  await waitForPreviewReady(page);
  await expect(page.locator(".preview-error")).toHaveCount(0);

  const preview = page.locator(".preview-content");
  await expect(preview).toContainText("Code2Graph", { timeout: 30_000 });
  await expect(preview).not.toContainText(/Syntax Error/i);
});
