import { expect, test } from "@playwright/test";
import { getMermaidSampleSource } from "../../src/constants/mermaid-sample-diagrams";
import { waitForPreviewReady } from "./helpers/preview";

const ganttSource = getMermaidSampleSource("gantt", "ru");

test("mermaid gantt sample renders from dropdown", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".sample-select").selectOption("mermaid:gantt");

  await waitForPreviewReady(page);
  await expect(page.locator(".preview-error")).toHaveCount(0);

  const box = await page.locator(".preview-content svg").boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(120);
  expect(box!.height).toBeGreaterThan(40);
});

test("mixed gantt and plantuml source is cleaned and renders", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  const mixed = `${ganttSource}\n@startuml\nAlice -> Bob\n@enduml`;
  await page.evaluate((source) => {
    localStorage.setItem("plantuml-smetana-source", source);
  }, mixed);
  await page.reload();
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await waitForPreviewReady(page);
  await expect(page.locator(".preview-error")).toHaveCount(0);
});

test("pasting mermaid gantt over plantuml replaces the document", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.locator(".code-editor__textarea").click();
  await page.evaluate((text) => {
    const textarea = document.querySelector(
      ".code-editor__textarea",
    ) as HTMLTextAreaElement | null;
    if (!textarea) {
      throw new Error("textarea not found");
    }

    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    textarea.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }, ganttSource);

  await waitForPreviewReady(page);
  await expect(page.locator(".preview-error")).toHaveCount(0);

  const editorValue = await page.locator(".code-editor__textarea").inputValue();
  expect(editorValue).toContain("gantt");
  expect(editorValue).not.toContain("@startuml");
});
