import type { InjectionKey } from "vue";
import type { usePresentationSession } from "@/composables/usePresentationSession";

export type PresentationSession = ReturnType<typeof usePresentationSession>;

export const presentationSessionKey: InjectionKey<PresentationSession> = Symbol(
  "presentation-session",
);
