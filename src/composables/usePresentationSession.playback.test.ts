// @vitest-environment jsdom

import { createApp, defineComponent, nextTick, ref } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { usePresentationSession } from "@/composables/usePresentationSession";
import type { CameraFrame } from "@/services/presentation/types";

const FRAME: CameraFrame = { anchorX: 0.2, anchorY: 0.3, scale: 1 };
const TRACK_NAME = "Обход";

function mountSession() {
  const source = ref<string | undefined>("@startuml\n@enduml\n");
  const format = ref<DiagramFormat | undefined>("plantuml");
  const canEdit = ref(true);
  const host = document.createElement("div");
  document.body.appendChild(host);
  let session!: ReturnType<typeof usePresentationSession>;

  const app = createApp(
    defineComponent({
      setup() {
        session = usePresentationSession({
          source,
          format,
          canEdit,
          readFrame: () => FRAME,
          setFrame: () => {},
          setLocked: () => {},
          onSource: (value) => {
            source.value = value;
          },
          getGifContext: () => null,
        });
        return () => null;
      },
    }),
  );
  app.mount(host);

  return {
    get session() {
      return session;
    },
    unmount() {
      app.unmount();
      host.remove();
    },
  };
}

async function startEditableTour(
  session: ReturnType<typeof usePresentationSession>,
): Promise<void> {
  session.onCreateTrack(TRACK_NAME);
  session.onCapture();
  await nextTick();
  session.panelOpen.value = true;
  session.mode.value = "edit";
}

describe("presentation playback chrome", () => {
  const mounted: Array<{ unmount: () => void }> = [];

  afterEach(() => {
    for (const view of mounted.splice(0)) {
      view.unmount();
    }
  });

  it("collapses the panel when playback starts and leaves it collapsed after pause", async () => {
    const view = mountSession();
    mounted.push(view);
    await startEditableTour(view.session);
    expect(view.session.arranging.value).toBe(true);

    view.session.playback.togglePlay();
    await nextTick();

    expect(view.session.playback.playing.value).toBe(true);
    expect(view.session.panelOpen.value).toBe(false);
    expect(view.session.arranging.value).toBe(false);

    view.session.playback.pause();
    await nextTick();

    expect(view.session.panelOpen.value).toBe(false);
    expect(view.session.arranging.value).toBe(false);
  });

  it("keeps transition lines hidden while playing even if the panel is opened again", async () => {
    const view = mountSession();
    mounted.push(view);
    await startEditableTour(view.session);

    view.session.playback.togglePlay();
    await nextTick();
    view.session.panelOpen.value = true;
    await nextTick();

    expect(view.session.playback.playing.value).toBe(true);
    expect(view.session.arranging.value).toBe(false);
    expect(view.session.editing.value).toBe(false);

    view.session.playback.pause();
    await nextTick();

    expect(view.session.arranging.value).toBe(true);
    expect(view.session.editing.value).toBe(true);
  });
});
