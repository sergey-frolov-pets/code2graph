import { ref } from "vue";
import type { ShareLinkDto } from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";
import {
  createDiagramShareLink,
  createSectionShareLink,
} from "@/utils/diagram-api";

export function useLibraryShare() {
  const { t } = useLocale();
  const isSharing = ref(false);
  const lastShareUrl = ref("");
  const shareError = ref("");

  function buildShareUrl(urlPath: string): string {
    const base = new URL(window.location.href);
    base.search = "";
    base.hash = "";
    if (urlPath.startsWith("?")) {
      base.search = urlPath.slice(1);
    } else if (urlPath.startsWith("/")) {
      base.pathname = urlPath;
    } else {
      base.search = urlPath;
    }
    return base.toString();
  }

  async function shareSection(sectionId: string): Promise<ShareLinkDto | null> {
    isSharing.value = true;
    shareError.value = "";
    try {
      const response = await createSectionShareLink(sectionId, { permanent: true });
      lastShareUrl.value = buildShareUrl(response.link.urlPath);
      return response.link;
    } catch (error) {
      shareError.value =
        error instanceof Error ? error.message : t("library.shareError");
      return null;
    } finally {
      isSharing.value = false;
    }
  }

  async function shareDiagram(diagramId: string): Promise<ShareLinkDto | null> {
    isSharing.value = true;
    shareError.value = "";
    try {
      const response = await createDiagramShareLink(diagramId, { permanent: true });
      lastShareUrl.value = buildShareUrl(response.link.urlPath);
      return response.link;
    } catch (error) {
      shareError.value =
        error instanceof Error ? error.message : t("library.shareError");
      return null;
    } finally {
      isSharing.value = false;
    }
  }

  async function copyShareUrl(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }

  return {
    isSharing,
    lastShareUrl,
    shareError,
    shareSection,
    shareDiagram,
    copyShareUrl,
    buildShareUrl,
  };
}
