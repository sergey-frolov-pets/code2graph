<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import { APP_LINKS, APP_META } from "@/constants";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
</script>

<template>
  <AppModal :open="open" :title="t('about.title')" @close="emit('close')">
    <p class="about-lead">
      {{ t("about.lead", { name: APP_META.name }) }}
    </p>
    <p class="about-meta">
      {{ t("about.developedBy", { developer: APP_META.developer }) }}
    </p>
    <p class="about-meta">{{ t("about.version", { version: APP_META.version }) }}</p>

    <h3 class="about-subtitle">{{ t("about.site") }}</h3>
    <p class="about-meta">
      <a :href="APP_LINKS.site" target="_blank" rel="noopener noreferrer">
        puml.sergey-frolov.ru
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.sourceCode") }}</h3>
    <p class="about-meta">
      <a :href="APP_LINKS.github" target="_blank" rel="noopener noreferrer">
        github.com/sergey-frolov-pets/vuePUML
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.license") }}</h3>
    <p>
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
        <a :href="APP_LINKS.vue" target="_blank" rel="noopener noreferrer">Vue.js</a>
      </li>
      <li>
        <a :href="APP_LINKS.vite" target="_blank" rel="noopener noreferrer">Vite</a>
      </li>
    </ul>

    <h3 class="about-subtitle">{{ t("about.mermaid") }}</h3>
    <p class="about-meta">{{ t("about.mermaidLead") }}</p>
    <p class="about-meta">
      <a :href="APP_LINKS.mermaidIntro" target="_blank" rel="noopener noreferrer">
        {{ t("about.mermaidGuide") }}
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.graphml") }}</h3>
    <p class="about-meta">{{ t("about.graphmlLead") }}</p>
    <p class="about-meta">
      <a :href="APP_LINKS.graphml" target="_blank" rel="noopener noreferrer">
        {{ t("about.graphmlSpec") }}
      </a>
      ·
      <a :href="APP_LINKS.yEd" target="_blank" rel="noopener noreferrer">
        {{ t("about.yedEditor") }}
      </a>
    </p>

    <h3 class="about-subtitle">{{ t("about.ai") }}</h3>
    <p class="about-meta">{{ t("about.aiLead") }}</p>
    <p class="about-meta">
      <a :href="APP_LINKS.llmApiKeysGuide" target="_blank" rel="noopener noreferrer">
        {{ t("about.llmGuide") }}
      </a>
    </p>

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

.about-subtitle {
  margin: 16px 0 8px;
  font-size: 0.92rem;
}

.about-links {
  margin: 0;
  padding-left: 1.2rem;
  line-height: 1.7;
}

.about-links a {
  color: var(--accent);
}
</style>
