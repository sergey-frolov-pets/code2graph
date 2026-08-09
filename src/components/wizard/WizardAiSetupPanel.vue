<script setup lang="ts">
import { reactive } from "vue";
import SettingsLlmTab from "@/components/settings/SettingsLlmTab.vue";
import { useSettingsLlmForm } from "@/composables/settings/useSettingsLlmForm";
import { useLocale } from "@/composables/useLocale";
import type { LlmGateFailureReason } from "@/composables/useLlmGate";

const props = defineProps<{
  reason: LlmGateFailureReason | null;
}>();

const emit = defineEmits<{
  retry: [];
}>();

const { t } = useLocale();
const llm = reactive(useSettingsLlmForm(t));

const reasonTitleKey = {
  no_consent: "llm.gate.noConsentTitle",
  no_key: "llm.gate.noKeyTitle",
  no_proxy: "llm.gate.noProxyTitle",
  provider_unavailable: "llm.gate.providerUnavailableTitle",
  provider_invalid: "llm.gate.providerInvalidTitle",
} as const satisfies Record<LlmGateFailureReason, string>;

const reasonMessageKey = {
  no_consent: "llm.gate.noConsentMessage",
  no_key: "llm.gate.noKeyMessage",
  no_proxy: "llm.gate.noProxyMessage",
  provider_unavailable: "llm.gate.providerUnavailableMessage",
  provider_invalid: "llm.gate.providerInvalidMessage",
} as const satisfies Record<LlmGateFailureReason, string>;

function titleForReason(): string {
  if (!props.reason) {
    return t("llm.wizard.aiSetupTitle");
  }

  return t(reasonTitleKey[props.reason]);
}

function messageForReason(): string {
  if (!props.reason) {
    return t("llm.wizard.aiSetupHint");
  }

  return t(reasonMessageKey[props.reason]);
}
</script>

<template>
  <section class="wizard-ai-setup" :aria-label="t('llm.wizard.aiSetupTitle')">
    <h3 class="wizard-ai-setup__title">{{ titleForReason() }}</h3>
    <p class="wizard-ai-setup__hint">{{ messageForReason() }}</p>

    <div class="wizard-ai-setup__form">
      <SettingsLlmTab :llm="llm" />
    </div>

    <div class="wizard-ai-setup__actions">
      <button class="btn btn-primary" type="button" @click="emit('retry')">
        {{ t("llm.wizard.aiSetupRetry") }}
      </button>
    </div>
  </section>
</template>

<style src="./wizard-modal.css"></style>
