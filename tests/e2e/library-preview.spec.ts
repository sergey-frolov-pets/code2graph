import { expect, test } from "@playwright/test";

async function seedLocalLibraryDiagram(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(async () => {
    const DB = "vueplantuml-library";
    await new Promise<void>((resolve) => {
      const del = indexedDB.deleteDatabase(DB);
      del.onsuccess = () => resolve();
      del.onerror = () => resolve();
    });

    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        for (const name of [
          "sections",
          "diagrams",
          "diagramDetails",
          "meta",
        ]) {
          if (!database.objectStoreNames.contains(name)) {
            database.createObjectStore(name, {
              keyPath: name === "meta" ? "key" : "id",
            });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    });

    const now = new Date().toISOString();
    const diagram = {
      id: "e2e-preview-diagram",
      sectionId: null,
      title: "E2E Preview Diagram",
      description: "library preview e2e",
      tags: ["e2e"],
      language: "mermaid",
      source:
        "gantt\ntitle E2E\ndateFormat YYYY-MM-DD\nsection A\nTask :a1, 2024-01-01, 3d",
      fileName: "e2e-preview.mmd",
      byteSize: 64,
      createdAt: now,
      updatedAt: now,
      visibility: "all",
      canWrite: true,
      isFavorite: false,
    };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["diagrams", "diagramDetails"], "readwrite");
      const listItem = { ...diagram };
      delete (listItem as { source?: string }).source;
      tx.objectStore("diagrams").put(listItem);
      tx.objectStore("diagramDetails").put(diagram);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error ?? new Error("idb seed transaction failed"));
    });
    db.close();
  });
}

test("library local preview modal opens with rendered svg", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await seedLocalLibraryDiagram(page);
  await page.reload();
  await expect(page.locator(".code-editor__textarea")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByRole("button", { name: /All diagrams|Все диаграммы/i }).click();
  await page.getByText("E2E Preview Diagram").click();
  await page.getByRole("button", { name: /Preview|Превью/i }).click();

  const modal = page.locator(".modal-backdrop.is-above-library");
  await expect(modal).toBeVisible({ timeout: 15_000 });
  await expect(modal.locator(".modal-title")).toContainText(
    "E2E Preview Diagram",
  );
  await expect(modal.locator(".library-preview-modal__content svg")).toBeVisible(
    {
      timeout: 30_000,
    },
  );
});
