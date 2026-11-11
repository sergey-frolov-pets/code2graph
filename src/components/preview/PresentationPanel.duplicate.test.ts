// @vitest-environment jsdom

import { computed, createApp, h, nextTick, ref } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import PresentationPanel from "@/components/preview/PresentationPanel.vue";
import { presentationSessionKey, type PresentationSession } from "@/components/preview/presentation-session";
import type { TranslateFn } from "@/locales/types";
import type { PresentationDocument, PresentationTrack } from "@/services/presentation/types";

const translate = ((key: string, params?: Record<string, string | number>) => {
  if (key === "presentation.trackDuplicate") {
    return "Дублировать трек";
  }
  if (key === "presentation.trackCopy") {
    return `${params?.name ?? ""} — копия`;
  }
  if (key === "presentation.trackDefault") {
    return `Трек ${params?.n ?? ""}`;
  }
  return key;
}) as TranslateFn;

function track(name: string): PresentationTrack {
  return {
    id: `track-${name}`,
    name,
    viewpoints: [],
    transitions: [],
    overlays: [],
  };
}

function mountPanel(options: { mode: "view" | "edit"; tracks: PresentationTrack[] }) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const mode = ref(options.mode);
  const onDuplicateTrack = vi.fn();
  const documentRef = ref<PresentationDocument>({
    version: 1,
    activeTrackId: options.tracks[0]?.id ?? "",
    showOverlays: true,
    tracks: options.tracks,
  });
  const viewpointIndex = ref(0);
  const session = {
    enabled: computed(() => true),
    canEdit: computed(() => true),
    panelOpen: computed(() => true),
    mode,
    document: documentRef,
    currentTrack: computed(() => documentRef.value.tracks[0] ?? null),
    hasFrame: computed(() => false),
    holdHeaderDim: vi.fn(),
    onSelectTrack: vi.fn(),
    onCreateTrack: vi.fn(),
    onDeleteTrack: vi.fn(),
    onDuplicateTrack,
    onToggleOverlays: vi.fn(),
    onRenameTrack: vi.fn(),
    onCapture: vi.fn(),
    onUpdateFrame: vi.fn(),
    onDuplicateViewpoint: vi.fn(),
    onMoveViewpoint: vi.fn(),
    onAddEffect: vi.fn(),
    onUpdateEffect: vi.fn(),
    onDuplicateEffect: vi.fn(),
    onMoveEffect: vi.fn(),
    onRemoveEffect: vi.fn(),
    onRemoveViewpoint: vi.fn(),
    onDwellSeconds: vi.fn(),
    onTransitionSeconds: vi.fn(),
    onPathKind: vi.fn(),
    onRemovePoint: vi.fn(),
    onAddOverlay: vi.fn(),
    onChangeOverlay: vi.fn(),
    onRemoveOverlay: vi.fn(),
    selectViewpoint: vi.fn(),
    addPointArmed: ref(false),
    attachTarget: ref("viewpoint"),
    selectedOverlayId: ref<string | null>(null),
    exportingGif: ref(false),
    onExportGif: vi.fn(),
    exportingHtml: ref(false),
    onExportHtml: vi.fn(),
    repeat: ref(false),
    playback: {
      playing: ref(false),
      viewpointIndex,
      togglePlay: vi.fn(),
      step: vi.fn(),
      pause: vi.fn(),
      goToViewpoint: vi.fn(),
    },
  } as unknown as PresentationSession;

  const app = createApp({
    setup() {
      return () => h(PresentationPanel, { t: translate });
    },
  });
  app.provide(presentationSessionKey, session);
  app.mount(host);

  return {
    host,
    mode,
    onDuplicateTrack,
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

describe("presentation track duplicate button", () => {
  const mounted: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    for (const panel of mounted.splice(0)) {
      panel.unmount();
    }
  });

  it("duplicates the active track from edit mode and stays hidden while viewing", async () => {
    const panel = mountPanel({ mode: "view", tracks: [track("Обход")] });
    mounted.push(panel);
    await nextTick();

    expect(panel.host.querySelector("[aria-label='Дублировать трек']")).toBeNull();

    panel.mode.value = "edit";
    await nextTick();

    const button = panel.host.querySelector("[aria-label='Дублировать трек']");
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect((button as HTMLButtonElement).disabled).toBe(false);
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(panel.onDuplicateTrack).toHaveBeenCalledWith("Обход — копия");
  });

  it("disables duplication when the presentation has no track", async () => {
    const panel = mountPanel({ mode: "edit", tracks: [] });
    mounted.push(panel);
    await nextTick();

    const button = panel.host.querySelector("[aria-label='Дублировать трек']");
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
