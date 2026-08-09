import { expect, test } from "@playwright/test";
import { waitForPreviewReady, skipIfOfflinePlantUmlUnavailable } from "./helpers/preview";

test("plantuml mindmap sample renders offline in preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await skipIfOfflinePlantUmlUnavailable(page);
  await page.locator(".sample-select").selectOption("plantuml:mindmap");

  await waitForPreviewReady(page);
  await expect(page.locator(".preview-error")).toHaveCount(0);

  const previewText = await page.locator(".preview-content").innerText();
  expect(previewText).not.toMatch(/Syntax Error/i);
  expect(previewText).toContain("vuePlantUML");
});
