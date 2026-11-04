// @vitest-environment jsdom
import { describe, it } from "vitest";
import { writeWizardThumbnails } from "@/constants/write-wizard-thumbnails";

const THUMBNAIL_WRITE_TIMEOUT_MS = 600_000;

describe("wizard thumbnail build", () => {
  it.skipIf(process.env.WRITE_WIZARD_THUMBNAILS !== "1")(
    "writes a light svg for every example and locale",
    async () => {
      await writeWizardThumbnails();
    },
    THUMBNAIL_WRITE_TIMEOUT_MS,
  );
});
