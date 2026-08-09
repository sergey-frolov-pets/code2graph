<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useModalStackEntry } from "@/composables/useModalStackEntry";
import { useLocale } from "@/composables/useLocale";

const APP_DIALOG_MODAL_ID = "app-dialog-host";

const {
  dialogState,
  cancelDialog,
  submitDialog,
  updatePromptValue,
  getCancelLabel,
  getConfirmLabel,
} = useAppDialog();

const { t } = useLocale();

const inputRef = ref<HTMLInputElement | null>(null);

const isOpen = computed(() => dialogState.value !== null);

useModalStackEntry(
  APP_DIALOG_MODAL_ID,
  isOpen,
  () => cancelDialog(),
  "default",
);

const title = computed(() => dialogState.value?.options.title ?? "");

const message = computed(() => dialogState.value?.options.message ?? "");

const isPrompt = computed(() => dialogState.value?.type === "prompt");

const isAlert = computed(() => dialogState.value?.type === "alert");

const promptValue = computed({
  get: () =>
    dialogState.value?.type === "prompt" ? dialogState.value.value : "",
  set: (value: string) => {
    updatePromptValue(value);
  },
});

const placeholder = computed(() => {
  if (dialogState.value?.type !== "prompt") {
    return "";
  }

  return dialogState.value.options.placeholder ?? "diagram.puml";
});

const confirmVariant = computed(() => {
  const dialog = dialogState.value;
  if (!dialog) {
    return "default";
  }

  if (dialog.type === "alert") {
    return dialog.options.variant === "error" ? "danger" : "default";
  }

  if (dialog.type === "confirm") {
    return dialog.options.variant === "danger" ? "danger" : "primary";
  }

  return "primary";
});

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    cancelDialog();
  }
}

watch(isOpen, async (open) => {
  if (!open) {
    return;
  }

  await nextTick();
  if (dialogState.value?.type === "prompt") {
    inputRef.value?.focus();
    inputRef.value?.select();
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="app-dialog-backdrop"
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        class="app-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'app-dialog-title' : undefined"
      >
        <header class="app-dialog__header">
          <h2 id="app-dialog-title" class="app-dialog__title">{{ title }}</h2>
        </header>

        <div class="app-dialog__body">
          <p v-if="message" class="app-dialog__message">{{ message }}</p>
          <input
            v-if="isPrompt"
            ref="inputRef"
            v-model="promptValue"
            class="app-dialog__input"
            type="text"
            :placeholder="placeholder"
            autocomplete="off"
            spellcheck="false"
            @keydown.enter.prevent="submitDialog(promptValue)"
          />
        </div>

        <footer class="app-dialog__footer">
          <button
            v-if="!isAlert"
            class="btn app-dialog__btn"
            type="button"
            @click="cancelDialog"
          >
            {{ dialogState ? getCancelLabel(dialogState, t) : t("app.cancel") }}
          </button>
          <button
            class="btn app-dialog__btn"
            :class="{
              'btn-primary': confirmVariant === 'primary',
              'app-dialog__btn--danger': confirmVariant === 'danger',
            }"
            type="button"
            @click="isPrompt ? submitDialog(promptValue) : submitDialog()"
          >
            {{ dialogState ? getConfirmLabel(dialogState, t) : t("app.ok") }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.app-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-dialog);
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
}

.app-dialog {
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.app-dialog__header {
  padding: 12px 14px 0;
}

.app-dialog__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.app-dialog__body {
  padding: 10px 14px 14px;
}

.app-dialog__message {
  margin: 0 0 10px;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.app-dialog__message:last-child {
  margin-bottom: 0;
}

.app-dialog__input {
  box-sizing: border-box;
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.app-dialog__input:focus {
  outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-color: var(--accent);
}

.app-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 14px 12px;
}

.app-dialog__btn {
  min-height: 36px;
  padding: 0 14px;
}

.app-dialog__btn--danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #ffffff;
}

.app-dialog__btn--danger:hover:not(:disabled) {
  filter: brightness(1.05);
}
</style>
