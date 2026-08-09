import { defineAsyncComponent, type Component } from "vue";

/** Modal ids aligned with `useAppModals` open-state refs. */
export const APP_MODAL_IDS = [
  "syntax",
  "versions",
  "library",
  "saveToLibrary",
  "settings",
  "about",
  "patch",
  "syntaxAsk",
  "wizard",
  "convert",
] as const;

export type AppModalId = (typeof APP_MODAL_IDS)[number];

/** Maps modal id to the `is*Open` ref name in `useAppModals`. */
export const APP_MODAL_OPEN_REF: Record<AppModalId, `is${string}Open`> = {
  syntax: "isSyntaxModalOpen",
  versions: "isVersionsModalOpen",
  library: "isLibraryModalOpen",
  saveToLibrary: "isSaveToLibraryModalOpen",
  settings: "isSettingsModalOpen",
  about: "isAboutModalOpen",
  patch: "isPatchModalOpen",
  syntaxAsk: "isSyntaxAskModalOpen",
  wizard: "isWizardModalOpen",
  convert: "isConvertModalOpen",
};

export const APP_MODAL_COMPONENTS: Record<AppModalId, Component> = {
  syntax: defineAsyncComponent(
    () => import("@/components/SyntaxResultModal.vue"),
  ),
  versions: defineAsyncComponent(
    () => import("@/components/DiagramVersionsModal.vue"),
  ),
  library: defineAsyncComponent(
    () => import("@/components/DiagramLibraryModal.vue"),
  ),
  saveToLibrary: defineAsyncComponent(
    () => import("@/components/SaveToLibraryModal.vue"),
  ),
  settings: defineAsyncComponent(
    () => import("@/components/SettingsModal.vue"),
  ),
  about: defineAsyncComponent(() => import("@/components/AboutModal.vue")),
  patch: defineAsyncComponent(() => import("@/components/LlmPatchModal.vue")),
  syntaxAsk: defineAsyncComponent(
    () => import("@/components/LlmSyntaxAskModal.vue"),
  ),
  wizard: defineAsyncComponent(
    () => import("@/components/DiagramWizardModal.vue"),
  ),
  convert: defineAsyncComponent(
    () => import("@/components/ConvertDiagramModal.vue"),
  ),
};

export const LLM_KEYS_GUIDE_MODAL = defineAsyncComponent(
  () => import("@/components/LlmKeysGuideModal.vue"),
);
