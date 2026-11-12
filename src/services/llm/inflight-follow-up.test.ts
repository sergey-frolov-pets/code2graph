import { describe, expect, it } from "vitest";
import { decideInflightFollowUp, joinAmendedUserText } from "@/services/llm/inflight-follow-up";

describe("inflight follow-up", () => {
  it("amends a request that has not started answering", () => {
    expect(decideInflightFollowUp({ phase: "waiting", inflightInput: "amend" })).toBe("amend");
  });

  it("queues once the answer has started", () => {
    expect(decideInflightFollowUp({ phase: "streaming", inflightInput: "amend" })).toBe("enqueue");
  });

  it("queues every follow-up when the provider is sequential", () => {
    expect(decideInflightFollowUp({ phase: "waiting", inflightInput: "queue" })).toBe("enqueue");
    expect(decideInflightFollowUp({ phase: "streaming", inflightInput: "queue" })).toBe("enqueue");
  });

  it("joins extra text onto the same user turn", () => {
    expect(joinAmendedUserText("Нарисуй схему", "и добавь базу")).toBe(
      "Нарисуй схему\n\nи добавь базу",
    );
    expect(joinAmendedUserText("  ", "только это")).toBe("только это");
    expect(joinAmendedUserText("уже есть", "  ")).toBe("уже есть");
  });
});