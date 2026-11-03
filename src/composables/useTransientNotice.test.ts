import { describe, expect, it, vi } from "vitest";
import { useTransientNotice } from "@/composables/useTransientNotice";

describe("useTransientNotice", () => {
  it("clears notice after the configured duration", () => {
    vi.useFakeTimers();
    const { notice, showNotice } = useTransientNotice(3000);

    showNotice("Сервер библиотеки недоступен: http://localhost:3001");
    expect(notice.value).toContain("localhost:3001");

    vi.advanceTimersByTime(2999);
    expect(notice.value).toContain("localhost:3001");

    vi.advanceTimersByTime(1);
    expect(notice.value).toBe("");

    vi.useRealTimers();
  });
});
