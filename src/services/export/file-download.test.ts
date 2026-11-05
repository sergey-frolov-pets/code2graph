// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { copyPngBlobToClipboard } from "@/services/export/file-download";

const PNG_MIME_TYPE = "image/png";

function stubClipboard(write: (items: ClipboardItem[]) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { write },
  });
}

describe("copyPngBlobToClipboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("writes the PNG while the blob is still a promise", async () => {
    const writes: Array<Record<string, Blob | Promise<Blob>>> = [];

    class FakeClipboardItem {
      data: Record<string, Blob | Promise<Blob>>;

      constructor(data: Record<string, Blob | Promise<Blob>>) {
        this.data = data;
      }
    }

    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      const item = items[0];
      if (!item) {
        return;
      }
      writes.push(item.data);
    });
    stubClipboard(write as unknown as (items: ClipboardItem[]) => Promise<void>);

    const blob = new Blob(["png"], { type: PNG_MIME_TYPE });
    const png = Promise.resolve(blob);
    await copyPngBlobToClipboard(png);

    expect(write).toHaveBeenCalledOnce();
    const payload = await writes[0]?.[PNG_MIME_TYPE];
    expect(payload).toBe(blob);
  });

  it("retries with a resolved blob when the promise form is rejected", async () => {
    const seen: Array<Blob | Promise<Blob>> = [];

    class FakeClipboardItem {
      data: Record<string, Blob | Promise<Blob>>;

      constructor(data: Record<string, Blob | Promise<Blob>>) {
        this.data = data;
      }
    }

    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const write = vi.fn(async (items: FakeClipboardItem[]) => {
      const payload = items[0]?.data[PNG_MIME_TYPE];
      if (!payload) {
        throw new Error("missing png");
      }
      seen.push(payload);
      if (typeof (payload as Promise<Blob>).then === "function") {
        throw new Error("promise form rejected");
      }
    });
    stubClipboard(write as unknown as (items: ClipboardItem[]) => Promise<void>);

    const blob = new Blob(["png"], { type: "application/octet-stream" });
    await copyPngBlobToClipboard(Promise.resolve(blob));

    expect(write).toHaveBeenCalledTimes(2);
    const ready = seen[1];
    expect(ready).toBeInstanceOf(Blob);
    expect((ready as Blob).type).toBe(PNG_MIME_TYPE);
  });

  it("reports that PNG clipboard copy is unavailable", async () => {
    vi.stubGlobal("ClipboardItem", undefined);

    await expect(
      copyPngBlobToClipboard(Promise.resolve(new Blob(["png"]))),
    ).rejects.toBeInstanceOf(LocalizedAppError);
    await expect(
      copyPngBlobToClipboard(Promise.resolve(new Blob(["png"]))),
    ).rejects.toMatchObject({ messageKey: "app.copyPngUnsupported" });
  });

  it("keeps a render error when the image itself fails", async () => {
    class FakeClipboardItem {
      constructor(public data: Record<string, Promise<Blob>>) {}
    }

    vi.stubGlobal("ClipboardItem", FakeClipboardItem);
    const write = vi.fn(async () => {
      throw new Error("clipboard rejected");
    });
    stubClipboard(write);

    const renderError = new LocalizedAppError("engine.pngCreateFailed");
    await expect(copyPngBlobToClipboard(Promise.reject(renderError))).rejects.toBe(
      renderError,
    );
  });
});
