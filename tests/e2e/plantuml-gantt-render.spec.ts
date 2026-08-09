import { expect, test } from "@playwright/test";
import { waitForPreviewReady, skipIfOfflinePlantUmlUnavailable } from "./helpers/preview";

test("plantuml gantt sample renders offline in preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await skipIfOfflinePlantUmlUnavailable(page);
  await page.locator(".sample-select").selectOption("plantuml:gantt");

  await waitForPreviewReady(page);
});
