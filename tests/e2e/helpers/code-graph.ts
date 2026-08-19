import { expect, type Page } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/code-graph",
);

export const CODE_GRAPH_E2E_ZIP = path.join(FIXTURE_ROOT, "e2e-demo.zip");

export async function prepareCodeGraphE2E(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("code2graph-locale", "en");
    localStorage.setItem("code2graph-wizard-onboarding-dismissed", "true");
    localStorage.setItem("code2graph-wizard-fold-onboarding-dismissed", "true");
    localStorage.setItem("code2graph-pwa-banner-dismissed", "true");
  });
}

function wizardModal(page: Page) {
  return page.getByTestId("diagram-wizard-modal");
}

export async function openCodeGraphWizard(page: Page): Promise<void> {
  await page.getByRole("button", { name: "New diagram" }).click();
  await wizardModal(page).waitFor({ state: "visible" });
}

export async function selectFromCodeMode(page: Page): Promise<void> {
  await page.getByTestId("wizard-mode-fromCode").click();
}

export async function wizardNext(page: Page): Promise<void> {
  const next = wizardModal(page).getByRole("button", { name: "Next" });
  await expect(next).toBeEnabled({ timeout: 15_000 });
  await next.click();
}

export async function wizardApply(page: Page): Promise<void> {
  await wizardModal(page).getByRole("button", { name: "Apply to editor" }).click();
}

export async function uploadCodeGraphZip(page: Page, zipPath = CODE_GRAPH_E2E_ZIP): Promise<void> {
  await wizardModal(page).getByTestId("code-graph-zip-input").setInputFiles(zipPath);
  await expect(wizardModal(page).getByRole("button", { name: "Next" })).toBeEnabled({
    timeout: 15_000,
  });
}

export async function ingestZipAndOpenTree(page: Page): Promise<void> {
  await openCodeGraphWizard(page);
  await selectFromCodeMode(page);
  await wizardNext(page);
  await uploadCodeGraphZip(page);
  await wizardNext(page);
  await page.getByTestId("code-graph-tree").waitFor({ state: "visible" });
}

async function waitForWizardStepTitle(page: Page, title: string): Promise<void> {
  await expect(wizardModal(page).locator(".wizard-step-title")).toHaveText(title, {
    timeout: 15_000,
  });
}

export async function generateDiagramAndApply(
  page: Page,
  diagramTestId: "code-graph-diagram-folder" | "code-graph-diagram-class",
): Promise<void> {
  await ingestZipAndOpenTree(page);
  await wizardNext(page);
  await waitForWizardStepTitle(page, "Diagram type");
  await wizardModal(page).getByTestId(diagramTestId).click();
  await wizardNext(page);
  await waitForWizardStepTitle(page, "IR review");
  await wizardNext(page);
  await waitForWizardStepTitle(page, "Batch generation");
  await wizardNext(page);
  await waitForWizardStepTitle(page, "Result");
  await expect(wizardModal(page).getByRole("button", { name: "Apply to editor" })).toBeVisible();
  await wizardApply(page);
}
