import { expect, test } from "@playwright/test";

test("loads editor and shows preview panel", async ({ page }) => {
  await page.goto("/#/app");

  const editor = page.locator(".code-editor__textarea");
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await editor.fill("@startuml\nAlice -> Bob : Hello\n@enduml");

  const previewPanel = page.locator(".preview-panel");
  await expect(previewPanel).toBeVisible();
});
