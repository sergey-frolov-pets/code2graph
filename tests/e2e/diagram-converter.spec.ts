import { expect, test } from "@playwright/test";

test("converts plantuml graph to mermaid and supports undo", async ({ page }) => {
  await page.goto("/#/app");

  const editor = page.locator(".code-editor__textarea");
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await page.locator(".sample-select").selectOption("plantuml:components");
  const source = await editor.inputValue();
  expect(source).toContain("@startuml");

  const convertButton = page.getByTestId("editor-convert");
  await expect(convertButton).toBeEnabled();
  await convertButton.click();
  await expect(page.getByTestId("convert-diagram-modal")).toBeVisible();

  await page.locator(".convert-form select").first().selectOption("mermaid");
  await page.getByTestId("convert-accept-losses").check();
  await page.getByTestId("convert-apply").click();

  await expect(editor).toHaveValue(/flowchart/i, { timeout: 15_000 });
  await expect(editor).not.toHaveValue(/@startuml/);

  const undoButton = page.getByTestId("editor-undo");
  await expect(undoButton).toBeEnabled();
  await undoButton.click();
  await expect(editor).toHaveValue(/@startuml/, { timeout: 5_000 });
  await expect(editor).not.toHaveValue(/flowchart/i);
});

test("converts plantuml components to graphml with groups and renders preview SVG", async ({
  page,
}) => {
  await page.goto("/#/app");

  const editor = page.locator(".code-editor__textarea");
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await page.locator(".sample-select").selectOption("plantuml:components");
  await page.getByTestId("editor-convert").click();
  await expect(page.getByTestId("convert-diagram-modal")).toBeVisible();

  await page.locator(".convert-form select").first().selectOption("graphml");
  await page.getByTestId("convert-accept-losses").check();
  await page.getByTestId("convert-apply").click();

  await expect(editor).toHaveValue(/<graphml/i, { timeout: 15_000 });
  await expect(editor).toHaveValue(/<graph id="Client_graph"/);
  await expect(page.locator(".preview-content svg")).toBeVisible({
    timeout: 15_000,
  });
});
