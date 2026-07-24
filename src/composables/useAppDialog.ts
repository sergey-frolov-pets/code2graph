import { ref } from "vue";

export type DialogVariant = "default" | "danger";

export type ConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
};

export type PromptDialogOptions = {
  title: string;
  message?: string;
  value?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
};

export type AlertDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "default" | "error";
};

type DialogState =
  | {
      type: "confirm";
      options: ConfirmDialogOptions;
      resolve: (value: boolean) => void;
    }
  | {
      type: "prompt";
      options: PromptDialogOptions;
      value: string;
      resolve: (value: string | null) => void;
    }
  | {
      type: "alert";
      options: AlertDialogOptions;
      resolve: () => void;
    };

const DEFAULT_CANCEL_LABEL_KEY = "app.cancel";
const DEFAULT_CONFIRM_LABEL_KEY = "app.ok";

const dialogState = ref<DialogState | null>(null);

function closeDialog(): void {
  dialogState.value = null;
}

function dismissActiveDialog(): void {
  const activeDialog = dialogState.value;
  if (!activeDialog) {
    return;
  }

  if (activeDialog.type === "confirm") {
    activeDialog.resolve(false);
    return;
  }

  if (activeDialog.type === "prompt") {
    activeDialog.resolve(null);
    return;
  }

  activeDialog.resolve();
}

export function useAppDialog() {
  function confirm(options: ConfirmDialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      dismissActiveDialog();
      dialogState.value = {
        type: "confirm",
        options,
        resolve: (value) => {
          closeDialog();
          resolve(value);
        },
      };
    });
  }

  function prompt(options: PromptDialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      dismissActiveDialog();
      dialogState.value = {
        type: "prompt",
        options,
        value: options.value ?? "",
        resolve: (value) => {
          closeDialog();
          resolve(value);
        },
      };
    });
  }

  function alert(options: AlertDialogOptions): Promise<void> {
    return new Promise((resolve) => {
      dismissActiveDialog();
      dialogState.value = {
        type: "alert",
        options,
        resolve: () => {
          closeDialog();
          resolve();
        },
      };
    });
  }

  function cancelDialog(): void {
    const dialog = dialogState.value;
    if (!dialog) {
      return;
    }

    if (dialog.type === "confirm") {
      dialog.resolve(false);
      return;
    }

    if (dialog.type === "prompt") {
      dialog.resolve(null);
      return;
    }

    dialog.resolve();
  }

  function submitDialog(value?: string): void {
    const dialog = dialogState.value;
    if (!dialog) {
      return;
    }

    if (dialog.type === "confirm") {
      dialog.resolve(true);
      return;
    }

    if (dialog.type === "prompt") {
      dialog.resolve(value ?? dialog.value);
      return;
    }

    dialog.resolve();
  }

  function updatePromptValue(value: string): void {
    if (dialogState.value?.type === "prompt") {
      dialogState.value.value = value;
    }
  }

  function getCancelLabel(
    dialog: DialogState,
    t: (key: string) => string,
  ): string {
    if (dialog.type === "alert") {
      return t(DEFAULT_CANCEL_LABEL_KEY);
    }

    return dialog.options.cancelLabel ?? t(DEFAULT_CANCEL_LABEL_KEY);
  }

  function getConfirmLabel(
    dialog: DialogState,
    t: (key: string) => string,
  ): string {
    if (dialog.type === "alert") {
      return dialog.options.confirmLabel ?? t(DEFAULT_CONFIRM_LABEL_KEY);
    }

    return dialog.options.confirmLabel ?? t(DEFAULT_CONFIRM_LABEL_KEY);
  }

  return {
    dialogState,
    confirm,
    prompt,
    alert,
    cancelDialog,
    submitDialog,
    updatePromptValue,
    getCancelLabel,
    getConfirmLabel,
  };
}
