import { expect, test } from "@playwright/test";

test("converts plantuml graph to mermaid and supports undo", async ({ page }) => {
  await page.goto("/#/app");

  const editor = page.locator(".code-editor__textarea");
  await expect(editor).toBeVisible({ timeout: 30_000 });

  await page.locator(".sample-select").selectOption("plantuml:components");
  const source = await editor.inputValue();
  expect(source).toContain("@startuml");

  await page.getByRole("button", { name: "Edit" }).click();
  const convertItem = page.getByRole("menuitem", { name: /convert/i });
  await expect(convertItem).toBeEnabled();
  await convertItem.click();
  await expect(page.getByTestId("convert-diagram-modal")).toBeVisible();

  await page.locator(".convert-form select").first().selectOption("mermaid");
  await page.getByTestId("convert-accept-losses").check();
  await page.getByTestId("convert-apply").click();

  await expect(editor).toHaveValue(/flowchart/i, { timeout: 15_000 });
  await expect(editor).not.toHaveValue(/@startuml/);

  await page.getByRole("button", { name: "Edit" }).click();
  const undoItem = page.getByRole("menuitem", { name: /undo/i });
  await expect(undoItem).toBeEnabled();
  await undoItem.click();
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
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("menuitem", { name: /convert/i }).click();
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
