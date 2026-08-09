import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  DEFAULT_SPLIT_RATIO,
  STORAGE_KEY_SPLIT_RATIO,
} from "@/constants/layout-settings";
import { useResizableSplit } from "@/composables/useResizableSplit";

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

describe("useResizableSplit", () => {
  it("loads stored split ratio on mount", () => {
    storage.set(STORAGE_KEY_SPLIT_RATIO, JSON.stringify(0.62));
    const containerRef = ref<HTMLElement | null>(null);
    const { splitRatio } = useResizableSplit(containerRef);

    expect(splitRatio.value).toBe(0.62);
  });

  it("falls back to default ratio when storage is invalid", () => {
    storage.set(STORAGE_KEY_SPLIT_RATIO, "invalid");
    const containerRef = ref<HTMLElement | null>(null);
    const { splitRatio } = useResizableSplit(containerRef);

    expect(splitRatio.value).toBe(DEFAULT_SPLIT_RATIO);
  });
});
