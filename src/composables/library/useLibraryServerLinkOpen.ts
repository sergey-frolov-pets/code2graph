import { ref, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { isDiagramLanguage } from "@/constants/diagram-library";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import type { TranslateFn } from "@/locales/types";
import { parseAppRoute } from "@/router";
import {
  DATA_LINK_DEFAULT_RANGE,
} from "@/services/local-data-link/constants";
import { parseDataLinkMarker } from "@/services/local-data-link/source-marker";
import {
  fetchPublicLibraryLink,
  recordLibraryLinkHit,
} from "@/services/library/api/library-links";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";

export interface LibraryServerLinkOpenUi {
  mode: Ref<"idle" | "view" | "error">;
  viewSvg: Ref<string>;
  errorMessage: Ref<string>;
  openFromLocation: () => Promise<void>;
}

export function createLibraryServerLinkOpen(options: {
  t: TranslateFn;
  onFileLoaded: (payload: {
    content: string;
    fileName: string;
    format?: DiagramFormat;
    diagramId?: string;
  }) => void;
  openOfflineChooser: (diagram: {
    id: string;
    source: string;
    fileName: string;
    language: string;
    sheetRange: string;
    untilEmptyRow: boolean;
  }) => Promise<void>;
}): LibraryServerLinkOpenUi {
  const mode = ref<"idle" | "view" | "error">("idle");
  const viewSvg = ref("");
  const errorMessage = ref("");

  async function openFromLocation(): Promise<void> {
    const parsed = parseAppRoute({
      hash: window.location.hash,
      pathname: window.location.pathname,
      search: window.location.search,
    });
    if (
      parsed.name !== "libraryLink" ||
      !parsed.libraryUsername ||
      !parsed.libraryLinkSlug
    ) {
      mode.value = "idle";
      viewSvg.value = "";
      errorMessage.value = "";
      return;
    }

    if (!getLibraryApiBaseUrl()) {
      mode.value = "error";
      viewSvg.value = "";
      errorMessage.value = options.t("library.serverLink.noApi");
      return;
    }

    const username = parsed.libraryUsername;
    const slug = parsed.libraryLinkSlug;
    void recordLibraryLinkHit(username, slug).catch(() => undefined);

    try {
      const payload = await fetchPublicLibraryLink(username, slug);
      if (payload.delivery === "view") {
        mode.value = "view";
        viewSvg.value = payload.svg;
        errorMessage.value = "";
        return;
      }

      mode.value = "idle";
      viewSvg.value = "";
      errorMessage.value = "";
      const diagram = payload.diagram;
      const language = isDiagramLanguage(diagram.language) ? diagram.language : undefined;
      options.onFileLoaded({
        content: diagram.source,
        fileName: diagram.fileName,
        format: resolveLibraryDiagramFormat(diagram.source, diagram.fileName, language),
        diagramId: diagram.id,
      });
      if (payload.dataAccess === "offline") {
        const marker = parseDataLinkMarker(diagram.source);
        await options.openOfflineChooser({
          id: diagram.id,
          source: diagram.source,
          fileName: diagram.fileName,
          language: diagram.language,
          sheetRange: marker?.sheetRange || DATA_LINK_DEFAULT_RANGE,
          untilEmptyRow: marker?.untilEmptyRow ?? false,
        });
      }
    } catch (error) {
      mode.value = "error";
      viewSvg.value = "";
      errorMessage.value =
        error instanceof Error ? error.message : options.t("library.serverLink.openError");
    }
  }

  return { mode, viewSvg, errorMessage, openFromLocation };
}
