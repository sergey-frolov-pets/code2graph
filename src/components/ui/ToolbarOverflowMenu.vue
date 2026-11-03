<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import type { ActionIconName } from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";

export interface ToolbarMenuAction {
  id: string;
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  icon?: ActionIconName;
}

export interface ToolbarMenuGroup {
  id: string;
  label: string;
  actions: ToolbarMenuAction[];
}

const props = withDefaults(
  defineProps<{
    label: string;
    groups: ToolbarMenuGroup[];
    icon?: ActionIconName;
  }>(),
  {
    icon: "more",
  },
);

const emit = defineEmits<{
  action: [id: string];
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function close(): void {
  open.value = false;
}

function toggle(event: MouseEvent): void {
  event.stopPropagation();
  open.value = !open.value;
}

function onAction(action: ToolbarMenuAction): void {
  if (action.disabled) {
    return;
  }

  emit("action", action.id);
  close();
}

function onDocumentClick(event: MouseEvent): void {
  if (!open.value || rootRef.value?.contains(event.target as Node)) {
    return;
  }

  close();
}

function onDocumentKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    close();
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKeydown);
}

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onDocumentKeydown);
});
</script>

<template>
  <div ref="rootRef" class="toolbar-overflow">
    <IconButton
      :label="label"
      :pressed="open"
      extra-class="toolbar-overflow__trigger"
      @click="toggle"
    >
      <ActionIcon :name="props.icon" />
    </IconButton>

    <div
      v-if="open"
      class="toolbar-overflow__menu"
      role="menu"
      :aria-label="label"
      @click.stop
    >
      <section
        v-for="group in groups"
        :key="group.id"
        class="toolbar-overflow__group"
      >
        <h3 v-if="group.label" class="toolbar-overflow__group-title">{{ group.label }}</h3>
        <button
          v-for="action in group.actions"
          :key="action.id"
          class="toolbar-overflow__action"
          type="button"
          role="menuitem"
          :disabled="action.disabled"
          :aria-pressed="action.pressed"
          @click="onAction(action)"
        >
          <ActionIcon
            v-if="action.icon"
            :name="action.icon"
            class="toolbar-overflow__action-icon"
          />
          <span>{{ action.label }}</span>
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.toolbar-overflow {
  position: relative;
  flex-shrink: 0;
}

.toolbar-overflow__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: calc(var(--z-tooltip) + 1);
  width: min(280px, 80vw);
  max-height: min(70vh, 420px);
  overflow: auto;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.toolbar-overflow__group + .toolbar-overflow__group {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.toolbar-overflow__group-title {
  margin: 0 0 4px;
  padding: 0 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.toolbar-overflow__action {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: var(--btn-touch, 44px);
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: 0.88rem;
  text-align: left;
  cursor: pointer;
}

.toolbar-overflow__action:hover:not(:disabled) {
  background: var(--surface-muted);
}

.toolbar-overflow__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toolbar-overflow__action-icon {
  flex-shrink: 0;
}
</style>
