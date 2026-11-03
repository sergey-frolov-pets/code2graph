import { expect, test } from "@playwright/test";

test("loads editor and shows preview panel", async ({ page }) => {
  await page.goto("/#/app");

  const editor = page.locator(".code-editor__textarea");
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await editor.fill("@startuml\nAlice -> Bob : Hello\n@enduml");

  const previewPanel = page.locator(".preview-panel");
  await expect(previewPanel).toBeVisible();
});

test("returns from the editor header to the landing page", async ({ page }) => {
  await page.goto("/#/app");

  const homeButton = page.locator(".app-header__nav").getByRole("button", {
    name: /На главную|Back to home/i,
  });
  await expect(homeButton).toBeVisible({ timeout: 30_000 });
  await homeButton.click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(page.locator(".landing-page")).toBeVisible();
});

