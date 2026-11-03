<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
  "open-regions": [];
}>();

const { t } = useLocale();
</script>

<template>
  <aside v-if="open" class="editor-fold-onboarding" role="note">
    <div class="editor-fold-onboarding__content">
      <p class="editor-fold-onboarding__title">
        {{ t("llm.wizard.foldOnboardingTitle") }}
      </p>
      <p class="editor-fold-onboarding__text">
        {{ t("llm.wizard.foldOnboardingBody") }}
      </p>
    </div>
    <div class="editor-fold-onboarding__actions">
      <button class="btn" type="button" @click="emit('open-regions')">
        {{ t("editor.regions.open") }}
      </button>
      <button class="btn btn-primary" type="button" @click="emit('dismiss')">
        {{ t("llm.wizard.foldOnboardingDismiss") }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.editor-fold-onboarding {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 0 0 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 8%, var(--surface-muted));
}

.editor-fold-onboarding__title {
  margin: 0 0 4px;
  font-size: 0.9rem;
  font-weight: 600;
}

.editor-fold-onboarding__text {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.editor-fold-onboarding__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
