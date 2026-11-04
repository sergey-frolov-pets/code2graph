import { describe, it } from "vitest";
import { writeWizardThumbnails } from "@/constants/write-wizard-thumbnails";

const THUMBNAIL_WRITE_TIMEOUT_MS = 180_000;

describe("wizard thumbnail build (node)", () => {
  it.skipIf(process.env.WRITE_WIZARD_THUMBNAILS !== "1")(
    "writes light svgs for formats that render without a browser",
    async () => {
      await writeWizardThumbnails();
    },
    THUMBNAIL_WRITE_TIMEOUT_MS,
  );
});
