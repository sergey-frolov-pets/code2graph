<script setup lang="ts">
import { computed, nextTick, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";

const props = defineProps<{
  open: boolean;
  highlightProviderId?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
const { byokProviders } = useLlmKeysGuide();

const sections = computed(() =>
  byokProviders.map((provider) => ({
    id: provider.id,
    name: t(provider.nameKey),
    description: t(provider.descriptionKey),
    keyUrl: provider.keyUrl ?? "",
    docsUrl: provider.docsUrl ?? "",
  })),
);

function scrollToHighlight(): void {
  if (!props.highlightProviderId) {
    return;
  }

  const element = document.getElementById(props.highlightProviderId);
  element?.scrollIntoView({ behavior: "smooth", block: "start" });
}

watch(
  () => [props.open, props.highlightProviderId] as const,
  async ([isOpen]) => {
    if (!isOpen) {
      return;
    }

    await nextTick();
    scrollToHighlight();
  },
);
</script>

<template>
  <AppModal :open="open" :title="t('llm.keysGuide.title')" @close="emit('close')">
    <p class="guide-lead">{{ t("llm.keysGuide.lead") }}</p>

    <section
      v-for="section in sections"
      :key="section.id"
      :id="section.id"
      class="guide-section"
      :class="{ 'guide-section--highlight': highlightProviderId === section.id }"
    >
      <h3 class="guide-section__title">{{ section.name }}</h3>
      <p class="guide-section__text">{{ section.description }}</p>
      <ol class="guide-steps">
        <li>{{ t("llm.keysGuide.stepRegister") }}</li>
        <li>
          {{ t("llm.keysGuide.stepCreateKey") }}
          <a
            v-if="section.keyUrl"
            :href="section.keyUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ section.keyUrl }}
          </a>
        </li>
        <li>{{ t("llm.keysGuide.stepPaste") }}</li>
      </ol>
      <p v-if="section.docsUrl" class="guide-section__links">
        <a :href="section.docsUrl" target="_blank" rel="noopener noreferrer">
          {{ t("llm.keysGuide.docsLink") }}
        </a>
      </p>
    </section>

    <section class="guide-section guide-section--security">
      <h3 class="guide-section__title">{{ t("llm.keysGuide.securityTitle") }}</h3>
      <p class="guide-section__text">{{ t("llm.keysGuide.securityLead") }}</p>
      <ul class="guide-security-list">
        <li>{{ t("llm.keysGuide.securityApiKeys") }}</li>
        <li>{{ t("llm.keysGuide.securityLibraryCredentials") }}</li>
        <li>{{ t("llm.keysGuide.securityAuthToken") }}</li>
      </ul>
      <ul class="guide-security-list">
        <li>{{ t("llm.keysGuide.securityNoGit") }}</li>
        <li>{{ t("llm.keysGuide.securityNoShareUrl") }}</li>
        <li>{{ t("llm.keysGuide.securitySharedComputer") }}</li>
      </ul>
    </section>

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.guide-lead {
  margin: 0 0 16px;
  line-height: 1.45;
  color: var(--text-muted);
}

.guide-section {
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.guide-section:first-of-type {
  border-top: 0;
  padding-top: 0;
}

.guide-section--highlight {
  background: var(--surface-muted);
  margin: 0 -8px;
  padding: 12px 8px;
  border-radius: var(--radius);
}

.guide-section__title {
  margin: 0 0 8px;
  font-size: 0.95rem;
  font-weight: 600;
}

.guide-section__text {
  margin: 0 0 8px;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.guide-steps {
  margin: 0 0 8px;
  padding-left: 1.25rem;
  font-size: 0.88rem;
  line-height: 1.45;
}

.guide-section__links {
  margin: 0;
  font-size: 0.88rem;
}

.guide-section--security {
  border-top: 1px solid var(--border);
  margin-top: 8px;
  padding-top: 16px;
}

.guide-security-list {
  margin: 0 0 8px;
  padding-left: 1.25rem;
  font-size: 0.88rem;
  line-height: 1.45;
}
</style>
