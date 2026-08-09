import { ref, watch } from "vue";
import type { TranslateFn } from "@/locales/types";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLibraryCredentials } from "@/composables/useLibraryCredentials";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { checkApiHealth } from "@/services/library/api";
import {
  addLibraryProfile,
  getActiveLibraryProfile,
  getActiveLibraryProfileIdRef,
  getLibraryProfilesRef,
  removeLibraryProfile,
  saveActiveProfileCredentials,
  setActiveLibraryProfile,
  updateLibraryProfile,
} from "@/config/library-profiles";
import type { useLlmProxyAvailability } from "@/composables/useLlmProxyAvailability";

type LlmProxyAvailability = ReturnType<typeof useLlmProxyAvailability>;

export function useSettingsLibraryForm(
  t: TranslateFn,
  llmProxy: Pick<LlmProxyAvailability, "refreshLlmProxyAvailability">,
) {
  const { libraryApiUrl, setLibraryApiUrl } = useLibraryApiUrl();
  const {
    libraryApiUsername,
    libraryApiPassword,
    hasCredentials,
    setUsername,
    setPassword,
    clearCredentials,
  } = useLibraryCredentials();
  const { loginWithCredentials } = useLibraryAuth();

  const libraryServerInput = ref(libraryApiUrl.value);
  const libraryUsernameInput = ref(libraryApiUsername.value);
  const libraryPasswordInput = ref("");
  const showLibraryPassword = ref(false);
  const isTestingLibrary = ref(false);
  const libraryTestOk = ref(false);
  const libraryTestMessage = ref("");
  const libraryProfiles = getLibraryProfilesRef();
  const activeLibraryProfileId = getActiveLibraryProfileIdRef();
  const libraryProfileNameInput = ref(getActiveLibraryProfile()?.name ?? "");

  watch(libraryApiUrl, (value) => {
    libraryServerInput.value = value;
  });

  watch(libraryApiUsername, (value) => {
    libraryUsernameInput.value = value;
  });

  function onLibraryServerBlur(): void {
    setLibraryApiUrl(libraryServerInput.value);
    const profile = getActiveLibraryProfile();
    if (profile) {
      updateLibraryProfile(profile.id, { apiUrl: libraryServerInput.value });
    }
  }

  function onLibraryUsernameBlur(): void {
    setUsername(libraryUsernameInput.value);
    const profile = getActiveLibraryProfile();
    if (profile) {
      updateLibraryProfile(profile.id, { username: libraryUsernameInput.value });
    }
  }

  function onLibraryPasswordSave(): void {
    if (libraryPasswordInput.value) {
      setPassword(libraryPasswordInput.value);
      saveActiveProfileCredentials();
      libraryPasswordInput.value = "";
      showLibraryPassword.value = false;
    }
  }

  function onLibraryProfileSelect(profileId: string): void {
    saveActiveProfileCredentials();
    setActiveLibraryProfile(profileId);
    const profile = getActiveLibraryProfile();
    libraryServerInput.value = profile?.apiUrl ?? "";
    libraryUsernameInput.value = profile?.username ?? "";
    libraryProfileNameInput.value = profile?.name ?? "";
    libraryPasswordInput.value = "";
  }

  function onLibraryProfileNameBlur(): void {
    const profile = getActiveLibraryProfile();
    if (!profile) {
      return;
    }
    updateLibraryProfile(profile.id, { name: libraryProfileNameInput.value });
  }

  function onAddLibraryProfile(): void {
    saveActiveProfileCredentials();
    const profile = addLibraryProfile({
      name: t("settings.libraryProfileName"),
      apiUrl: "",
      username: "",
    });
    setActiveLibraryProfile(profile.id);
    libraryServerInput.value = "";
    libraryUsernameInput.value = "";
    libraryProfileNameInput.value = profile.name;
  }

  function onRemoveLibraryProfile(): void {
    const profile = getActiveLibraryProfile();
    if (!profile) {
      return;
    }
    removeLibraryProfile(profile.id);
    const next = getActiveLibraryProfile();
    libraryServerInput.value = next?.apiUrl ?? "";
    libraryUsernameInput.value = next?.username ?? "";
    libraryProfileNameInput.value = next?.name ?? "";
  }

  function onLibraryCredentialsClear(): void {
    clearCredentials();
    libraryUsernameInput.value = "";
    libraryPasswordInput.value = "";
    showLibraryPassword.value = false;
    libraryTestMessage.value = "";
  }

  async function onLibraryTestConnection(): Promise<void> {
    onLibraryServerBlur();
    onLibraryUsernameBlur();
    onLibraryPasswordSave();

    if (!libraryApiUrl.value) {
      libraryTestOk.value = false;
      libraryTestMessage.value = t("settings.libraryTestNoUrl");
      return;
    }

    isTestingLibrary.value = true;
    libraryTestMessage.value = "";

    try {
      const ok = await checkApiHealth();
      if (ok && libraryApiUsername.value && libraryApiPassword.value) {
        try {
          await loginWithCredentials(
            libraryApiUsername.value,
            libraryApiPassword.value,
          );
        } catch {
          libraryTestOk.value = false;
          libraryTestMessage.value = t("settings.libraryLoginFailed");
          return;
        }
      }

      libraryTestOk.value = ok;
      libraryTestMessage.value = ok
        ? t("settings.libraryTestSuccessDetail")
        : t("settings.libraryTestFailedDetail");

      if (ok) {
        await llmProxy.refreshLlmProxyAvailability();
      }
    } catch {
      libraryTestOk.value = false;
      libraryTestMessage.value = t("settings.libraryTestFailedDetail");
    } finally {
      isTestingLibrary.value = false;
    }
  }

  return {
    libraryProfiles,
    activeLibraryProfileId,
    libraryServerInput,
    libraryUsernameInput,
    libraryPasswordInput,
    showLibraryPassword,
    isTestingLibrary,
    libraryTestOk,
    libraryTestMessage,
    libraryProfileNameInput,
    hasCredentials,
    onLibraryServerBlur,
    onLibraryUsernameBlur,
    onLibraryPasswordSave,
    onLibraryProfileSelect,
    onLibraryProfileNameBlur,
    onAddLibraryProfile,
    onRemoveLibraryProfile,
    onLibraryCredentialsClear,
    onLibraryTestConnection,
  };
}
