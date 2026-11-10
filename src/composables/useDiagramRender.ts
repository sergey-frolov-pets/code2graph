import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { RENDER_DEBOUNCE_MS, type LayoutEngine } from "@/constants";
import {
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import { getLanguageModule } from "@/languages/registry";
import {
  isOnlineRenderMode,
  RENDER_MODES,
  type RenderMode,
} from "@/constants/render-settings";
import { useAppDialog } from "@/composables/useAppDialog";
import type { AppLocale } from "@/constants/i18n";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import {
  bootFormatEngine,
  getFormatHandler,
  isFormatEngineReady,
  renderDiagram,
} from "@/formats";
import { buildDiagramIrForCache } from "@/services/conversion/pipeline/convert-diagram";
import type { TranslateFn } from "@/locales/types";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";
import {
  probeMermaidInkConnectivity,
  resetMermaidInkConnectivity,
} from "@/services/mermaid/mermaid-online";
import { didLastMermaidRenderUseOnlineInk } from "@/services/mermaid/mermaid-engine";
import {
  probePlantUmlServerConnectivity,
  resetPlantUmlServerConnectivity,
} from "@/services/plantuml/plantuml-online";
import { didLastPlantUmlRenderUseOnlineServer } from "@/services/plantuml/plantuml-engine";
import { isFileProtocol } from "@/pwa/installPromptState";
import { stripPresentationBlock } from "@/services/presentation/codec";
import { onlineRenderSiteFor } from "@/utils/online-render-site";

export interface UseDiagramRenderOptions {
  source: Ref<string>;
  renderSource?: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  renderMode: Ref<RenderMode>;
  /** Оформление из окна «Внешний вид» (фон, текст, шрифт). */
  diagramBackground?: Ref<string>;
  diagramTextColor?: Ref<string>;
  diagramFontFamily?: Ref<string>;
  diagramFontWeight?: Ref<string>;
  diagramFontStyle?: Ref<string>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
  onPersist?: () => void;
}

export function useDiagramRender(options: UseDiagramRenderOptions) {
  const {
    source,
    renderSource,
    diagramFormat,
    layout,
    diagramDarkMode,
    renderMode,
    diagramBackground,
    diagramTextColor,
    diagramFontFamily,
    diagramFontWeight,
    diagramFontStyle,
    locale,
    t,
    onPersist,
  } = options;

  const svg = ref("");
  const error = ref("");
  const isRendering = ref(false);
  const engineReady = ref(false);
  const engineStatus = ref(t("app.engineLoading"));
  /** Сайт последней успешной разовой онлайн-генерации. Пусто — картинка локальная. */
  const renderedOnlineSite = ref("");
  const { setLastDiagramIr } = useDiagramIrCache();
  const { alert, confirm } = useAppDialog();

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let renderSerial = 0;
  let onlineConfirmOpen = false;
  let onlineRenderInFlight = false;
  let renderDeferred = false;
  /** Снимок входов, для которого на экране лежит разовая онлайн-картинка. */
  let onlineSnapshotKey = "";

  const formatDefinition = computed(() =>
    getDiagramFormatDefinition(diagramFormat.value),
  );

  const usesOnlineRender = computed(
    () =>
      formatDefinition.value.supportsOnlineRender &&
      isOnlineRenderMode(renderMode.value),
  );

  function buildFormatContext(mode: RenderMode = renderMode.value) {
    return {
      layout: layout.value,
      diagramDarkMode: diagramDarkMode.value,
      renderMode: mode,
      diagramBackground: diagramBackground?.value,
      diagramTextColor: diagramTextColor?.value,
      diagramFontFamily: diagramFontFamily?.value,
      diagramFontWeight: diagramFontWeight?.value,
      diagramFontStyle: diagramFontStyle?.value,
    };
  }

  function currentDiagramSource(): string {
    return stripPresentationBlock(renderSource?.value ?? source.value);
  }

  function renderInputKey(): string {
    return JSON.stringify([
      currentDiagramSource(),
      diagramFormat.value,
      layout.value,
      diagramDarkMode.value,
      diagramBackground?.value ?? "",
      diagramTextColor?.value ?? "",
      diagramFontFamily?.value ?? "",
      diagramFontWeight?.value ?? "",
      diagramFontStyle?.value ?? "",
    ]);
  }

  function didAttemptedOnlineRenderSucceed(mode: RenderMode): boolean {
    if (!isOnlineRenderMode(mode)) {
      return false;
    }
    if (diagramFormat.value === "mermaid") {
      return didLastMermaidRenderUseOnlineInk();
    }
    if (diagramFormat.value === "plantuml") {
      return didLastPlantUmlRenderUseOnlineServer();
    }
    return false;
  }

  function resolveOnlineEngineNotReadyMessage(): string {
    if (
      isFileProtocol() &&
      getLanguageModule(diagramFormat.value).onlineProbe === "mermaid"
    ) {
      return t("engine.mermaidOnlineFileProtocol");
    }

    if (isFileProtocol()) {
      return t("engine.onlineFileProtocol");
    }

    return t("app.renderModeOnlineOffline");
  }

  async function updateOnlineEngineStatus(): Promise<void> {
    if (!usesOnlineRender.value) {
      return;
    }

    const probe = getLanguageModule(diagramFormat.value).onlineProbe;

    if (probe === "mermaid") {
      const reachable = await probeMermaidInkConnectivity();
      engineReady.value = true;
      engineStatus.value = reachable
        ? t("app.renderModeOnlineReady")
        : resolveOnlineEngineNotReadyMessage();
      return;
    }

    if (probe === "plantuml") {
      const reachable = await probePlantUmlServerConnectivity();
      engineReady.value = true;
      engineStatus.value = reachable
        ? t("app.renderModeOnlineReady")
        : resolveOnlineEngineNotReadyMessage();
      return;
    }

    engineReady.value = navigator.onLine;
    engineStatus.value = navigator.onLine
      ? t("app.renderModeOnlineReady")
      : resolveOnlineEngineNotReadyMessage();
  }

  function resolveEngineNotReadyMessage(): string {
    if (usesOnlineRender.value) {
      return resolveOnlineEngineNotReadyMessage();
    }

    return t(getLanguageModule(diagramFormat.value).engineNotReadyKey);
  }

  async function renderDiagramView(modeOverride?: RenderMode): Promise<void> {
    const mode = modeOverride ?? renderMode.value;
    const onlineAttempt =
      formatDefinition.value.supportsOnlineRender && isOnlineRenderMode(mode);

    if (
      !onlineAttempt &&
      onlineSnapshotKey !== "" &&
      onlineSnapshotKey === renderInputKey()
    ) {
      return;
    }

    if (!engineReady.value && !onlineAttempt) {
      if (!svg.value && !onlineRenderInFlight) {
        error.value = resolveEngineNotReadyMessage();
      }
      return;
    }

    const serial = ++renderSerial;
    isRendering.value = true;
    error.value = "";

    try {
      const diagramSource = currentDiagramSource();
      const result = await renderDiagram(
        diagramFormat.value,
        diagramSource,
        buildFormatContext(mode),
      );
      if (serial !== renderSerial) {
        return;
      }
      svg.value = result;
      setLastDiagramIr(
        buildDiagramIrForCache(diagramSource, diagramFormat.value, result),
      );
      if (didAttemptedOnlineRenderSucceed(mode)) {
        onlineSnapshotKey = renderInputKey();
        renderedOnlineSite.value =
          onlineRenderSiteFor(diagramFormat.value, diagramSource) ?? "";
      } else {
        onlineSnapshotKey = "";
        renderedOnlineSite.value = "";
      }
      if (
        onlineAttempt &&
        diagramFormat.value === "mermaid" &&
        !didLastMermaidRenderUseOnlineInk()
      ) {
        engineStatus.value = t("engine.mermaidOnlineOfflineFallback");
      }
      if (
        onlineAttempt &&
        diagramFormat.value === "plantuml" &&
        !didLastPlantUmlRenderUseOnlineServer()
      ) {
        engineStatus.value = t("engine.plantumlOnlineOfflineFallback");
      }
    } catch (renderError) {
      if (serial !== renderSerial) {
        return;
      }
      svg.value = "";
      onlineSnapshotKey = "";
      renderedOnlineSite.value = "";
      setLastDiagramIr(null);
      error.value =
        renderError instanceof Error
          ? resolveLocalizedErrorMessage(
              renderError,
              t,
              "app.unknownRenderError",
            )
          : t("app.unknownRenderError");
    } finally {
      if (serial === renderSerial) {
        isRendering.value = false;
      }
    }
  }

  async function renderOnlineOnce(): Promise<void> {
    if (onlineConfirmOpen || isRendering.value) {
      return;
    }

    const site = onlineRenderSiteFor(diagramFormat.value, currentDiagramSource());
    if (!site) {
      return;
    }

    onlineConfirmOpen = true;
    try {
      if (isFileProtocol()) {
        await alert({
          title: t("toolbar.renderOnlineTitle"),
          message: t("engine.onlineFileProtocol"),
        });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        await alert({
          title: t("toolbar.renderOnlineTitle"),
          message: t("app.renderModeOnlineOffline"),
        });
        return;
      }

      const confirmed = await confirm({
        title: t("toolbar.renderOnlineTitle"),
        message: t("toolbar.renderOnlineWarning", { site }),
        confirmLabel: t("toolbar.renderOnlineConfirm"),
        cancelLabel: t("app.cancel"),
      });
      if (!confirmed) {
        return;
      }

      const siteNow = onlineRenderSiteFor(
        diagramFormat.value,
        currentDiagramSource(),
      );
      if (siteNow !== site) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }

      onlineRenderInFlight = true;
      try {
        await renderDiagramView(RENDER_MODES.online);
      } finally {
        onlineRenderInFlight = false;
        if (renderDeferred) {
          renderDeferred = false;
          scheduleRender();
        }
      }
    } finally {
      onlineConfirmOpen = false;
    }
  }

  function scheduleRender(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }

    if (onlineRenderInFlight) {
      renderDeferred = true;
      return;
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      void renderDiagramView();
    }, RENDER_DEBOUNCE_MS);
  }

  function updateEngineStatusLabel(): void {
    if (usesOnlineRender.value) {
      void updateOnlineEngineStatus();
      return;
    }

    engineStatus.value = engineReady.value
      ? t("app.engineReady")
      : t("app.engineLoading");
  }

  function isStaleBoot(expectedFormat: DiagramFormat): boolean {
    return diagramFormat.value !== expectedFormat;
  }

  async function bootOfflineEngine(expectedFormat: DiagramFormat): Promise<void> {
    const handler = getFormatHandler(expectedFormat);

    try {
      await bootFormatEngine(expectedFormat, buildFormatContext());
      if (isStaleBoot(expectedFormat)) {
        return;
      }

      engineReady.value = handler.isEngineReady(buildFormatContext());
      engineStatus.value = engineReady.value
        ? t("app.engineReady")
        : t("app.error");
      scheduleRender();
    } catch (bootError) {
      if (isStaleBoot(expectedFormat)) {
        return;
      }

      engineReady.value = false;
      engineStatus.value = resolveLocalizedErrorMessage(
        bootError,
        t,
        "app.engineLoadError",
      );
      error.value = engineStatus.value;
    }
  }

  async function bootEngine(): Promise<void> {
    const format = diagramFormat.value;
    const definition = getDiagramFormatDefinition(format);

    if (definition.supportsOnlineRender && isOnlineRenderMode(renderMode.value)) {
      await updateOnlineEngineStatus();
      scheduleRender();
      return;
    }

    if (definition.requiresEngineBoot) {
      await bootOfflineEngine(format);
      return;
    }

    engineReady.value = true;
    engineStatus.value = t("app.engineReady");
    scheduleRender();
  }

  async function onNetworkStatusChange(): Promise<void> {
    if (!usesOnlineRender.value) {
      return;
    }

    const probe = getLanguageModule(diagramFormat.value).onlineProbe;
    if (probe === "mermaid") {
      resetMermaidInkConnectivity();
    }

    if (probe === "plantuml") {
      resetPlantUmlServerConnectivity();
    }

    await updateOnlineEngineStatus();
    if (engineReady.value) {
      scheduleRender();
    }
  }

  watch(source, (next, previous) => {
    onPersist?.();
    if (stripPresentationBlock(next) === stripPresentationBlock(previous ?? "")) {
      return;
    }
    scheduleRender();
  });

  watch([layout, diagramDarkMode, renderMode, diagramFormat], () => {
    onPersist?.();
    scheduleRender();
  });

  if (renderSource) {
    watch(renderSource, (next, previous) => {
      if (stripPresentationBlock(next) === stripPresentationBlock(previous ?? "")) {
        return;
      }
      scheduleRender();
    });
  }

  // Оформление меняет только вид — перерисовываем без сброса истории.
  watch(
    [
      diagramBackground ?? ref(""),
      diagramTextColor ?? ref(""),
      diagramFontFamily ?? ref(""),
      diagramFontWeight ?? ref(""),
      diagramFontStyle ?? ref(""),
    ],
    () => {
      onPersist?.();
      scheduleRender();
    },
  );

  watch(locale, () => {
    updateEngineStatusLabel();
  });

  watch(renderMode, () => {
    void bootEngine();
  });

  watch(diagramFormat, () => {
    engineReady.value = isFormatEngineReady(
      diagramFormat.value,
      buildFormatContext(),
    );
    updateEngineStatusLabel();
    void bootEngine();
  });

  if (typeof window !== "undefined") {
    window.addEventListener("online", onNetworkStatusChange);
    window.addEventListener("offline", onNetworkStatusChange);
  }

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onNetworkStatusChange);
      window.removeEventListener("offline", onNetworkStatusChange);
    }
  });

  return {
    svg,
    error,
    isRendering,
    engineReady,
    engineStatus,
    renderedOnlineSite,
    renderDiagram: async () => {
      onlineSnapshotKey = "";
      await renderDiagramView();
    },
    renderOnlineOnce,
    scheduleRender,
    bootEngine,
  };
}
