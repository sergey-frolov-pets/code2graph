import { getLlmProvider } from "@/constants/llm-providers";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLocale } from "@/composables/useLocale";

export type LlmGateFailureReason = "no_consent" | "no_key" | "provider_invalid";

export type LlmGateSuccess = {
  ok: true;
  providerId: string;
  apiKey: string;
};

export type LlmGateFailure = {
  ok: false;
  reason: LlmGateFailureReason;
};

export type LlmGateResult = LlmGateSuccess | LlmGateFailure;

export type LlmGateHandlers = {
  openSettings?: () => void;
};

export function useLlmGate() {
  const { t } = useLocale();
  const { alert, confirm } = useAppDialog();
  const { openLlmKeysGuide } = useLlmKeysGuide();
  const { llmProviderId, llmConsent } = useLlmSettings();
  const { getLlmApiKey, hasLlmApiKey } = useLlmApiKeys();

  async function promptOpenSettings(handlers?: LlmGateHandlers): Promise<void> {
    if (!handlers?.openSettings) {
      return;
    }

    const shouldOpen = await confirm({
      title: t("llm.gate.openSettingsTitle"),
      message: t("llm.gate.openSettingsMessage"),
      confirmLabel: t("llm.gate.openSettingsConfirm"),
      cancelLabel: t("app.cancel"),
    });

    if (shouldOpen) {
      handlers.openSettings();
    }
  }

  async function requireLlmAccess(
    handlers?: LlmGateHandlers,
  ): Promise<LlmGateResult> {
    if (!llmConsent.value) {
      await alert({
        title: t("llm.gate.noConsentTitle"),
        message: t("llm.gate.noConsentMessage"),
        variant: "error",
      });
      await promptOpenSettings(handlers);
      return { ok: false, reason: "no_consent" };
    }

    const providerId = llmProviderId.value;
    const provider = getLlmProvider(providerId);

    if (!provider) {
      await alert({
        title: t("llm.gate.providerInvalidTitle"),
        message: t("llm.gate.providerInvalidMessage"),
        variant: "error",
      });
      return { ok: false, reason: "provider_invalid" };
    }

    if (!hasLlmApiKey(providerId)) {
      openLlmKeysGuide(providerId);
      await alert({
        title: t("llm.gate.noKeyTitle"),
        message: t("llm.gate.noKeyMessage"),
        variant: "error",
      });
      await promptOpenSettings(handlers);
      return { ok: false, reason: "no_key" };
    }

    const apiKey = getLlmApiKey(providerId);
    if (!apiKey) {
      return { ok: false, reason: "no_key" };
    }

    return {
      ok: true,
      providerId,
      apiKey,
    };
  }

  return {
    requireLlmAccess,
  };
}
