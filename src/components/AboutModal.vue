<script setup lang="ts">
import AppModal from "@/components/AppModal.vue";
import { APP_LINKS, APP_META } from "@/constants";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <AppModal :open="open" title="О программе" @close="emit('close')">
    <p class="about-lead">
      <strong>{{ APP_META.name }}</strong> — оффлайн-редактор и генератор диаграмм
      PlantUML в форматах SVG и PNG.
    </p>
    <p class="about-meta">Разработана <strong>{{ APP_META.developer }}</strong></p>
    <p class="about-meta">Версия {{ APP_META.version }}</p>

    <h3 class="about-subtitle">Сайт</h3>
    <p class="about-meta">
      <a :href="APP_LINKS.site" target="_blank" rel="noopener noreferrer">
        puml.sergey-frolov.ru
      </a>
    </p>

    <h3 class="about-subtitle">Исходный код</h3>
    <p class="about-meta">
      <a :href="APP_LINKS.github" target="_blank" rel="noopener noreferrer">
        github.com/sergey-frolov-pets/vuePUML
      </a>
    </p>

    <h3 class="about-subtitle">Лицензия</h3>
    <p>
      Распространяется под лицензией
      <a :href="APP_LINKS.mitLicense" target="_blank" rel="noopener noreferrer">
        MIT
      </a>.
    </p>

    <h3 class="about-subtitle">Используемые компоненты</h3>
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
        <a :href="APP_LINKS.vue" target="_blank" rel="noopener noreferrer">Vue.js</a>
      </li>
      <li>
        <a :href="APP_LINKS.vite" target="_blank" rel="noopener noreferrer">Vite</a>
      </li>
    </ul>

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        Закрыть
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
