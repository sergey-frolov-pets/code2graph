// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/analytics/goatcounter";
import {
  analyticsSlug,
  reportAppVisit,
  reportClick,
  reportLanguage,
  reportOpen,
  reportPage,
  reportSiteClick,
  reportSurface,
  reportWizardOpen,
  resetUsageMemory,
} from "@/analytics/usage";

type CountVars = { path?: string; title?: string; event?: boolean };
type GcWindow = { goatcounter?: { count?: (vars: CountVars) => void } };

function installGoatCounter(): ReturnType<typeof vi.fn> {
  const count = vi.fn();
  (window as unknown as GcWindow).goatcounter = { count };
  return count;
}

/** Пути событий, которые реально ушли в счётчик. */
function sentPaths(count: ReturnType<typeof vi.fn>): string[] {
  return count.mock.calls.map((call) => (call[0] as CountVars).path ?? "");
}

beforeEach(() => {
  resetUsageMemory();
  window.localStorage.clear();
});

afterEach(() => {
  delete (window as unknown as GcWindow).goatcounter;
  vi.restoreAllMocks();
});

describe("analyticsSlug", () => {
  it("приводит имя к безопасному пути", () => {
    expect(analyticsSlug("  Mermaid Diagram! ")).toBe("mermaid-diagram");
    expect(analyticsSlug("a/b\\c")).toBe("a-b-c");
  });

  it("пустое имя не превращается в пустой путь", () => {
    expect(analyticsSlug("   ")).toBe("unknown");
    expect(analyticsSlug("///")).toBe("unknown");
  });

  it("режет слишком длинное имя", () => {
    expect(analyticsSlug("a".repeat(120))).toHaveLength(48);
  });
});

describe("reportAppVisit", () => {
  it("считает вход один раз за открытие", () => {
    const count = installGoatCounter();

    reportAppVisit("ru");
    reportAppVisit("ru");

    expect(sentPaths(count)).toEqual(["visit/app", "language/ru"]);
  });

  it("язык уходит раз в сутки, а не с каждым входом", () => {
    const count = installGoatCounter();

    reportAppVisit("ru");
    resetUsageMemory();
    reportAppVisit("ru");

    expect(sentPaths(count)).toEqual([
      "visit/app",
      "language/ru",
      "visit/app",
    ]);
  });

  it("смена языка в те же сутки не даёт второго события", () => {
    const count = installGoatCounter();

    reportAppVisit("ru");
    reportLanguage("en");

    expect(sentPaths(count)).toEqual(["visit/app", "language/ru"]);
  });

  it("новые сутки — снова язык", () => {
    const count = installGoatCounter();

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
    reportAppVisit("ru");
    vi.setSystemTime(new Date("2026-11-26T10:00:00Z"));
    reportLanguage("en");
    vi.useRealTimers();

    expect(sentPaths(count)).toEqual([
      "visit/app",
      "language/ru",
      "language/en",
    ]);
  });

  it("приватный режим не ломает учёт языка в этой сессии", () => {
    const count = installGoatCounter();
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });

    reportAppVisit("ru");
    reportLanguage("en");

    getItem.mockRestore();
    setItem.mockRestore();

    expect(sentPaths(count)).toEqual(["visit/app", "language/ru"]);
  });
});

describe("reportPage", () => {
  it("повторный переход в тот же раздел не считается", () => {
    const count = installGoatCounter();

    reportPage("landing");
    reportPage("landing");
    reportPage("app");
    reportPage("master-mermaid");

    expect(sentPaths(count)).toEqual([
      "page/landing",
      "page/app",
      "page/master-mermaid",
    ]);
  });

  it("после перезагрузки разделы считаются заново", () => {
    const count = installGoatCounter();

    reportPage("landing");
    resetUsageMemory();
    reportPage("landing");

    expect(sentPaths(count)).toEqual(["page/landing", "page/landing"]);
  });

  it("чужой раздел отбрасывается", () => {
    const count = installGoatCounter();

    reportPage("../../etc/passwd" as never);
    reportPage("master-Mermaid!" as never);

    expect(sentPaths(count)).toEqual(["page/master-mermaid"]);
  });
});

describe("reportClick", () => {
  it("считает переходы по внешним ссылкам", () => {
    const count = installGoatCounter();

    reportClick("github");
    reportClick("discussions");
    reportClick("donation");
    reportClick("license");

    expect(sentPaths(count)).toEqual([
      "click/github",
      "click/discussions",
      "click/donation",
      "click/license",
    ]);
  });

  it("клики — настоящие действия, каждый считается", () => {
    const count = installGoatCounter();

    reportClick("github");
    reportClick("github");

    expect(sentPaths(count)).toEqual(["click/github", "click/github"]);
  });

  it("кнопки лендинга и аудитории — по шаблону", () => {
    const count = installGoatCounter();

    reportClick("cta-landing-app");
    reportClick("cta-gallery-mermaid");
    reportClick("cta-scenario-developers");
    reportClick("audience-students");

    expect(sentPaths(count)).toEqual([
      "click/cta-landing-app",
      "click/cta-gallery-mermaid",
      "click/cta-scenario-developers",
      "click/audience-students",
    ]);
  });

  it("постороннее значение в отчёт не уходит", () => {
    const count = installGoatCounter();

    reportClick("   ");
    reportClick("https://evil.example");
    reportClick("github/../../x");

    expect(count).not.toHaveBeenCalled();
  });

  it("сайт языка уходит отдельным путём", () => {
    const count = installGoatCounter();

    reportSiteClick("Mermaid.js");

    expect(sentPaths(count)).toEqual(["click/site/mermaid.js"]);
  });
});

describe("open и визард", () => {
  it("открытие диаграммы — только язык", () => {
    const count = installGoatCounter();

    reportOpen("mermaid");
    reportOpen("plantuml");

    expect(sentPaths(count)).toEqual(["open/mermaid", "open/plantuml"]);
  });

  it("визард даёт только wizard/open", () => {
    const count = installGoatCounter();

    reportWizardOpen();
    reportWizardOpen();

    expect(sentPaths(count)).toEqual(["wizard/open", "wizard/open"]);
  });
});

describe("reportSurface", () => {
  it("вид редактора считается один раз за открытие", () => {
    const count = installGoatCounter();

    reportSurface("code");
    reportSurface("builder");
    reportSurface("code");
    reportSurface("ai-chat");

    expect(sentPaths(count)).toEqual([
      "surface/code",
      "surface/builder",
      "surface/ai-chat",
    ]);
  });

  it("чужой вид отбрасывается", () => {
    const count = installGoatCounter();

    reportSurface("preview" as never);

    expect(count).not.toHaveBeenCalled();
  });
});

describe("trackEvent без счётчика", () => {
  it("молчит, если GoatCounter не загрузился", () => {
    expect(() => {
      reportAppVisit("ru");
      reportPage("landing");
      reportClick("github");
      reportSurface("code");
    }).not.toThrow();
  });

  it("передаёт событие с флагом event", () => {
    const count = installGoatCounter();

    trackEvent("page/landing");

    expect(count).toHaveBeenCalledWith({
      path: "page/landing",
      title: "page/landing",
      event: true,
    });
  });
});
