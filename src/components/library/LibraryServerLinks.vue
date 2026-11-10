<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useLocale } from "@/composables/useLocale";
import type { LayoutEngine } from "@/constants";
import {
  LIBRARY_LINK_LIVE_LANGUAGES,
  LIBRARY_LINK_STATS_PERIODS,
  MAX_LIBRARY_LINK_SNAPSHOT_BYTES,
  type DiagramDto,
  type LibraryLinkStatsPeriod,
} from "@/constants/diagram-library";
import { RENDER_MODES } from "@/constants/render-settings";
import { libraryLinkUrl } from "@/router";
import { renderDiagramToSvg } from "@/services/diagram-render";
import {
  createLibraryLink,
  deleteLibraryLink,
  fetchLibraryLinkStats,
  fetchLibraryLinks,
  saveLibraryLinkSnapshot,
  type LibraryLinkDto,
  type LibraryLinkStats,
} from "@/services/library/api/library-links";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";

const props = defineProps<{
  diagram: DiagramDto;
  apiUrl?: string;
  isLocalLibrary: boolean;
  layout: LayoutEngine;
  diagramDarkMode: boolean;
  canWrite: boolean;
}>();

const { t } = useLocale();
const links = ref<LibraryLinkDto[]>([]);
const slug = ref("");
const delivery = ref<"editor" | "view">("editor");
const dataAccess = ref<"online" | "offline">("online");
const viewRender = ref<"snapshot" | "live">("snapshot");
const errorMessage = ref("");
const statusMessage = ref("");
const isSaving = ref(false);
const openStatsId = ref("");
const statsPeriod = ref<LibraryLinkStatsPeriod>(LIBRARY_LINK_STATS_PERIODS[1]);
const stats = ref<LibraryLinkStats | null>(null);

const visible = computed(
  () => !props.isLocalLibrary && Boolean(props.apiUrl) && props.canWrite,
);
const format = computed(() =>
  resolveLibraryDiagramFormat(
    props.diagram.source,
    props.diagram.fileName,
    props.diagram.language,
  ),
);
const liveAvailable = computed(() =>
  (LIBRARY_LINK_LIVE_LANGUAGES as readonly string[]).includes(format.value),
);

watch(delivery, (next) => {
  if (next === "view") {
    dataAccess.value = "online";
    if (!liveAvailable.value) {
      viewRender.value = "snapshot";
    }
  }
});

async function loadLinks(): Promise<void> {
  if (!visible.value || !props.apiUrl) {
    links.value = [];
    return;
  }
  try {
    const response = await fetchLibraryLinks(props.diagram.id, props.apiUrl);
    links.value = response.links;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.serverLink.openError");
  }
}

watch(
  () => [props.diagram.id, visible.value, props.apiUrl] as const,
  () => {
    void loadLinks();
  },
  { immediate: true },
);

function linkAddress(link: LibraryLinkDto): string {
  return libraryLinkUrl(window.location.origin, link.username, link.slug);
}

async function onCreate(): Promise<void> {
  if (!props.apiUrl || isSaving.value) {
    return;
  }
  isSaving.value = true;
  errorMessage.value = "";
  statusMessage.value = "";
  let createdId = "";
  try {
    const created = await createLibraryLink(
      props.diagram.id,
      {
        slug: slug.value.trim().toLowerCase(),
        delivery: delivery.value,
        dataAccess: delivery.value === "view" ? "online" : dataAccess.value,
        viewRender: delivery.value === "view" ? viewRender.value : null,
      },
      props.apiUrl,
    );
    createdId = created.link.id;
    if (delivery.value === "view" && viewRender.value === "snapshot") {
      const svg = await renderDiagramToSvg(props.diagram.source, format.value, {
        layout: props.layout,
        dark: props.diagramDarkMode,
        renderMode: RENDER_MODES.offline,
      });
      if (new TextEncoder().encode(svg).byteLength > MAX_LIBRARY_LINK_SNAPSHOT_BYTES) {
        throw new Error(t("library.serverLink.openError"));
      }
      await saveLibraryLinkSnapshot(props.diagram.id, created.link.id, svg, props.apiUrl);
      statusMessage.value = t("library.serverLink.snapshotSaved");
    } else {
      statusMessage.value = t("library.serverLink.created");
    }
    slug.value = "";
    createdId = "";
  } catch (error) {
    if (createdId && props.apiUrl) {
      await deleteLibraryLink(props.diagram.id, createdId, props.apiUrl).catch(() => undefined);
    }
    errorMessage.value =
      error instanceof Error ? error.message : t("library.serverLink.openError");
  } finally {
    isSaving.value = false;
    await loadLinks();
  }
}

async function onCopy(link: LibraryLinkDto): Promise<void> {
  try {
    await navigator.clipboard.writeText(linkAddress(link));
    statusMessage.value = t("library.dataLink.copied");
  } catch {
    errorMessage.value = t("library.dataLink.copyError");
  }
}

async function onDelete(link: LibraryLinkDto): Promise<void> {
  if (!props.apiUrl) {
    return;
  }
  errorMessage.value = "";
  try {
    await deleteLibraryLink(props.diagram.id, link.id, props.apiUrl);
    if (openStatsId.value === link.id) {
      openStatsId.value = "";
      stats.value = null;
    }
    statusMessage.value = t("library.serverLink.deleted");
    await loadLinks();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.serverLink.openError");
  }
}

async function loadStats(linkId: string): Promise<void> {
  if (!props.apiUrl) {
    return;
  }
  const response = await fetchLibraryLinkStats(
    props.diagram.id,
    linkId,
    statsPeriod.value,
    props.apiUrl,
  );
  stats.value = response;
}

async function onToggleStats(link: LibraryLinkDto): Promise<void> {
  if (openStatsId.value === link.id) {
    openStatsId.value = "";
    stats.value = null;
    return;
  }
  openStatsId.value = link.id;
  stats.value = null;
  errorMessage.value = "";
  try {
    await loadStats(link.id);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.serverLink.openError");
  }
}

watch(statsPeriod, () => {
  if (openStatsId.value) {
    void loadStats(openStatsId.value).catch((error: unknown) => {
      errorMessage.value =
        error instanceof Error ? error.message : t("library.serverLink.openError");
    });
  }
});

const statGroups = computed(() => {
  if (!stats.value) {
    return [];
  }
  return [
    { title: t("library.serverLink.countries"), rows: stats.value.countries },
    { title: t("library.serverLink.browsers"), rows: stats.value.browsers },
    { title: t("library.serverLink.systems"), rows: stats.value.systems },
    { title: t("library.serverLink.languages"), rows: stats.value.languages },
    { title: t("library.serverLink.sizes"), rows: stats.value.sizes },
    { title: t("library.serverLink.referrers"), rows: stats.value.referrers },
    { title: t("library.serverLink.campaigns"), rows: stats.value.campaigns },
  ];
});
</script>

<template>
  <section
    v-if="visible"
    class="library-data-link"
    data-testid="library-server-links"
  >
    <h3 class="library-data-link__title">
      {{ t("library.serverLink.sectionTitle") }}
    </h3>
    <p class="library-data-link__note">
      {{ t("library.serverLink.hint") }}
    </p>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.serverLink.slug") }}</span>
      <input
        v-model="slug"
        class="select"
        type="text"
        data-testid="library-server-link-slug"
      >
    </label>
    <fieldset class="library-server-link__choices">
      <legend>{{ t("library.serverLink.delivery") }}</legend>
      <label>
        <input
          v-model="delivery"
          type="radio"
          value="editor"
        >
        {{ t("library.serverLink.deliveryEditor") }}
      </label>
      <label>
        <input
          v-model="delivery"
          type="radio"
          value="view"
        >
        {{ t("library.serverLink.deliveryView") }}
      </label>
    </fieldset>
    <fieldset
      v-if="delivery === 'editor'"
      class="library-server-link__choices"
    >
      <legend>{{ t("library.serverLink.dataAccess") }}</legend>
      <label>
        <input
          v-model="dataAccess"
          type="radio"
          value="online"
        >
        {{ t("library.serverLink.dataOnline") }}
      </label>
      <label>
        <input
          v-model="dataAccess"
          type="radio"
          value="offline"
        >
        {{ t("library.serverLink.dataOffline") }}
      </label>
    </fieldset>
    <fieldset
      v-else
      class="library-server-link__choices"
    >
      <legend>{{ t("library.serverLink.viewRender") }}</legend>
      <label>
        <input
          v-model="viewRender"
          type="radio"
          value="snapshot"
        >
        {{ t("library.serverLink.viewSnapshot") }}
      </label>
      <label>
        <input
          v-model="viewRender"
          type="radio"
          value="live"
          :disabled="!liveAvailable"
        >
        {{ t("library.serverLink.viewLive") }}
      </label>
      <p
        v-if="!liveAvailable"
        class="library-data-link__note"
      >
        {{ t("library.serverLink.viewLiveUnavailable") }}
      </p>
    </fieldset>
    <p
      v-if="errorMessage"
      class="library-data-link__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <p
      v-else-if="statusMessage"
      class="library-data-link__note"
    >
      {{ statusMessage }}
    </p>
    <button
      class="btn btn--primary"
      type="button"
      :disabled="isSaving || !slug.trim()"
      @click="onCreate"
    >
      {{ t("library.serverLink.create") }}
    </button>

    <ul class="library-server-link__list">
      <li
        v-for="link in links"
        :key="link.id"
      >
        <a :href="linkAddress(link)">{{ linkAddress(link) }}</a>
        <span>{{ link.delivery }} · {{ link.dataAccess }}</span>
        <button
          type="button"
          @click="onCopy(link)"
        >
          {{ t("library.serverLink.copy") }}
        </button>
        <button
          type="button"
          @click="onToggleStats(link)"
        >
          {{ openStatsId === link.id ? t("library.serverLink.statsHide") : t("library.serverLink.stats") }}
        </button>
        <button
          type="button"
          @click="onDelete(link)"
        >
          {{ t("library.serverLink.delete") }}
        </button>
        <div
          v-if="openStatsId === link.id && stats"
          class="library-server-link__stats"
        >
          <label>
            <select v-model.number="statsPeriod">
              <option
                v-for="period in LIBRARY_LINK_STATS_PERIODS"
                :key="period"
                :value="period"
              >
                {{ t("library.serverLink.periodDays", { count: period }) }}
              </option>
            </select>
          </label>
          <p>{{ t("library.serverLink.views") }}: {{ stats.views }}</p>
          <p>{{ t("library.serverLink.visitors") }}: {{ stats.visitors }}</p>
          <p v-if="stats.views === 0">
            {{ t("library.serverLink.emptyStats") }}
          </p>
          <ul v-if="stats.days.length">
            <li
              v-for="day in stats.days"
              :key="day.day"
            >
              {{ day.day }} — {{ day.views }} / {{ day.visitors }}
            </li>
          </ul>
          <section
            v-for="group in statGroups"
            :key="group.title"
          >
            <h4>{{ group.title }}</h4>
            <ul>
              <li
                v-for="row in group.rows"
                :key="row.key"
              >
                {{ row.key }} — {{ row.views }}
              </li>
            </ul>
          </section>
        </div>
      </li>
    </ul>
  </section>
</template>
