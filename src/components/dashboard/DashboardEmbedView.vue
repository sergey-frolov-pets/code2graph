<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { fetchPublicLibraryLink } from "@/services/library/api/library-links";
import {
  dashboardCacheFresh,
  readDashboardSvgCache,
  writeDashboardSvgCache,
} from "@/services/dashboard/cache";
import { composeDashboardSvg, loadDashboardDiagram } from "@/services/dashboard/compose";
import { parseDashboard } from "@/services/mermaid/ext/engines/dashboard";
import { refreshDashboardZoneSources } from "@/services/dashboard/refresh";
import type { DashboardZoneSource } from "@/services/dashboard/refresh";

const { route } = useAppRouter();
const { t } = useLocale();
const svg = ref("");
const errorMessage = ref("");
const busy = ref(false);
let timer = 0;

function clearTimer(): void {
  if (timer) window.clearTimeout(timer);
  timer = 0;
}

async function zoneSourcesFor(
  ids: { id: string; source: string; fileName: string; language: string }[],
): Promise<DashboardZoneSource[]> {
  return ids.map((zone) => ({
    id: zone.id,
    source: zone.source,
    fileName: zone.fileName,
    language: zone.language,
  }));
}

async function show(force: boolean): Promise<void> {
  clearTimer();
  busy.value = true;
  errorMessage.value = "";
  try {
    const current = route.value;
    let diagramId = "";
    let source = "";
    let zones: DashboardZoneSource[] = [];
    if (current.libraryUsername && current.libraryLinkSlug) {
      const payload = await fetchPublicLibraryLink(current.libraryUsername, current.libraryLinkSlug);
      const diagram = payload.delivery === "editor" ? payload.diagram : payload.diagram;
      if (!diagram) {
        svg.value = payload.delivery === "view" ? payload.svg : "";
        return;
      }
      diagramId = diagram.id;
      source = diagram.source;
      zones = await zoneSourcesFor(payload.zones ?? []);
    } else if (current.diagramSlug) {
      const diagram = await loadDashboardDiagram(current.diagramSlug);
      if (!diagram) {
        errorMessage.value = t("library.dashboard.missing");
        return;
      }
      diagramId = diagram.id;
      source = diagram.source;
      const parsed = parseDashboard(source);
      if (parsed.ok && parsed.value) {
        const loaded = [];
        for (const zone of parsed.value.zones) {
          const child = await loadDashboardDiagram(zone.diagramId);
          if (child) loaded.push(child);
        }
        zones = await zoneSourcesFor(loaded);
      }
    } else {
      return;
    }

    const parsed = parseDashboard(source);
    if (!parsed.ok || !parsed.value) {
      errorMessage.value = parsed.errors[0]?.message ?? t("library.dashboard.parseError");
      return;
    }
    const cached = readDashboardSvgCache(diagramId);
    if (!force && dashboardCacheFresh(cached, parsed.value.refreshMs)) {
      svg.value = cached!.svg;
      arm(parsed.value.refreshMs, cached!.at);
      return;
    }
    const refreshed = await refreshDashboardZoneSources(zones);
    const composed = await composeDashboardSvg(
      source,
      { layout: "elk", diagramDarkMode: false, renderMode: "offline" },
      refreshed.sources,
    );
    if (!composed) {
      errorMessage.value = t("library.dashboard.parseError");
      return;
    }
    const at = Date.now();
    writeDashboardSvgCache(diagramId, composed, at);
    svg.value = composed;
    arm(parsed.value.refreshMs, at);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : t("library.dashboard.parseError");
  } finally {
    busy.value = false;
  }
}

function arm(refreshMs: number | null, at: number): void {
  if (!refreshMs) return;
  timer = window.setTimeout(() => {
    void show(true);
  }, Math.max(0, at + refreshMs - Date.now()));
}

watch(
  () => [route.value.diagramSlug, route.value.libraryUsername, route.value.libraryLinkSlug],
  () => {
    void show(false);
  },
  { immediate: true },
);

onUnmounted(clearTimer);
</script>

<template>
  <main
    id="app-main"
    class="app-main dashboard-embed"
  >
    <p
      v-if="errorMessage"
      class="dashboard-embed__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <div class="dashboard-embed__bar">
      <button
        class="btn"
        type="button"
        :disabled="busy"
        @click="show(true)"
      >
        {{ t("library.dashboard.refreshNow") }}
      </button>
    </div>
    <!-- Картинка собрана этим приложением из диаграмм библиотеки. -->
    <!-- eslint-disable vue/no-v-html -->
    <div v-html="svg" />
    <!-- eslint-enable vue/no-v-html -->
  </main>
</template>

<style scoped>
.dashboard-embed {
  box-sizing: border-box;
  min-height: 100dvh;
  margin: 0;
  padding: max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.dashboard-embed :deep(svg) {
  width: 100%;
  height: auto;
  max-height: calc(100dvh - 56px);
}
.dashboard-embed__bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.dashboard-embed__error {
  color: var(--danger, #b91c1c);
}
</style>
