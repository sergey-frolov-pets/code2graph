import { expect, test } from "@playwright/test";

test("converts plantuml graph to mermaid and supports undo", async ({ page }) => {
  await page.goto("/#/app");

  const editor = page.locator(".code-editor__textarea");
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await page.locator(".sample-select").selectOption("plantuml:components");
  const source = await editor.inputValue();
  expect(source).toContain("@startuml");

  await expect(page.getByRole("button", { name: /convert/i })).toBeEnabled();

  await page.getByRole("button", { name: /convert/i }).click();
  await expect(page.getByTestId("convert-diagram-modal")).toBeVisible();

  await page.locator(".convert-form select").first().selectOption("mermaid");
  await page.getByTestId("convert-accept-losses").check();
  await page.getByTestId("convert-apply").click();

  await expect(editor).toHaveValue(/flowchart/i, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: /undo/i })).toBeEnabled();
  await expect(editor).not.toHaveValue(/@startuml/);

  await page.getByRole("button", { name: /undo/i }).click();
  await expect(editor).toHaveValue(/@startuml/, { timeout: 5_000 });
  await expect(editor).not.toHaveValue(/flowchart/i);
});
