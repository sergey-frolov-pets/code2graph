import { onUnmounted, ref, watch, type Ref } from "vue";
import { LAYOUT_ENGINES, RENDER_DEBOUNCE_MS, type LayoutEngine } from "@/constants";
import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";
import {
  DUAL_SCREEN_CHANNEL_NAME,
  DUAL_SCREEN_HEARTBEAT_MS,
  DUAL_SCREEN_MISSED_PONG_LIMIT,
  DUAL_SCREEN_WINDOW_NAME,
  createDualScreenSessionId,
  dualScreenPreviewHref,
} from "@/constants/dual-screen";
import { isRenderMode, type RenderMode } from "@/constants/render-settings";

export interface DualScreenPreviewSettings {
  renderMode: RenderMode;
  diagramDarkMode: boolean;
  previewBackground: string;
  diagramTextColor: string;
  diagramFontFamily: string;
  diagramFontWeight: string;
  diagramFontStyle: string;
}

export interface DualScreenState extends DualScreenPreviewSettings {
  source: string;
  diagramFormat: DiagramFormat;
  layout: LayoutEngine;
}

export type DualScreenMessage =
  | { type: "hello"; sessionId: string }
  | { type: "state"; sessionId: string; state: DualScreenState }
  | { type: "preview-settings"; sessionId: string; settings: DualScreenPreviewSettings }
  | { type: "stop"; sessionId: string; from: "editor" | "preview" }
  | { type: "ping"; sessionId: string }
  | { type: "pong"; sessionId: string };

type MessageListener = (message: DualScreenMessage) => void;

export interface DualScreenTransport {
  subscribe(listener: MessageListener): () => void;
  publish(message: DualScreenMessage): void;
  close(): void;
}

export function createBroadcastDualScreenTransport(): DualScreenTransport {
  const channel = new BroadcastChannel(DUAL_SCREEN_CHANNEL_NAME);
  const listeners = new Set<MessageListener>();
  const onMessage = (event: MessageEvent<DualScreenMessage>) => {
    for (const listener of listeners) {
      listener(event.data);
    }
  };
  channel.addEventListener("message", onMessage);
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(message) {
      channel.postMessage(message);
    },
    close() {
      channel.removeEventListener("message", onMessage);
      channel.close();
      listeners.clear();
    },
  };
}

export function isDualScreenState(value: unknown): value is DualScreenState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const state = value as DualScreenState;
  return (
    typeof state.source === "string" &&
    typeof state.diagramFormat === "string" &&
    isDiagramFormat(state.diagramFormat) &&
    typeof state.layout === "string" &&
    Object.prototype.hasOwnProperty.call(LAYOUT_ENGINES, state.layout) &&
    typeof state.renderMode === "string" &&
    isRenderMode(state.renderMode) &&
    typeof state.diagramDarkMode === "boolean" &&
    typeof state.previewBackground === "string" &&
    typeof state.diagramTextColor === "string" &&
    typeof state.diagramFontFamily === "string" &&
    typeof state.diagramFontWeight === "string" &&
    typeof state.diagramFontStyle === "string"
  );
}

function isSessionMessage(value: unknown, sessionId: string): value is DualScreenMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (value as DualScreenMessage).sessionId === sessionId;
}

export interface DualScreenHostConnection {
  notifyState: () => void;
  stop: () => void;
  dispose: () => void;
}

export function connectDualScreenHost(options: {
  sessionId: string;
  transport: DualScreenTransport;
  getState: () => DualScreenState;
  onPreviewSettings: (settings: DualScreenPreviewSettings) => void;
  onPeerLost: () => void;
  heartbeatMs?: number;
  missedPongLimit?: number;
}): DualScreenHostConnection {
  const heartbeatMs = options.heartbeatMs ?? DUAL_SCREEN_HEARTBEAT_MS;
  const missedPongLimit = options.missedPongLimit ?? DUAL_SCREEN_MISSED_PONG_LIMIT;
  let closed = false;
  let peerSeen = false;
  let awaitingPong = false;
  let missedPongs = 0;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  function publish(message: DualScreenMessage): void {
    if (closed) {
      return;
    }
    options.transport.publish(message);
  }

  function teardown(): void {
    if (closed) {
      return;
    }
    closed = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    unsubscribe();
    options.transport.close();
  }

  function losePeer(): void {
    publish({ type: "stop", sessionId: options.sessionId, from: "editor" });
    teardown();
    options.onPeerLost();
  }

  function armHeartbeat(): void {
    if (heartbeatTimer || closed) {
      return;
    }
    heartbeatTimer = setInterval(() => {
      if (awaitingPong) {
        missedPongs += 1;
        if (missedPongs >= missedPongLimit) {
          losePeer();
          return;
        }
      }
      awaitingPong = true;
      publish({ type: "ping", sessionId: options.sessionId });
    }, heartbeatMs);
  }

  const unsubscribe = options.transport.subscribe((message) => {
    if (!isSessionMessage(message, options.sessionId)) {
      return;
    }
    if (message.type === "hello") {
      peerSeen = true;
      publish({ type: "state", sessionId: options.sessionId, state: options.getState() });
      armHeartbeat();
      return;
    }
    if (!peerSeen) {
      return;
    }
    if (message.type === "preview-settings") {
      options.onPreviewSettings(message.settings);
      return;
    }
    if (message.type === "pong") {
      awaitingPong = false;
      missedPongs = 0;
      return;
    }
    if (message.type === "ping") {
      publish({ type: "pong", sessionId: options.sessionId });
      return;
    }
    if (message.type === "stop") {
      teardown();
      options.onPeerLost();
    }
  });

  return {
    notifyState() {
      if (closed || !peerSeen) {
        return;
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        publish({ type: "state", sessionId: options.sessionId, state: options.getState() });
      }, RENDER_DEBOUNCE_MS);
    },
    stop() {
      publish({ type: "stop", sessionId: options.sessionId, from: "editor" });
      teardown();
    },
    dispose: teardown,
  };
}

export interface DualScreenPreviewConnection {
  publishSettings: (settings: DualScreenPreviewSettings) => void;
  stop: () => void;
  dispose: () => void;
}

export function connectDualScreenPreview(options: {
  sessionId: string;
  transport: DualScreenTransport;
  onState: (state: DualScreenState) => void;
  onStop: () => void;
  onEditorGone: () => void;
  heartbeatMs?: number;
  missedPongLimit?: number;
}): DualScreenPreviewConnection {
  const heartbeatMs = options.heartbeatMs ?? DUAL_SCREEN_HEARTBEAT_MS;
  const missedPongLimit = options.missedPongLimit ?? DUAL_SCREEN_MISSED_PONG_LIMIT;
  let closed = false;
  let awaitingPong = false;
  let missedPongs = 0;
  let gotState = false;

  function publish(message: DualScreenMessage): void {
    if (closed) {
      return;
    }
    options.transport.publish(message);
  }

  function teardown(): void {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(heartbeatTimer);
    unsubscribe();
    options.transport.close();
  }

  const unsubscribe = options.transport.subscribe((message) => {
    if (!isSessionMessage(message, options.sessionId)) {
      return;
    }
    if (message.type === "state" && isDualScreenState(message.state)) {
      gotState = true;
      options.onState(message.state);
      return;
    }
    if (message.type === "ping") {
      publish({ type: "pong", sessionId: options.sessionId });
      return;
    }
    if (message.type === "pong") {
      awaitingPong = false;
      missedPongs = 0;
      return;
    }
    if (message.type === "stop") {
      teardown();
      options.onStop();
    }
  });

  publish({ type: "hello", sessionId: options.sessionId });

  const heartbeatTimer = setInterval(() => {
    if (!gotState) {
      publish({ type: "hello", sessionId: options.sessionId });
    }
    if (awaitingPong) {
      missedPongs += 1;
      if (missedPongs >= missedPongLimit) {
        teardown();
        options.onEditorGone();
        return;
      }
    }
    awaitingPong = true;
    publish({ type: "ping", sessionId: options.sessionId });
  }, heartbeatMs);

  return {
    publishSettings(settings) {
      publish({ type: "preview-settings", sessionId: options.sessionId, settings });
    },
    stop() {
      publish({ type: "stop", sessionId: options.sessionId, from: "preview" });
      teardown();
    },
    dispose: teardown,
  };
}

export function useDualScreenHost(options: {
  enabled: Ref<boolean>;
  getState: () => DualScreenState;
  onPreviewSettings: (settings: DualScreenPreviewSettings) => void;
  onBlocked: () => void;
}) {
  const detached = ref(false);
  let connection: DualScreenHostConnection | null = null;
  let previewWindow: Window | null = null;
  let closedWatch: ReturnType<typeof setInterval> | undefined;

  function clearClosedWatch(): void {
    if (closedWatch) {
      clearInterval(closedWatch);
      closedWatch = undefined;
    }
  }

  function finishDetached(): void {
    detached.value = false;
    connection = null;
    previewWindow = null;
    clearClosedWatch();
  }

  function open(): void {
    if (!options.enabled.value) {
      return;
    }
    if (previewWindow && !previewWindow.closed) {
      previewWindow.focus();
      return;
    }
    if (typeof BroadcastChannel === "undefined") {
      options.onBlocked();
      return;
    }

    const sessionId = createDualScreenSessionId();
    connection = connectDualScreenHost({
      sessionId,
      transport: createBroadcastDualScreenTransport(),
      getState: options.getState,
      onPreviewSettings: options.onPreviewSettings,
      onPeerLost: finishDetached,
    });
    const popup = window.open(dualScreenPreviewHref(sessionId), DUAL_SCREEN_WINDOW_NAME);
    if (!popup || popup.closed) {
      connection.dispose();
      connection = null;
      options.onBlocked();
      return;
    }

    previewWindow = popup;
    detached.value = true;
    closedWatch = setInterval(() => {
      if (!previewWindow || !previewWindow.closed) {
        return;
      }
      connection?.stop();
      finishDetached();
    }, DUAL_SCREEN_HEARTBEAT_MS);
  }

  function notifyState(): void {
    connection?.notifyState();
  }

  onUnmounted(() => {
    connection?.stop();
    clearClosedWatch();
  });

  return { detached, open, notifyState };
}

export function useDualScreenPreview(sessionId: Ref<string | null>) {
  const editorGone = ref(false);
  const remoteState = ref<DualScreenState | null>(null);
  let connection: DualScreenPreviewConnection | null = null;

  function disposeConnection(): void {
    connection?.dispose();
    connection = null;
  }

  function start(id: string): void {
    disposeConnection();
    editorGone.value = false;
    remoteState.value = null;
    if (typeof BroadcastChannel === "undefined") {
      editorGone.value = true;
      return;
    }
    connection = connectDualScreenPreview({
      sessionId: id,
      transport: createBroadcastDualScreenTransport(),
      onState(state) {
        remoteState.value = state;
      },
      onStop() {
        window.close();
      },
      onEditorGone() {
        editorGone.value = true;
      },
    });
  }

  watch(
    sessionId,
    (id) => {
      if (id) {
        start(id);
        return;
      }
      disposeConnection();
      editorGone.value = true;
    },
    { immediate: true },
  );

  function publishSettings(settings: DualScreenPreviewSettings): void {
    connection?.publishSettings(settings);
  }

  function stop(): void {
    connection?.stop();
    window.close();
  }

  onUnmounted(() => {
    disposeConnection();
  });

  return { editorGone, remoteState, publishSettings, stop };
}
