import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

const PREVIEW_READY_TIMEOUT_MS = 90_000;
const ENGINE_READY_TIMEOUT_MS = 15_000;

export async function skipIfOfflinePlantUmlUnavailable(page: Page): Promise<void> {
  const ready = await page
    .waitForFunction(
      () => document.body.textContent?.includes("Engine ready"),
      undefined,
      { timeout: ENGINE_READY_TIMEOUT_MS },
    )
    .then(() => true)
    .catch(() => false);

  if (!ready) {
    test.skip(
      true,
      "Offline PlantUML engine did not boot in the preview environment",
    );
  }
}

export async function waitForPreviewReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const preview = document.querySelector(".preview-content svg");
      if (!preview) {
        return false;
      }

      const rect = preview.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    },
    undefined,
    { timeout: PREVIEW_READY_TIMEOUT_MS },
  );
}
