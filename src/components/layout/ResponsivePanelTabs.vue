<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

export type MobilePanelId = "editor" | "preview";

const activePanel = defineModel<MobilePanelId>({ required: true });

const { t } = useLocale();

const tabs: { id: MobilePanelId; labelKey: "app.mobilePanelEditor" | "app.mobilePanelPreview" }[] =
  [
    { id: "editor", labelKey: "app.mobilePanelEditor" },
    { id: "preview", labelKey: "app.mobilePanelPreview" },
  ];
</script>

<template>
  <nav
    class="responsive-panel-tabs"
    role="tablist"
    :aria-label="t('app.mainNav')"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      class="responsive-panel-tabs__tab"
      :class="{ 'is-active': activePanel === tab.id }"
      role="tab"
      :aria-selected="activePanel === tab.id"
      :tabindex="activePanel === tab.id ? 0 : -1"
      @click="activePanel = tab.id"
    >
      {{ t(tab.labelKey) }}
    </button>
  </nav>
</template>

<style scoped>
.responsive-panel-tabs {
  display: none;
}

@media (max-width: 900px) {
  .responsive-panel-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    margin: 0 12px 8px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-muted);
  }

  .responsive-panel-tabs__tab {
    min-height: var(--btn-touch);
    padding: 8px 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.9rem;
    font-weight: 600;
    transition: background 0.15s, color 0.15s, box-shadow 0.15s;
    touch-action: manipulation;
  }

  .responsive-panel-tabs__tab:hover:not(.is-active) {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 4%, transparent);
  }

  .responsive-panel-tabs__tab.is-active {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 1px 2px color-mix(in srgb, var(--accent) 35%, transparent);
  }
}
</style>
