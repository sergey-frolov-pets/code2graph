<script setup lang="ts">
import { computed } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import { FORMAT_GUIDE_LINKS } from "@/constants/help-guides";
import DeveloperBrand from "@/components/DeveloperBrand.vue";
import { APP_LINKS, APP_META } from "@/constants";
import { getLlmApiKeysGuideHref } from "@/constants/llm-settings";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { locale, t } = useLocale();

const llmApiKeysGuideHref = computed(() => getLlmApiKeysGuideHref(locale.value));

const siteHostname = computed(() => {
  try {
    return new URL(APP_LINKS.site).hostname;
  } catch {
    return APP_LINKS.site;
  }
});

const featureKeys = [
  "about.featuresOffline",
  "about.featuresExport",
  "about.featuresLibrary",
  "about.featuresAi",
  "about.featuresConvert",
  "about.featuresPwa",
  "about.featuresValidation",
] as const;
</script>

<template>
  <AppModal :open="open" :title="t('about.title')" @close="emit('close')">
    <p class="about-lead">
      {{ t("about.lead", { name: APP_META.name }) }}
    </p>

    <p class="about-meta about-developer">
      <span>{{ t("about.developedByLabel") }}</span>
      <DeveloperBrand />
    </p>

    <p class="about-meta">{{ t("about.version", { version: APP_META.version }) }}</p>
    <p class="about-meta about-copyright">
      {{ t("about.copyright", { copyright: APP_META.copyright }) }}
    </p>

    <h3 class="about-subtitle">{{ t("about.features") }}</h3>
    <ul class="about-list">
      <li v-for="featureKey in featureKeys" :key="featureKey">
        {{ t(featureKey) }}
      </li>
    </ul>

    <h3 class="about-subtitle">{{ t("about.formats") }}</h3>
    <ul class="about-list">
      <li>{{ t("about.formatsPlantuml") }}</li>
      <li>{{ t("about.formatsMermaid") }}</li>
      <li>
        {{ t("about.formatsGraphml") }}
        <a :href="APP_LINKS.yEd" target="_blank" rel="noopener noreferrer">yEd</a>.
      </li>
    </ul>

    <h3 class="about-subtitle">{{ t("settings.help") }}</h3>
    <ul class="about-links">
      <li v-for="guide in FORMAT_GUIDE_LINKS" :key="guide.id">
        <a :href="guide.href" target="_blank" rel="noopener noreferrer">
          {{ t(guide.labelKey) }}
        </a>
      </li>
      <li>
        <a :href="APP_LINKS.yEd" target="_blank" rel="noopener noreferrer">
          {{ t("settings.yedEditor") }}
        </a>
      </li>
    </ul>

    <h3 class="about-subtitle">{{ t("about.ai") }}</h3>
    <p class="about-meta">{{ t("about.aiLead") }}</p>
    <p class="about-meta">
      <a :href="llmApiKeysGuideHref" target="_blank" rel="noopener noreferrer">
        {{ t("about.llmGuide") }}
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.site") }}</h3>
    <p class="about-meta">
      <a :href="APP_LINKS.site" target="_blank" rel="noopener noreferrer">
        {{ siteHostname }}
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.sourceCode") }}</h3>
    <p class="about-meta">
      <a :href="APP_LINKS.github" target="_blank" rel="noopener noreferrer">
        github.com/sergey-frolov-pets/code2graph
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.license") }}</h3>
    <p class="about-meta">
      {{ t("about.licenseText") }}
      <a :href="APP_LINKS.mitLicense" target="_blank" rel="noopener noreferrer">
        MIT
      </a>.
    </p>

    <h3 class="about-subtitle">{{ t("about.components") }}</h3>
    <ul class="about-links">
      <li>
        <a :href="APP_LINKS.plantuml" target="_blank" rel="noopener noreferrer">
          PlantUML
        </a>
      </li>
      <li>
        <a :href="APP_LINKS.plantumlCore" target="_blank" rel="noopener noreferrer">
          @plantuml/core (TeaVM)
        </a>
      </li>
      <li>
        <a :href="APP_LINKS.smetana" target="_blank" rel="noopener noreferrer">
          Smetana layout engine
        </a>
      </li>
      <li>
        <a :href="APP_LINKS.mermaid" target="_blank" rel="noopener noreferrer">
          Mermaid.js
        </a>
      </li>
      <li>
        <a :href="APP_LINKS.graphml" target="_blank" rel="noopener noreferrer">
          GraphML
        </a>
      </li>
      <li>
        <a :href="APP_LINKS.yEd" target="_blank" rel="noopener noreferrer">yEd</a>
      </li>
      <li>
        <a :href="APP_LINKS.dagre" target="_blank" rel="noopener noreferrer">dagre</a>
      </li>
      <li>
        <a :href="APP_LINKS.vue" target="_blank" rel="noopener noreferrer">Vue.js</a>
      </li>
      <li>
        <a :href="APP_LINKS.vite" target="_blank" rel="noopener noreferrer">Vite</a>
      </li>
    </ul>

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.about-lead {
  margin: 0 0 12px;
  line-height: 1.5;
}

.about-meta {
  margin: 0 0 6px;
  color: var(--text-muted);
}

.about-developer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.about-copyright {
  margin-bottom: 12px;
}

.about-subtitle {
  margin: 16px 0 8px;
  font-size: 0.92rem;
}

.about-list,
.about-links {
  margin: 0;
  padding-left: 1.2rem;
  line-height: 1.6;
}

.about-links a,
.about-list a {
  color: var(--accent);
}
</style>
