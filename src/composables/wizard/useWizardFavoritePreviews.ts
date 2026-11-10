import { ref, watch, type Ref } from "vue";
import type { LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { RenderMode } from "@/constants/render-settings";

export interface WizardFavoritePreviewItem {
  id: string;
  source: string;
  format: DiagramFormat;
}

const SOURCE_HASH_MULTIPLIER = 33;

const previewCache = new Map<string, string>();

export function useWizardFavoritePreviews(
  items: Ref<readonly WizardFavoritePreviewItem[]>,
  layout: Ref<LayoutEngine>,
  renderMode: Ref<RenderMode>,
  diagramDarkMode: Ref<boolean>,
): { previews: Ref<Record<string, string>> } {
  const previews = ref<Record<string, string>>({});
  let generation = 0;

  async function renderAll(): Promise<void> {
    const ticket = generation + 1;
    generation = ticket;
    const next: Record<string, string> = {};

    for (const item of items.value) {
      if (!item.source.trim()) {
        continue;
      }

      const key = previewCacheKey(
        item,
        layout.value,
        renderMode.value,
        diagramDarkMode.value,
      );
      const cached = previewCache.get(key);
      if (cached) {
        next[item.id] = cached;
        continue;
      }

      try {
        const { renderDiagramToSvg } = await import("@/services/diagram-render");
        const svg = await renderDiagramToSvg(item.source, item.format, {
          layout: layout.value,
          renderMode: renderMode.value,
          dark: diagramDarkMode.value,
        });
        previewCache.set(key, svg);
        if (ticket !== generation) {
          return;
        }
        next[item.id] = svg;
        previews.value = { ...next };
      } catch {
        // A failed render keeps the title as the preview.
      }
    }

    if (ticket === generation) {
      previews.value = next;
    }
  }

  watch(
    () => [items.value, layout.value, renderMode.value, diagramDarkMode.value] as const,
    () => {
      void renderAll();
    },
    { immediate: true },
  );

  return { previews };
}

function previewCacheKey(
  item: WizardFavoritePreviewItem,
  layout: LayoutEngine,
  renderMode: RenderMode,
  diagramDarkMode: boolean,
): string {
  return [
    item.format,
    layout,
    renderMode,
    diagramDarkMode ? "dark" : "light",
    sourceHash(item.source),
  ].join(":");
}

function sourceHash(source: string): string {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = Math.imul(hash, SOURCE_HASH_MULTIPLIER) + source.charCodeAt(index);
  }
  return String(hash);
}
