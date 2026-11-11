import { describe, expect, it } from "vitest";
import type { AiChatSession } from "@/types/ai-chat-session";
import {
  buildAiChatShareSnapshot,
  buildAiChatTranscriptMarkdown,
  deriveAiChatSessionTitle,
  filterAiChatSessions,
  findSecretLikeFragments,
  isSameAiChatDocument,
  sortAiChatSessions,
} from "@/utils/ai-chat-session";

function session(partial: Partial<AiChatSession>): AiChatSession {
  return {
    id: partial.id ?? "s1",
    documentKey: "doc",
    title: partial.title ?? "Сессия",
    pinned: partial.pinned ?? false,
    intent: "free",
    diagramFormat: "plantuml",
    messages: partial.messages ?? [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("ai-chat-session utils", () => {
  it("treats a language switch as the same diagram document", () => {
    expect(isSameAiChatDocument("diagram.puml", "diagram.mmd")).toBe(true);
    expect(isSameAiChatDocument("orders.puml", "notes.puml")).toBe(false);
    expect(isSameAiChatDocument("", "diagram.puml")).toBe(false);
  });

  it("derives a truncated single-line title from the first message", () => {
    expect(deriveAiChatSessionTitle("  Добавь\n оплату   картой ")).toBe(
      "Добавь оплату картой",
    );
    expect(deriveAiChatSessionTitle("а".repeat(100))).toHaveLength(60);
    expect(deriveAiChatSessionTitle("   ")).toBe("");
  });

  it("sorts pinned sessions first, then by updatedAt desc", () => {
    const sorted = sortAiChatSessions([
      session({ id: "old", updatedAt: "2026-01-01T00:00:00.000Z" }),
      session({ id: "pinned", pinned: true, updatedAt: "2025-01-01T00:00:00.000Z" }),
      session({ id: "new", updatedAt: "2026-02-01T00:00:00.000Z" }),
    ]);
    expect(sorted.map((entry) => entry.id)).toEqual(["pinned", "new", "old"]);
  });

  it("filters sessions by title and message text", () => {
    const sessions = [
      session({ id: "a", title: "Оплата" }),
      session({
        id: "b",
        title: "Доставка",
        messages: [
          {
            id: "m1",
            role: "user",
            content: "Добавь возврат средств",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    ];
    expect(filterAiChatSessions(sessions, "возврат").map((s) => s.id)).toEqual(["b"]);
    expect(filterAiChatSessions(sessions, "оплата").map((s) => s.id)).toEqual(["a"]);
    expect(filterAiChatSessions(sessions, "")).toHaveLength(2);
  });

  it("builds a markdown transcript including proposal source", () => {
    const markdown = buildAiChatTranscriptMarkdown(
      session({
        title: "Диаграмма заказа",
        messages: [
          {
            id: "m1",
            role: "assistant",
            content: "Готово",
            createdAt: "2026-01-01T00:00:00.000Z",
            proposal: {
              id: "p1",
              baseSource: "",
              proposedSource: "@startuml\n@enduml",
              explanation: "Создал",
              status: "applied",
            },
          },
        ],
      }),
      { user: "Вы", assistant: "AI" },
    );
    expect(markdown).toContain("# Диаграмма заказа");
    expect(markdown).toContain("@startuml");
  });

  it("builds a share snapshot without proposal internals", () => {
    const snapshot = buildAiChatShareSnapshot(
      session({ title: "Снимок" }),
      "@startuml\n@enduml",
    );
    expect(snapshot.kind).toBe("ai-chat-session");
    expect(snapshot.source).toContain("@startuml");
  });

  it("flags secret-like fragments but not plain diagram text", () => {
    expect(findSecretLikeFragments("api_key = abc123")).toHaveLength(1);
    expect(findSecretLikeFragments("Alice -> Bob : Привет")).toEqual([]);
  });
});
