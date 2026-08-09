import { computed, ref, type Ref } from "vue";
import { useLibraryTarget } from "@/config/library-target";
import { checkServerAvailability } from "@/services/library/library-sync-service";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";

type DiagramLibrary = ReturnType<typeof useDiagramLibrary>;

export function useLibraryModalTarget(options: {
  library: DiagramLibrary;
  libraryApiUrl: Ref<string>;
  uploadError: Ref<string>;
  showTransientNotice: (message: string) => void;
  onNeedsSetup: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const {
    library,
    libraryApiUrl,
    uploadError,
    showTransientNotice,
    onNeedsSetup,
    t,
  } = options;

  const { libraryTarget, canUseOnline, setLibraryTarget } = useLibraryTarget();
  const { needsSetup, checkLibraryAuthStatus } = useLibraryAuth();

  const onlineCheckFailed = ref(false);
  const isCheckingOnline = ref(false);

  const statusHint = computed(() => {
    if (libraryTarget.value === "online" && !libraryApiUrl.value) {
      return t("library.configureServerHint");
    }
    if (library.isLocalMode.value) {
      return t("library.localModeActive");
    }
    if (library.apiAvailable.value) {
      return t("library.onlineModeActive", { url: libraryApiUrl.value });
    }
    if (library.usingCache.value) {
      return t("library.offlineCache");
    }
    return t("library.offlineCache");
  });

  const isOnlineButtonUnavailable = computed(() => {
    if (libraryTarget.value === "online") {
      return false;
    }
    if (!canUseOnline.value) {
      return true;
    }
    if (!library.isOnline.value) {
      return true;
    }
    return onlineCheckFailed.value;
  });

  const onlineTargetButtonClass = computed(() => {
    const classes = ["library-modes__btn"];
    if (isOnlineButtonUnavailable.value && libraryTarget.value !== "online") {
      classes.push("library-target__btn--unavailable");
    }
    return classes.join(" ");
  });

  function showApiUnavailableNotice(): void {
    if (!libraryApiUrl.value) {
      return;
    }

    showTransientNotice(
      t("library.apiUnavailable", { url: libraryApiUrl.value }),
    );
  }

  function onLocalTargetClick(): void {
    onlineCheckFailed.value = false;
    setLibraryTarget("local");
    void library.refresh();
  }

  async function onOnlineTargetClick(): Promise<void> {
    if (isCheckingOnline.value) {
      return;
    }

    onlineCheckFailed.value = false;
    uploadError.value = "";

    if (!canUseOnline.value) {
      uploadError.value = t("library.configureServerHint");
      onlineCheckFailed.value = true;
      return;
    }

    if (!navigator.onLine) {
      uploadError.value = t("app.offline");
      onlineCheckFailed.value = true;
      return;
    }

    isCheckingOnline.value = true;
    try {
      const available = await checkServerAvailability(libraryApiUrl.value);
      if (!available) {
        showApiUnavailableNotice();
        onlineCheckFailed.value = true;
        return;
      }

      const status = await checkLibraryAuthStatus(libraryApiUrl.value);
      if (status.needsSetup) {
        onNeedsSetup();
        setLibraryTarget("online");
        return;
      }

      setLibraryTarget("online");
      void library.refresh();
    } finally {
      isCheckingOnline.value = false;
    }
  }

  return {
    libraryTarget,
    needsSetup,
    onlineCheckFailed,
    isCheckingOnline,
    statusHint,
    isOnlineButtonUnavailable,
    onlineTargetButtonClass,
    setLibraryTarget,
    showApiUnavailableNotice,
    onLocalTargetClick,
    onOnlineTargetClick,
  };
}
