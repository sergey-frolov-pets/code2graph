import { ref, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { parseAppRoute } from "@/router";
import { recognizeDiagramSource } from "@/services/clipboard-diagram/recognize-diagram-source";
import type { TranslateFn } from "@/locales/types";
import type { AlertDialogOptions } from "@/composables/useAppDialog";

export interface ClipboardDiagramUi {
  promptOpen: Ref<boolean>;
  readFromGesture: () => void;
  closePrompt: () => void;
  openFromLocation: () => Promise<void>;
}

function readClipboardText(): Promise<string | null> {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
    return Promise.resolve(null);
  }
  return navigator.clipboard.readText().then(
    (text) => text,
    () => null,
  );
}

export function createClipboardDiagramUi(options: {
  t: TranslateFn;
  alert: (dialog: AlertDialogOptions) => Promise<void>;
  activeMobilePanel: Ref<"editor" | "preview">;
  applyToNewTab: (source: string, label: string, format: DiagramFormat) => void;
}): ClipboardDiagramUi {
  const promptOpen = ref(false);
  let opened = false;

  async function applyText(text: string): Promise<void> {
    const recognized = recognizeDiagramSource(text);
    if (!recognized) {
      promptOpen.value = false;
      await options.alert({
        title: options.t("app.clipboardDiagramTitle"),
        message: options.t("app.clipboardNotDiagram"),
        variant: "error",
      });
      return;
    }

    promptOpen.value = false;
    options.activeMobilePanel.value = "editor";
    options.applyToNewTab(text, options.t("app.aiNewDiagram"), recognized.format);
  }

  function readFromGesture(): void {
    const pending = readClipboardText();
    void pending.then((text) => {
      if (text === null) {
        return;
      }
      void applyText(text);
    });
  }

  async function openFromLocation(): Promise<void> {
    const parsed = parseAppRoute({
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    });
    if (parsed.name !== "clipboard" || opened) {
      return;
    }
    opened = true;
    const pending = readClipboardText();
    const text = await pending;
    if (text === null) {
      promptOpen.value = true;
      return;
    }
    await applyText(text);
  }

  function closePrompt(): void {
    promptOpen.value = false;
  }

  return {
    promptOpen,
    readFromGesture,
    closePrompt,
    openFromLocation,
  };
}
