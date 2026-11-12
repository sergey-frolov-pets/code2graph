import { getLlmProvider, isFreeBuiltinLlmProvider, isLocalLlmProvider } from "@/constants/llm-providers";
import {
  getLlmAccount,
  getPreferredLlmAccount,
  type LlmAccessTarget,
} from "@/config/llm-accounts";
import type { LlmAccountParameters } from "@/config/llm-account-record";
import { isLocalLlmAccount } from "@/config/llm-account-record";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLocale } from "@/composables/useLocale";
import { resolveOpenAiChatEndpoint } from "@/utils/llm-endpoint";
import { isLlmProxyConfigured } from "@/utils/llm-proxy";

export type { LlmAccessTarget };

export type LlmGateFailureReason =
  | "no_consent"
  | "no_key"
  | "no_proxy"
  | "provider_invalid"
  | "provider_unavailable"
  | "local_not_configured";

export type LlmGateSuccess =
  | {
      ok: true;
      mode: "proxy";
      providerId: string;
    }
  | {
      ok: true;
      mode: "byok";
      providerId: string;
      apiKey: string;
      model?: string;
      parameters?: LlmAccountParameters;
    }
  | {
      ok: true;
      mode: "local";
      providerId: string;
      apiKey: string;
      endpoint: string;
      model: string;
      parameters?: LlmAccountParameters;
    };

export type LlmGateFailure = {
  ok: false;
  reason: LlmGateFailureReason;
};

export type LlmGateResult = LlmGateSuccess | LlmGateFailure;

export type LlmGateHandlers = {
  openSettings?: () => void;
  /** When true, skip alert/confirm dialogs (wizard inline setup). */
  silent?: boolean;
};

export function useLlmGate() {
  const { t } = useLocale();
  const { alert, confirm } = useAppDialog();
  const { openLlmKeysGuide } = useLlmKeysGuide();
  const { llmProviderId, llmConsent } = useLlmSettings();
  const { getLlmApiKey, hasLlmApiKey } = useLlmApiKeys();
  const { availableFreeProviderIds, refreshLlmProxyAvailability } =
    useLlmProxyAvailability();

  async function promptOpenSettings(handlers?: LlmGateHandlers): Promise<void> {
    if (handlers?.silent || !handlers?.openSettings) {
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

  function localAccessFromAccount(account: {
    providerId: string;
    apiKey: string;
    baseUrl?: string;
    model?: string;
    parameters?: LlmAccountParameters;
  }): LlmGateResult {
    const endpoint = resolveOpenAiChatEndpoint(account.baseUrl ?? "");
    if (!endpoint || !account.model) {
      return { ok: false, reason: "local_not_configured" };
    }

    return {
      ok: true,
      mode: "local",
      providerId: account.providerId,
      apiKey: account.apiKey,
      endpoint,
      model: account.model,
      ...(account.parameters ? { parameters: account.parameters } : {}),
    };
  }

  async function requireLlmAccess(
    handlers?: LlmGateHandlers,
    target?: LlmAccessTarget,
  ): Promise<LlmGateResult> {
    const silent = handlers?.silent ?? false;

    if (!llmConsent.value) {
      if (!silent) {
        await alert({
          title: t("llm.gate.noConsentTitle"),
          message: t("llm.gate.noConsentMessage"),
          variant: "error",
        });
        await promptOpenSettings(handlers);
      }
      return { ok: false, reason: "no_consent" };
    }

    if (target?.accountId) {
      const account = getLlmAccount(target.accountId);
      if (!account || !account.active) {
        if (!silent) {
          await alert({
            title: t("llm.gate.providerInvalidTitle"),
            message: t("llm.gate.providerInvalidMessage"),
            variant: "error",
          });
        }
        return { ok: false, reason: "provider_invalid" };
      }

      if (isLocalLlmAccount(account)) {
        const localAccess = localAccessFromAccount(account);
        if (!localAccess.ok && !silent) {
          await alert({
            title: t("llm.gate.localMissingTitle"),
            message: t("llm.gate.localMissingMessage"),
            variant: "error",
          });
          await promptOpenSettings(handlers);
        }
        return localAccess;
      }

      if (!account.apiKey) {
        if (!silent) {
          openLlmKeysGuide(account.providerId);
          await alert({
            title: t("llm.gate.noKeyTitle"),
            message: t("llm.gate.noKeyMessage"),
            variant: "error",
          });
          await promptOpenSettings(handlers);
        }
        return { ok: false, reason: "no_key" };
      }

      return {
        ok: true,
        mode: "byok",
        providerId: account.providerId,
        apiKey: account.apiKey,
        ...(account.model ? { model: account.model } : {}),
        ...(account.parameters ? { parameters: account.parameters } : {}),
      };
    }

    const providerId = target?.providerId ?? llmProviderId.value;
    const provider = getLlmProvider(providerId);

    if (!provider) {
      if (!silent) {
        await alert({
          title: t("llm.gate.providerInvalidTitle"),
          message: t("llm.gate.providerInvalidMessage"),
          variant: "error",
        });
      }
      return { ok: false, reason: "provider_invalid" };
    }

    if (isFreeBuiltinLlmProvider(providerId)) {
      if (!isLlmProxyConfigured()) {
        if (!silent) {
          await alert({
            title: t("llm.gate.noProxyTitle"),
            message: t("llm.gate.noProxyMessage"),
            variant: "error",
          });
          await promptOpenSettings(handlers);
        }
        return { ok: false, reason: "no_proxy" };
      }

      await refreshLlmProxyAvailability();

      if (!availableFreeProviderIds.value.includes(providerId)) {
        if (!silent) {
          await alert({
            title: t("llm.gate.providerUnavailableTitle"),
            message: t("llm.gate.providerUnavailableMessage"),
            variant: "error",
          });
          await promptOpenSettings(handlers);
        }
        return { ok: false, reason: "provider_unavailable" };
      }

      return {
        ok: true,
        mode: "proxy",
        providerId,
      };
    }

    if (isLocalLlmProvider(providerId)) {
      const account = getPreferredLlmAccount(providerId);
      const localAccess = account
        ? localAccessFromAccount(account)
        : { ok: false as const, reason: "local_not_configured" as const };
      if (!localAccess.ok && !silent) {
        await alert({
          title: t("llm.gate.localMissingTitle"),
          message: t("llm.gate.localMissingMessage"),
          variant: "error",
        });
        await promptOpenSettings(handlers);
      }
      return localAccess;
    }

    if (!hasLlmApiKey(providerId)) {
      if (!silent) {
        openLlmKeysGuide(providerId);
        await alert({
          title: t("llm.gate.noKeyTitle"),
          message: t("llm.gate.noKeyMessage"),
          variant: "error",
        });
        await promptOpenSettings(handlers);
      }
      return { ok: false, reason: "no_key" };
    }

    const apiKey = getLlmApiKey(providerId);
    if (!apiKey) {
      return { ok: false, reason: "no_key" };
    }

    const account = getPreferredLlmAccount(providerId);
    return {
      ok: true,
      mode: "byok",
      providerId,
      apiKey,
      ...(account?.model ? { model: account.model } : {}),
      ...(account?.parameters ? { parameters: account.parameters } : {}),
    };
  }

  return {
    requireLlmAccess,
  };
}
