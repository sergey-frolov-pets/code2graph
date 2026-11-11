import { beforeEach, describe, expect, it, vi } from "vitest";
import { isProxy, reactive } from "vue";
import type { AiChatMessage, AiChatSession } from "@/types/ai-chat-session";

const idb = vi.hoisted(() => ({
  put: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
}));

vi.mock("@/storage/idb/idb-core", () => ({
  getAllFromObjectStore: (...args: unknown[]) => idb.getAll(...args),
  runIndexedTransaction: async (
    _dbName: string,
    _dbVersion: number,
    _onUpgrade: unknown,
    storeName: string,
    _mode: string,
    callback: (stores: Record<string, { put: typeof idb.put; delete: typeof idb.delete }>) => unknown,
  ) => callback({ [storeName]: { put: idb.put, delete: idb.delete } }),
}));

import { putAiChatSession } from "@/storage/ai-chat-sessions";
import { createAiChatSession } from "@/utils/ai-chat-session";

describe("putAiChatSession", () => {
  beforeEach(() => {
    idb.put.mockReset();
    idb.delete.mockReset();
    idb.getAll.mockReset();
    idb.getAll.mockResolvedValue([]);
  });

  it("stores a plain clone of a reactive session that IndexedDB can clone", async () => {
    const message: AiChatMessage = {
      id: "message-1",
      role: "assistant",
      content: "Добавил участника",
      createdAt: "2026-03-01T00:00:00.000Z",
      proposal: {
        id: "proposal-1",
        baseSource: "@startuml\n@enduml",
        proposedSource: "@startuml\nAlice -> Bob\n@enduml",
        explanation: "Связал Alice и Bob",
        status: "pending",
      },
      nextSteps: ["Поясни стрелку"],
    };
    const session = reactive(
      createAiChatSession({
        documentKey: "doc-order",
        diagramFormat: "plantuml",
        title: "Сессия заказа",
      }),
    );
    session.messages.push(reactive(message));

    expect(isProxy(session)).toBe(true);
    expect(isProxy(session.messages[0])).toBe(true);

    const storedSession = await putAiChatSession(session);

    expect(storedSession).toBe(session);
    expect(idb.put).toHaveBeenCalledOnce();
    const record = idb.put.mock.calls[0]?.[0] as AiChatSession;
    expect(record).not.toBe(session);
    expect(isProxy(record)).toBe(false);
    expect(isProxy(record.messages[0])).toBe(false);
    expect(structuredClone(record)).toEqual(record);
    expect(record).toEqual({
      id: session.id,
      documentKey: "doc-order",
      title: "Сессия заказа",
      pinned: false,
      intent: "free",
      diagramFormat: "plantuml",
      messages: [message],
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  });
});
