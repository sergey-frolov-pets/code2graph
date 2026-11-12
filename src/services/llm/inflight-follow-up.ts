import type { LlmInflightInput } from "@/constants/llm-providers";

export type InflightPhase = "waiting" | "streaming";

export type InflightFollowUp = "amend" | "enqueue";

/** Пока ответа нет и провайдер позволяет, дописываем ход. Иначе сообщение ждёт очереди. */
export function decideInflightFollowUp(input: {
  phase: InflightPhase;
  inflightInput: LlmInflightInput;
}): InflightFollowUp {
  if (input.inflightInput === "queue" || input.phase === "streaming") {
    return "enqueue";
  }
  return "amend";
}

export const AMEND_TEXT_SEPARATOR = "\n\n";

export function joinAmendedUserText(current: string, extra: string): string {
  const base = current.trim();
  const addition = extra.trim();
  if (!base) {
    return addition;
  }
  if (!addition) {
    return base;
  }
  return `${base}${AMEND_TEXT_SEPARATOR}${addition}`;
}
