import { render, WiremarkError } from "@wiremark/core";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { unwrapWiremarkSource } from "@/utils/wiremark-source";

export interface WiremarkRenderOptions {
  dark: boolean;
}

export function renderWiremarkToSvg(
  source: string,
  options: WiremarkRenderOptions,
): string {
  const unwrapped = unwrapWiremarkSource(source);
  if (!unwrapped.trim()) {
    throw new LocalizedAppError("wiremark.emptySource");
  }

  try {
    const { svg } = render(unwrapped, {
      theme: options.dark ? "dark" : "light",
      interactive: true,
    });

    if (!svg.trim()) {
      throw new LocalizedAppError("wiremark.renderFailed", {
        detail: "empty svg",
      });
    }

    return svg;
  } catch (error) {
    if (error instanceof LocalizedAppError) {
      throw error;
    }

    const detail =
      error instanceof WiremarkError || error instanceof Error
        ? error.message
        : "unknown";
    throw new LocalizedAppError("wiremark.renderFailed", { detail });
  }
}
