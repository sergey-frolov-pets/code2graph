<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

defineProps<{
  title: string;
  open: boolean;
  variant?: "default" | "success" | "error";
  wide?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();

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
      role="presentation"
      @click="onBackdropClick"
    >
      <div
        class="modal"
        :class="{ 'modal--wide': wide }"
        role="dialog"
        :aria-labelledby="`modal-title-${title}`"
        aria-modal="true"
      >
        <header class="modal-header" :class="variant ? `is-${variant}` : ''">
          <h2 :id="`modal-title-${title}`" class="modal-title">{{ title }}</h2>
          <button
            class="modal-close"
            type="button"
            :aria-label="t('modal.closeAria')"
            @click="emit('close')"
          >
            ×
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
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, 0.55);
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
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0 4px;
  min-height: auto;
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
