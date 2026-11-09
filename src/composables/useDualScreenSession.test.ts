import { afterEach, describe, expect, it, vi } from "vitest";
import { RENDER_DEBOUNCE_MS } from "@/constants";
import { DUAL_SCREEN_HEARTBEAT_MS, DUAL_SCREEN_MISSED_PONG_LIMIT } from "@/constants/dual-screen";
import {
  connectDualScreenHost,
  connectDualScreenPreview,
  type DualScreenMessage,
  type DualScreenState,
  type DualScreenTransport,
} from "@/composables/useDualScreenSession";

function linkTransports(): [DualScreenTransport, DualScreenTransport] {
  const hostListeners = new Set<(message: DualScreenMessage) => void>();
  const previewListeners = new Set<(message: DualScreenMessage) => void>();

  function make(
    own: Set<(message: DualScreenMessage) => void>,
    other: Set<(message: DualScreenMessage) => void>,
  ): DualScreenTransport {
    return {
      subscribe(listener) {
        own.add(listener);
        return () => {
          own.delete(listener);
        };
      },
      publish(message) {
        for (const listener of other) {
          listener(message);
        }
      },
      close() {
        own.clear();
      },
    };
  }

  return [make(hostListeners, previewListeners), make(previewListeners, hostListeners)];
}

function sampleState(source = "@startuml\nA -> B\n@enduml"): DualScreenState {
  return {
    source,
    diagramFormat: "plantuml",
    layout: "smetana",
    renderMode: "offline",
    diagramDarkMode: false,
    previewBackground: "#ffffff",
    diagramTextColor: "",
    diagramFontFamily: "sans",
    diagramFontWeight: "400",
    diagramFontStyle: "normal",
  };
}

describe("dual screen session", () => {
  const openConnections: Array<{ dispose: () => void }> = [];

  afterEach(() => {
    for (const connection of openConnections) {
      connection.dispose();
    }
    openConnections.length = 0;
    vi.useRealTimers();
  });

  it("sends the editor snapshot when the preview tab says hello", () => {
    const [hostTransport, previewTransport] = linkTransports();
    const seen: DualScreenState[] = [];
    const state = sampleState();
    openConnections.push(
      connectDualScreenHost({
        sessionId: "session-a",
        transport: hostTransport,
        getState: () => state,
        onPreviewSettings: vi.fn(),
        onPeerLost: vi.fn(),
      }),
    );
    openConnections.push(
      connectDualScreenPreview({
        sessionId: "session-a",
        transport: previewTransport,
        onState: (next) => {
          seen.push(next);
        },
        onStop: vi.fn(),
        onEditorGone: vi.fn(),
      }),
    );

    expect(seen).toEqual([state]);
  });

  it("repeats hello until the editor tab is listening", () => {
    vi.useFakeTimers();
    const [hostTransport, previewTransport] = linkTransports();
    const seen: DualScreenState[] = [];
    const state = sampleState();
    openConnections.push(
      connectDualScreenPreview({
        sessionId: "session-a",
        transport: previewTransport,
        onState: (next) => {
          seen.push(next);
        },
        onStop: vi.fn(),
        onEditorGone: vi.fn(),
      }),
    );

    vi.advanceTimersByTime(DUAL_SCREEN_HEARTBEAT_MS);
    openConnections.push(
      connectDualScreenHost({
        sessionId: "session-a",
        transport: hostTransport,
        getState: () => state,
        onPreviewSettings: vi.fn(),
        onPeerLost: vi.fn(),
      }),
    );
    vi.advanceTimersByTime(DUAL_SCREEN_HEARTBEAT_MS);

    expect(seen).toEqual([state]);
  });

  it("ignores a hello from another session", () => {
    const [hostTransport, previewTransport] = linkTransports();
    const seen: DualScreenState[] = [];
    openConnections.push(
      connectDualScreenHost({
        sessionId: "session-a",
        transport: hostTransport,
        getState: () => sampleState(),
        onPreviewSettings: vi.fn(),
        onPeerLost: vi.fn(),
      }),
    );
    openConnections.push(
      connectDualScreenPreview({
        sessionId: "session-b",
        transport: previewTransport,
        onState: (next) => {
          seen.push(next);
        },
        onStop: vi.fn(),
        onEditorGone: vi.fn(),
      }),
    );

    expect(seen).toEqual([]);
  });

  it("restores the editor when the preview tab stops the session", () => {
    const [hostTransport, previewTransport] = linkTransports();
    const onPeerLost = vi.fn();
    openConnections.push(
      connectDualScreenHost({
        sessionId: "session-a",
        transport: hostTransport,
        getState: () => sampleState(),
        onPreviewSettings: vi.fn(),
        onPeerLost,
      }),
    );
    const preview = connectDualScreenPreview({
      sessionId: "session-a",
      transport: previewTransport,
      onState: vi.fn(),
      onStop: vi.fn(),
      onEditorGone: vi.fn(),
    });
    openConnections.push(preview);

    preview.stop();

    expect(onPeerLost).toHaveBeenCalledOnce();
  });

  it("ends the session after three missed preview replies", () => {
    vi.useFakeTimers();
    const [hostTransport, previewTransport] = linkTransports();
    const onPeerLost = vi.fn();
    openConnections.push(
      connectDualScreenHost({
        sessionId: "session-a",
        transport: hostTransport,
        getState: () => sampleState(),
        onPreviewSettings: vi.fn(),
        onPeerLost,
      }),
    );
    previewTransport.publish({ type: "hello", sessionId: "session-a" });

    vi.advanceTimersByTime(DUAL_SCREEN_HEARTBEAT_MS * (DUAL_SCREEN_MISSED_PONG_LIMIT + 1));

    expect(onPeerLost).toHaveBeenCalledOnce();
  });

  it("publishes source edits after the render debounce", () => {
    vi.useFakeTimers();
    const [hostTransport, previewTransport] = linkTransports();
    const seen: DualScreenState[] = [];
    let state = sampleState("before");
    const host = connectDualScreenHost({
      sessionId: "session-a",
      transport: hostTransport,
      getState: () => state,
      onPreviewSettings: vi.fn(),
      onPeerLost: vi.fn(),
    });
    openConnections.push(host);
    openConnections.push(
      connectDualScreenPreview({
        sessionId: "session-a",
        transport: previewTransport,
        onState: (next) => {
          seen.push(next);
        },
        onStop: vi.fn(),
        onEditorGone: vi.fn(),
      }),
    );

    state = sampleState("after");
    host.notifyState();
    expect(seen.map((item) => item.source)).toEqual(["before"]);

    vi.advanceTimersByTime(RENDER_DEBOUNCE_MS);

    expect(seen.map((item) => item.source)).toEqual(["before", "after"]);
  });

  it("forwards appearance edits from the preview tab", () => {
    const [hostTransport, previewTransport] = linkTransports();
    const onPreviewSettings = vi.fn();
    openConnections.push(
      connectDualScreenHost({
        sessionId: "session-a",
        transport: hostTransport,
        getState: () => sampleState(),
        onPreviewSettings,
        onPeerLost: vi.fn(),
      }),
    );
    const preview = connectDualScreenPreview({
      sessionId: "session-a",
      transport: previewTransport,
      onState: vi.fn(),
      onStop: vi.fn(),
      onEditorGone: vi.fn(),
    });
    openConnections.push(preview);

    preview.publishSettings({
      renderMode: "online",
      diagramDarkMode: true,
      previewBackground: "#111111",
      diagramTextColor: "#eeeeee",
      diagramFontFamily: "serif",
      diagramFontWeight: "700",
      diagramFontStyle: "italic",
    });

    expect(onPreviewSettings).toHaveBeenCalledWith({
      renderMode: "online",
      diagramDarkMode: true,
      previewBackground: "#111111",
      diagramTextColor: "#eeeeee",
      diagramFontFamily: "serif",
      diagramFontWeight: "700",
      diagramFontStyle: "italic",
    });
  });
});
