<script setup lang="ts">
import { computed, ref } from "vue";
import {
  AppWindow,
  BarChart3,
  Bot,
  Code2,
  GraduationCap,
  KeyRound,
  MonitorSmartphone,
  PenLine,
  ShieldCheck,
  WifiOff,
} from "@lucide/vue";
import GithubStarButton from "@/components/site/GithubStarButton.vue";
import SiteFooter from "@/components/site/SiteFooter.vue";
import LandingDiagramBackground from "@/components/site/LandingDiagramBackground.vue";
import LandingGif from "@/components/site/LandingGif.vue";
import LandingInstallButton from "@/components/site/LandingInstallButton.vue";
import LanguageDiagramThumb from "@/components/site/LanguageDiagramThumb.vue";
import McpConnectionTag from "@/components/site/McpConnectionTag.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { trackEvent } from "@/analytics";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { APP_LINKS } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { LocaleKey } from "@/locales/types";
import { LANGUAGE_PRIMERS, primerExample } from "@/languages/primer";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";
import { writeLandingSample } from "@/services/landing-sample";

const { locale, t } = useLocale();
const { navigateTo } = useAppRouter();

const ASSET_BASE = `${import.meta.env.BASE_URL}landing/`;

function openApp(): void {
  trackEvent("cta-landing-app", "Open editor");
  navigateTo("app");
}

function openMcp(): void {
  trackEvent("cta-landing-mcp", "Open MCP page");
  navigateTo("mcp");
}

/** Open the language page: types, keywords, and examples for one format. */
function openLanguage(languageId: DiagramFormat): void {
  trackEvent(`cta-language-${languageId}`, `Open ${languageId} page`);
  navigateTo("language", languageId);
}

/** Open the editor with exactly the diagram the visitor just clicked. */
function openSample(format: DiagramFormat, source: string, label: string, eventName: string): void {
  trackEvent(eventName, label);
  writeLandingSample({ format, source, label });
  navigateTo("app");
}

interface GalleryTile {
  format: DiagramFormat;
  source: string;
  label: string;
  typeTitle: string;
}

const languages = DIAGRAM_LANGUAGE_MODULES.filter((module) => module.site);

const gallery = computed<GalleryTile[]>(() =>
  languages.map((module) => {
    const firstType = LANGUAGE_PRIMERS[module.id].types[0]!;
    return {
      format: module.id,
      source: primerExample(firstType.example, locale.value),
      label: t(module.labelKey),
      typeTitle: t(firstType.titleKey),
    };
  }),
);

function primerSource(format: DiagramFormat, typeId: string): string {
  const primer = LANGUAGE_PRIMERS[format];
  const type = primer.types.find((item) => item.id === typeId) ?? primer.types[0]!;
  return primerExample(type.example, locale.value);
}

type AudienceId = "developers" | "analysts" | "managers" | "students" | "vibecoders";

interface AudienceScene {
  id: AudienceId;
  icon: typeof Code2;
  labelKey: LocaleKey;
  uspKey: LocaleKey;
  format: DiagramFormat;
  typeId: string;
}

const AUDIENCES: readonly AudienceScene[] = [
  { id: "developers", icon: Code2, labelKey: "site.landing.audience.developers", uspKey: "site.landing.usp.developers", format: "mermaid", typeId: "sequence" },
  { id: "analysts", icon: PenLine, labelKey: "site.landing.audience.analysts", uspKey: "site.landing.usp.analysts", format: "mermaid", typeId: "flowchart" },
  { id: "managers", icon: BarChart3, labelKey: "site.landing.audience.managers", uspKey: "site.landing.usp.managers", format: "mermaid", typeId: "gantt" },
  { id: "students", icon: GraduationCap, labelKey: "site.landing.audience.students", uspKey: "site.landing.usp.students", format: "mermaid", typeId: "mindmap" },
  { id: "vibecoders", icon: Bot, labelKey: "site.landing.audience.vibecoders", uspKey: "site.landing.usp.vibecoders", format: "plantuml", typeId: "sequence" },
];

const activeAudienceId = ref<AudienceId>("developers");
const activeAudience = computed(
  () => AUDIENCES.find((item) => item.id === activeAudienceId.value) ?? AUDIENCES[0]!,
);
const activeSource = computed(() =>
  primerSource(activeAudience.value.format, activeAudience.value.typeId),
);

function selectAudience(id: AudienceId): void {
  activeAudienceId.value = id;
  trackEvent(`audience-${id}`, `Audience ${id}`);
}

function tryActiveScenario(): void {
  const audience = activeAudience.value;
  openSample(
    audience.format,
    activeSource.value,
    `${t(audience.labelKey)} · ${t("site.landing.tryScenario")}`,
    `cta-scenario-${audience.id}`,
  );
}
</script>

<template>
  <div class="site-page landing-page">
    <LandingDiagramBackground />
    <SiteHeader landing-nav />

    <main class="landing-main">
      <!-- Screen 1: one living diagram -->
      <section
        class="landing-section landing-hero"
        aria-labelledby="hero-title"
      >
        <div class="landing-hero__text">
          <p class="landing-hero__tagline">
            {{ t("site.tagline") }}
          </p>
          <h1
            id="hero-title"
            class="landing-hero__title"
          >
            {{ t("site.hero.title") }}
          </h1>
          <p class="landing-hero__subtitle">
            {{ t("site.hero.subtitle") }}
          </p>
          <div class="landing-hero__actions">
            <button
              class="btn btn-primary btn-lg"
              type="button"
              @click="openApp"
            >
              {{ t("site.landingCtaApp") }}
            </button>
            <LandingInstallButton size="large" />
            <GithubStarButton />
          </div>
          <p class="landing-hero__platforms">
            <WifiOff aria-hidden="true" />
            <MonitorSmartphone aria-hidden="true" />
            <span>{{ t("site.landing.platformDevices") }}</span>
          </p>
        </div>
        <LandingGif
          :src="`${ASSET_BASE}hero.gif`"
          :poster="`${ASSET_BASE}hero-poster.png`"
          :alt="t('site.landing.heroAlt')"
          eager
        />
      </section>

      <!-- Screen 2: the diagrams speak for themselves -->
      <section
        class="landing-section"
        aria-labelledby="showcase-title"
      >
        <h2
          id="showcase-title"
          class="landing-section__title"
        >
          {{ t("site.landing.showcaseTitle") }}
        </h2>
        <p class="landing-section__hint">
          {{ t("site.landing.showcaseHint") }}
        </p>
        <div class="landing-gallery">
          <article
            v-for="tile in gallery"
            :key="tile.format"
            class="landing-tile"
          >
            <button
              class="landing-tile__preview"
              type="button"
              :aria-label="`${t('site.landing.openInEditor')}: ${tile.label} · ${tile.typeTitle}`"
              @click="openSample(tile.format, tile.source, `${tile.label} · ${tile.typeTitle}`, `cta-gallery-${tile.format}`)"
            >
              <LanguageDiagramThumb
                :format="tile.format"
                :source="tile.source"
                :title="`${tile.label} · ${tile.typeTitle}`"
              />
            </button>
            <p class="landing-tile__caption">
              <button
                class="landing-tile__language"
                type="button"
                @click="openLanguage(tile.format)"
              >
                {{ tile.label }}
              </button>
              <span>· {{ tile.typeTitle }}</span>
            </p>
          </article>
        </div>
        <p class="landing-formats-line">
          {{ t("site.landing.allFormats") }}:
          <button
            v-for="tile in gallery"
            :key="tile.format"
            class="landing-formats-line__badge"
            type="button"
            @click="openLanguage(tile.format)"
          >
            {{ tile.label }}
          </button>
        </p>
      </section>

      <section
        id="formats"
        class="landing-section"
        aria-labelledby="languages-title"
      >
        <h2
          id="languages-title"
          class="landing-section__title"
        >
          {{ t("site.languages.title") }}
        </h2>
        <div class="landing-languages">
          <button
            v-for="module in languages"
            :key="module.id"
            class="landing-language-card"
            type="button"
            @click="openLanguage(module.id)"
          >
            <strong>{{ t(module.labelKey) }}</strong>
            <span>{{ module.site ? t(module.site.purposeKey) : "" }}</span>
          </button>
        </div>
      </section>

      <!-- Screen 3: one stage, five audiences -->
      <section
        class="landing-section"
        aria-labelledby="audience-title"
      >
        <h2
          id="audience-title"
          class="landing-section__title"
        >
          {{ t("site.audience.title") }}
        </h2>
        <div
          class="landing-audiences"
          role="tablist"
          :aria-label="t('site.audience.title')"
        >
          <button
            v-for="audience in AUDIENCES"
            :key="audience.id"
            class="landing-audience-chip"
            :class="{ 'is-active': audience.id === activeAudienceId }"
            type="button"
            role="tab"
            :aria-selected="audience.id === activeAudienceId"
            @click="selectAudience(audience.id)"
          >
            <component
              :is="audience.icon"
              aria-hidden="true"
            />
            {{ t(audience.labelKey) }}
          </button>
        </div>

        <p class="landing-usp">
          {{ t(activeAudience.uspKey) }}
        </p>

        <div class="landing-stage">
          <LandingGif
            v-if="activeAudienceId === 'developers'"
            :src="`${ASSET_BASE}converter.gif`"
            :poster="`${ASSET_BASE}converter-poster.png`"
            :alt="t('site.landing.converterAlt')"
          />
          <LandingGif
            v-else-if="activeAudienceId === 'vibecoders'"
            :src="`${ASSET_BASE}mcp.gif`"
            :poster="`${ASSET_BASE}mcp-poster.png`"
            :alt="t('site.landing.mcpAlt')"
          />
          <LanguageDiagramThumb
            v-else
            class="landing-stage__thumb"
            :format="activeAudience.format"
            :source="activeSource"
            :title="t(activeAudience.labelKey)"
          />
        </div>

        <div class="landing-stage__actions">
          <button
            class="btn btn-primary btn-lg"
            type="button"
            @click="tryActiveScenario"
          >
            {{ t("site.landing.tryScenario") }}
          </button>
          <button
            v-if="activeAudienceId === 'vibecoders'"
            class="btn btn-ghost btn-lg"
            type="button"
            @click="openMcp"
          >
            {{ t("site.mcp.openPage") }}
            <McpConnectionTag />
          </button>
        </div>
      </section>

      <!-- Screen 4: two separate trust blocks, then the final call -->
      <section
        class="landing-section"
        aria-label="Code2Graph"
      >
        <div class="landing-trust">
          <article class="landing-trust__block">
            <h2 class="landing-trust__title">
              <ShieldCheck aria-hidden="true" />
              {{ t("site.landing.privacyTitle") }}
            </h2>
            <ul class="landing-trust__list">
              <li>{{ t("site.landing.privacyLocal") }}</li>
              <li>
                <KeyRound aria-hidden="true" />
                {{ t("site.landing.privacyKey") }}
              </li>
              <li>{{ t("site.landing.privacyCloud") }}</li>
            </ul>
          </article>

          <article class="landing-trust__block">
            <h2 class="landing-trust__title">
              <AppWindow aria-hidden="true" />
              {{ t("site.landing.platformTitle") }}
            </h2>
            <ul class="landing-trust__list">
              <li>{{ t("site.landing.platformDevices") }}</li>
              <li>{{ t("site.landing.platformSame") }}</li>
              <li>{{ t("site.landing.platformOffline") }}</li>
            </ul>
          </article>
        </div>

        <div class="landing-final">
          <h2 class="landing-final__title">
            {{ t("site.finalCta.title") }}
          </h2>
          <div class="landing-hero__actions landing-final__actions">
            <button
              class="btn btn-primary btn-lg"
              type="button"
              @click="openApp"
            >
              {{ t("site.finalCta.primary") }}
            </button>
            <LandingInstallButton size="large" />
          </div>
        </div>

        <p class="landing-license-line">
          {{ t("site.license.summary") }}
          <a
            :href="APP_LINKS.prosperityLicense"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t("site.license.read") }}</a>
        </p>
      </section>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.landing-hero {
  align-items: center;
}

.landing-hero__text {
  display: grid;
  justify-items: center;
  text-align: center;
}

.landing-hero__platforms {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.landing-hero__platforms svg,
.landing-trust__title svg,
.landing-trust__list svg {
  width: 18px;
  height: 18px;
  flex: none;
}

.landing-section__hint {
  margin: -16px 0 24px;
  text-align: center;
  color: var(--text-muted);
}

.landing-gallery {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.landing-tile {
  display: grid;
  gap: 10px;
  padding: 12px;
  text-align: left;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  color: inherit;
}

.landing-tile:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
}

.landing-tile__preview {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: inherit;
}

.landing-tile__caption {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  color: var(--text-muted);
  font-size: 0.92rem;
}

.landing-tile__language {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.landing-tile__language:hover {
  color: var(--text);
}

.landing-formats-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 24px 0 0;
  color: var(--text-muted);
}

.landing-formats-line__badge {
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.landing-formats-line__badge:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  color: var(--accent);
}

.landing-languages {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.landing-language-card {
  display: grid;
  gap: 6px;
  text-align: left;
  padding: 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.landing-language-card span {
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.4;
}

.landing-language-card:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
}

.landing-audiences {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
}

.landing-audience-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.landing-audience-chip svg {
  width: 17px;
  height: 17px;
}

.landing-audience-chip.is-active {
  border-color: var(--accent);
  color: var(--text);
}

.landing-usp {
  max-width: 44rem;
  margin: 0 auto 20px;
  text-align: center;
  font-size: 1.08rem;
  line-height: 1.5;
}

.landing-stage {
  max-width: 880px;
  margin: 0 auto;
}

.landing-stage__thumb {
  --language-thumb-height: 340px;
}

.landing-stage__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 20px;
}

.landing-trust {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.landing-trust__block {
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
}

.landing-trust__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  font-size: 1.15rem;
}

.landing-trust__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--text-muted);
  line-height: 1.45;
}

.landing-trust__list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.landing-final {
  margin-top: 40px;
  text-align: center;
}

.landing-final__title {
  margin: 0 0 20px;
  font-size: clamp(1.5rem, 3vw, 2rem);
}

.landing-final__actions {
  justify-content: center;
}

.landing-license-line {
  margin: 32px 0 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.landing-license-line a {
  color: var(--accent);
}

@media (max-width: 767px) {
  .landing-section__hint {
    text-align: left;
  }

  .landing-audiences {
    justify-content: flex-start;
  }

  .landing-usp {
    text-align: left;
  }

  .landing-stage__actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
