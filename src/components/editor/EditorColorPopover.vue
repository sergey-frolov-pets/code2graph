<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useLocale } from "@/composables/useLocale";
import { hexToColorInput, isHexColor } from "@/utils/editor-color-token";

const props = defineProps<{
  hex: string;
  top: number;
  left: number;
}>();

const emit = defineEmits<{
  apply: [hex: string];
  cancel: [];
}>();

const { t } = useLocale();
const draft = ref(props.hex);
const picker = ref(hexToColorInput(props.hex));

watch(
  () => props.hex,
  (next) => {
    draft.value = next;
    picker.value = hexToColorInput(next);
  },
);

function onPickerInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  picker.value = value;
  draft.value = value;
}

function onHexInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value.trim();
  draft.value = value.startsWith("#") || value === "" ? value : `#${value}`;
  if (isHexColor(draft.value)) {
    picker.value = hexToColorInput(draft.value);
  }
}

function apply(): void {
  if (!isHexColor(draft.value)) {
    return;
  }
  emit("apply", draft.value.toLowerCase());
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    emit("cancel");
  }
  if (event.key === "Enter") {
    event.preventDefault();
    apply();
  }
}

function onPointerDownOutside(event: MouseEvent): void {
  const target = event.target as Node | null;
  const root = document.getElementById("editor-color-popover");
  if (root && target && root.contains(target)) {
    return;
  }
  emit("cancel");
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("mousedown", onPointerDownOutside);
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("mousedown", onPointerDownOutside);
});
</script>

<template>
  <div
    id="editor-color-popover"
    class="editor-color-popover"
    :style="{ top: `${top}px`, left: `${left}px` }"
    role="dialog"
    :aria-label="t('editor.colorPicker.title')"
    @mousedown.prevent
  >
    <label class="editor-color-popover__picker">
      <span>{{ t("editor.colorPicker.picker") }}</span>
      <input
        type="color"
        :value="picker"
        :aria-label="t('editor.colorPicker.picker')"
        @input="onPickerInput"
      />
    </label>
    <label class="editor-color-popover__hex">
      <span>{{ t("editor.colorPicker.hex") }}</span>
      <input
        type="text"
        spellcheck="false"
        :value="draft"
        @input="onHexInput"
        @keydown.enter.prevent="apply"
      />
    </label>
    <div class="editor-color-popover__actions">
      <button type="button" class="btn" @click="emit('cancel')">
        {{ t("editor.colorPicker.cancel") }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!isHexColor(draft)"
        @click="apply"
      >
        {{ t("editor.colorPicker.apply") }}
      </button>
    </div>
  </div>
</template>
