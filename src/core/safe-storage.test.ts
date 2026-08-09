import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readStorageBoolean,
  readStorageItem,
  readStorageJson,
  writeStorageItem,
  writeStorageJson,
} from "@/core/safe-storage";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
});

afterEach(() => {
  storage.clear();
});

describe("safe-storage", () => {
  it("reads and writes string values", () => {
    expect(writeStorageItem("key", "value")).toBe(true);
    expect(readStorageItem("key")).toBe("value");
  });

  it("parses booleans", () => {
    writeStorageItem("flag", "true");
    expect(readStorageBoolean("flag")).toBe(true);
    writeStorageItem("flag", "false");
    expect(readStorageBoolean("flag")).toBe(false);
  });

  it("reads and writes JSON", () => {
    writeStorageJson("data", { count: 2 });
    expect(
      readStorageJson("data", (value) => {
        if (!value || typeof value !== "object") {
          return null;
        }
        const record = value as Record<string, unknown>;
        return typeof record.count === "number" ? { count: record.count } : null;
      }),
    ).toEqual({ count: 2 });
  });

  it("returns null for missing keys", () => {
    expect(readStorageItem("missing")).toBeNull();
    expect(readStorageBoolean("missing")).toBeNull();
  });
});
