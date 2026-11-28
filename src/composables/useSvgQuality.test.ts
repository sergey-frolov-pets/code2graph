// @vitest-environment jsdom

import { createApp, defineComponent, h, nextTick, ref, type Ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SVG_QUALITY_DEBOUNCE_MS, useSvgQuality } from "@/composables/useSvgQuality";

function svg(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">${body}</svg>`;
}

const HEALTHY = svg(
  `<rect x="10" y="10" width="80" height="40" fill="#fff" stroke="#000"/>`
    + `<text x="20" y="35" font-size="12">Начало</text>`,
);

const DUPLICATE_IDS = svg(
  `<rect id="node" x="10" y="10" width="80" height="40" fill="#fff" stroke="#000"/>`
    + `<rect id="node" x="110" y="10" width="80" height="40" fill="#fff" stroke="#000"/>`,
);

function mount(source: Ref<string | undefined>) {
  let api: ReturnType<typeof useSvgQuality> | null = null;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(
    defineComponent({
      setup() {
        api = useSvgQuality(() => source.value);
        return () => h("div");
      },
    }),
  );
  app.mount(host);
  return {
    get report() {
      return api?.report.value ?? null;
    },
    get blocked() {
      return api?.blocked.value ?? false;
    },
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

async function settle(): Promise<void> {
  await nextTick();
  vi.advanceTimersByTime(SVG_QUALITY_DEBOUNCE_MS + 10);
  await nextTick();
}

describe("useSvgQuality", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("пустой SVG — отчёта нет, экспорт не блокируется", async () => {
    const view = mount(ref(""));
    await settle();

    expect(view.report).toBeNull();
    expect(view.blocked).toBe(false);
    view.unmount();
  });

  it("здоровая диаграмма — отчёт после задержки, блокировки нет", async () => {
    const view = mount(ref(HEALTHY));
    expect(view.report).toBeNull();

    await settle();

    expect(view.report?.passed).toBe(true);
    expect(view.report?.score).toBe("6/6");
    expect(view.blocked).toBe(false);
    view.unmount();
  });

  it("повторяющиеся id — fail и блокировка экспорта", async () => {
    const view = mount(ref(DUPLICATE_IDS));
    await settle();

    expect(view.report?.error).toBeUndefined();
    expect(view.report?.checks.find((check) => check.id === "duplicate-ids")?.status).toBe("fail");
    expect(view.blocked).toBe(true);
    view.unmount();
  });

  it("битый SVG — invalid-svg и блокировка", async () => {
    const view = mount(ref("<svg><text>без закрытия</text>"));
    await settle();

    expect(view.report?.error).toBe("invalid-svg");
    expect(view.blocked).toBe(true);
    view.unmount();
  });

  it("серия правок даёт один прогон", async () => {
    const source = ref(HEALTHY);
    const view = mount(source);
    await nextTick();

    source.value = `${HEALTHY} `;
    await nextTick();
    source.value = `${HEALTHY}  `;
    await settle();

    expect(view.report?.passed).toBe(true);
    view.unmount();
  });
});
