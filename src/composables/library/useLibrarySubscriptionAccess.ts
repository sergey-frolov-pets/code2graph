import { ref, type Ref } from "vue";
import type { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import type { useLibraryPreviewFlow } from "@/composables/library/useLibraryPreviewFlow";
import type { BrowseStep } from "@/composables/library/useLibraryBrowseFlow";
import { PENDING_SUBSCRIPTION_STORAGE_KEY } from "@/constants/library-subscription";
import type {
  GrantedSubscriptionDto,
  SubscriptionDto,
} from "@/constants/diagram-library";
import type { TranslateFn } from "@/locales/types";
import {
  fetchSubscriptionAccess,
  fetchSubscriptionAccessDiagram,
  fetchSubscriptionAccessSectionDiagrams,
} from "@/services/library/api/subscriptions";

export interface UseLibrarySubscriptionAccessOptions {
  library: ReturnType<typeof useDiagramLibrary>;
  libraryApiUrl: Ref<string>;
  browseStep: Ref<BrowseStep>;
  uploadError: Ref<string>;
  previewFlow: ReturnType<typeof useLibraryPreviewFlow>;
  resetEditForm: () => void;
  browseDiagramPick: (diagramId: string) => Promise<void>;
  onSectionPick: (sectionId: string | null) => Promise<void>;
  t: TranslateFn;
}

export function useLibrarySubscriptionAccess(
  options: UseLibrarySubscriptionAccessOptions,
) {
  const {
    library,
    libraryApiUrl,
    browseStep,
    uploadError,
    previewFlow,
    resetEditForm,
    browseDiagramPick,
    onSectionPick,
    t,
  } = options;

  const subscriptionBrowseContext = ref<{
    token: string;
    canDownload: boolean;
    readOnly: boolean;
  } | null>(null);

  function clearSubscriptionBrowseContext(): void {
    subscriptionBrowseContext.value = null;
  }

  function consumePendingSubscriptionToken(): string | null {
    const pending = sessionStorage.getItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
    if (!pending) {
      return null;
    }

    sessionStorage.removeItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
    return pending;
  }

  async function handleIncomingSubscriptionToken(token: string): Promise<void> {
    try {
      const payload = await fetchSubscriptionAccess(token, libraryApiUrl.value);
      subscriptionBrowseContext.value = {
        token,
        canDownload: payload.canDownload,
        readOnly: payload.readOnly,
      };

      if (payload.primaryTarget?.type === "diagram") {
        const preview = await fetchSubscriptionAccessDiagram(
          token,
          payload.primaryTarget.id,
          libraryApiUrl.value,
        );
        library.selectedDiagram.value = preview.diagram;
        browseStep.value = "detail";
        return;
      }

      if (payload.primaryTarget?.type === "section") {
        uploadError.value = t("library.subscriptionSectionHint", {
          title: payload.subscription.title,
        });
        library.selectedSectionId.value = payload.primaryTarget.id;
        const sectionPayload = await fetchSubscriptionAccessSectionDiagrams(
          token,
          payload.primaryTarget.id,
          libraryApiUrl.value,
        );
        library.diagrams.value = sectionPayload.diagrams;
        browseStep.value = "diagrams";
        return;
      }

      browseStep.value = "subscriptions";
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.subscriptionOpenError");
    }
  }

  async function onOpenSubscriptionTarget(payload: {
    type: "section" | "diagram";
    id: string;
    subscription?: GrantedSubscriptionDto | SubscriptionDto;
  }): Promise<void> {
    clearSubscriptionBrowseContext();
    if (payload.type === "diagram") {
      await browseDiagramPick(payload.id);
      return;
    }

    await onSectionPick(payload.id);
  }

  async function openSubscriptionDiagramPreviewIfActive(
    diagramId: string,
  ): Promise<boolean> {
    if (!subscriptionBrowseContext.value) {
      return false;
    }

    try {
      await previewFlow.openSubscriptionDiagramPreview(
        subscriptionBrowseContext.value.token,
        diagramId,
      );
    } catch (error) {
      uploadError.value =
        error instanceof Error
          ? error.message
          : t("library.subscriptionOpenError");
    }

    return true;
  }

  function handleSubscriptionGoBack(): boolean {
    if (browseStep.value === "diagrams" && subscriptionBrowseContext.value) {
      clearSubscriptionBrowseContext();
      browseStep.value = "sections";
      resetEditForm();
      void library.refresh();
      return true;
    }

    if (browseStep.value === "detail" && subscriptionBrowseContext.value) {
      browseStep.value = "diagrams";
      resetEditForm();
      return true;
    }

    return false;
  }

  return {
    subscriptionBrowseContext,
    clearSubscriptionBrowseContext,
    consumePendingSubscriptionToken,
    handleIncomingSubscriptionToken,
    onOpenSubscriptionTarget,
    openSubscriptionDiagramPreviewIfActive,
    handleSubscriptionGoBack,
  };
}
