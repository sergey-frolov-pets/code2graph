import { getLibraryApiBaseUrl } from "@/config/library-api";
import { isDiagramLanguage } from "@/constants/diagram-library";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import {
  isWizardFavoriteSourceTooLarge,
  WIZARD_FAVORITE_FALLBACK_TITLE,
  type WizardFavoriteError,
} from "@/constants/wizard-favorites";
import { fetchPublicLibraryLink } from "@/services/library/api/library-links";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";

export type LoadedWizardServerFavorite =
  | {
      ok: true;
      title: string;
      source: string;
      format: DiagramFormat;
    }
  | {
      ok: false;
      reason: Extract<WizardFavoriteError, "noApi" | "viewOnly" | "fetch" | "tooLarge">;
    };

export async function loadWizardServerFavorite(
  username: string,
  slug: string,
): Promise<LoadedWizardServerFavorite> {
  if (!getLibraryApiBaseUrl()) {
    return { ok: false, reason: "noApi" };
  }

  try {
    const payload = await fetchPublicLibraryLink(username, slug);
    if (payload.delivery !== "editor") {
      return { ok: false, reason: "viewOnly" };
    }

    const source = payload.diagram.source;
    if (isWizardFavoriteSourceTooLarge(source)) {
      return { ok: false, reason: "tooLarge" };
    }

    const language = isDiagramLanguage(payload.diagram.language)
      ? payload.diagram.language
      : undefined;

    return {
      ok: true,
      title: payload.diagram.title.trim() || WIZARD_FAVORITE_FALLBACK_TITLE,
      source,
      format: resolveLibraryDiagramFormat(source, payload.diagram.fileName, language),
    };
  } catch {
    return { ok: false, reason: "fetch" };
  }
}
