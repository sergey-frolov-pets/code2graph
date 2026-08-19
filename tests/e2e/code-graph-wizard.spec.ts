import { expect, test } from "@playwright/test";
import {
  generateDiagramAndApply,
  ingestZipAndOpenTree,
  prepareCodeGraphE2E,
} from "./helpers/code-graph";

test.describe("code-to-graph wizard", () => {
  test.beforeEach(async ({ page }) => {
    await prepareCodeGraphE2E(page);
    await page.goto("/#/app");
    await expect(page.locator(".code-editor__textarea")).toBeVisible({ timeout: 30_000 });
  });

  test("generates folder diagram from zip into a new editor tab", async ({ page }) => {
    await generateDiagramAndApply(page, "code-graph-diagram-folder");

    await expect(page.getByTestId("diagram-wizard-modal")).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("editor-tab-bar")).toBeVisible();

    const editor = page.locator(".code-editor__textarea");
    await expect(editor).toHaveValue(/@startuml/, { timeout: 15_000 });
    await expect(editor).toHaveValue(/user\.py/i);
  });

  test("generates class diagram for a single python file (free tier)", async ({ page }) => {
    await generateDiagramAndApply(page, "code-graph-diagram-class");

    const editor = page.locator(".code-editor__textarea");
    await expect(editor).toHaveValue(/@startuml/, { timeout: 15_000 });
    await expect(editor).toHaveValue(/class User/i);
  });

  test("shows project tree after zip upload", async ({ page }) => {
    await ingestZipAndOpenTree(page);
    await expect(page.getByTestId("code-graph-tree")).toContainText("user.py");
  });
});
