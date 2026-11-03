<script setup lang="ts">
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  dismiss: [];
}>();

const { t } = useLocale();
</script>

<template>
  <aside v-if="open" class="wizard-onboarding" role="note">
    <div class="wizard-onboarding__content">
      <p class="wizard-onboarding__title">{{ t("llm.wizard.onboardingTitle") }}</p>
      <p class="wizard-onboarding__text">{{ t("llm.wizard.onboardingBody") }}</p>
    </div>
    <IconButton
      :label="t('llm.wizard.onboardingDismiss')"
      extra-class="wizard-onboarding__close"
      @click="emit('dismiss')"
    >
      <ActionIcon name="close" />
    </IconButton>
  </aside>
</template>

<style src="./wizard-modal.css"></style>
