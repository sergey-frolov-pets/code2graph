<script setup lang="ts">
import { computed, ref, toRef, useId } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useModalA11y } from "@/composables/useModalA11y";
import { useModalStackEntry } from "@/composables/useModalStackEntry";
import { useModalStack } from "@/composables/useModalStack";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  title: string;
  open: boolean;
  variant?: "default" | "success" | "error";
  wide?: boolean;
  layer?: "default" | "above-library";
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
const titleId = useId();
const modalId = useId();
const dialogRef = ref<HTMLElement | null>(null);
const { getStackZIndex } = useModalStack();

useModalStackEntry(
  modalId,
  toRef(props, "open"),
  () => emit("close"),
  props.layer ?? "default",
);
useModalA11y(toRef(props, "open"), dialogRef);

const modalZIndex = computed(() => getStackZIndex(modalId));

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit("close");
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-backdrop"
      :class="{ 'is-above-library': layer === 'above-library' }"
      :style="modalZIndex ? { zIndex: modalZIndex } : undefined"
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        ref="dialogRef"
        class="modal"
        :class="{ 'modal--wide': wide }"
        role="dialog"
        :aria-labelledby="titleId"
        aria-modal="true"
        tabindex="-1"
      >
        <header class="modal-header" :class="variant ? `is-${variant}` : ''">
          <h2 :id="titleId" class="modal-title">{{ title }}</h2>
          <button
            class="modal-close"
            type="button"
            :aria-label="t('modal.closeAria')"
            @click="emit('close')"
          >
            <ActionIcon name="close" />
          </button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  padding: 16px;
  background: var(--overlay);
}

.modal-backdrop.is-above-library {
  z-index: calc(var(--z-library) + 100);
}

.modal {
  width: min(560px, 100%);
  max-height: min(85vh, 720px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.modal--wide {
  width: min(760px, 100%);
  max-height: min(90vh, 860px);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}

.modal-header.is-success .modal-title {
  color: var(--success);
}

.modal-header.is-error .modal-title {
  color: var(--danger);
}

.modal-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--btn-touch, 44px);
  height: var(--btn-touch, 44px);
  border: 0;
  background: transparent;
  color: var(--text-muted);
  padding: 0;
}

.modal-body {
  padding: 16px;
  overflow: auto;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
  background: var(--surface-muted);
}
</style>
