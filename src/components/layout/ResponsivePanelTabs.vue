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
    <div class="responsive-panel-tabs__bar">
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
        <span class="responsive-panel-tabs__label">{{ t(tab.labelKey) }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.responsive-panel-tabs {
  display: none;
}

@media (max-width: 900px) {
  .responsive-panel-tabs {
    display: block;
    flex-shrink: 0;
    padding: 0 12px;
    background: var(--surface-muted);
    border-bottom: 1px solid var(--border);
  }

  .responsive-panel-tabs__bar {
    display: flex;
    align-items: flex-end;
    gap: 0;
    min-height: 34px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    touch-action: manipulation;
  }

  .responsive-panel-tabs__bar::-webkit-scrollbar {
    display: none;
  }

  .responsive-panel-tabs__tab {
    position: relative;
    flex: 0 0 auto;
    min-width: 88px;
    max-width: 160px;
    min-height: 30px;
    margin: 0;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    border-radius: 6px 6px 0 0;
    background: color-mix(in srgb, var(--surface-muted) 55%, var(--border));
    color: var(--text-muted);
    font-size: 0.82rem;
    font-weight: 500;
    line-height: 1.2;
    touch-action: manipulation;
    transition:
      background 0.12s ease,
      color 0.12s ease,
      border-color 0.12s ease;
  }

  .responsive-panel-tabs__tab + .responsive-panel-tabs__tab {
    margin-left: -1px;
  }

  .responsive-panel-tabs__tab:hover:not(.is-active) {
    color: var(--text);
    background: color-mix(in srgb, var(--surface-muted) 35%, var(--surface));
  }

  .responsive-panel-tabs__tab:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    z-index: 2;
  }

  .responsive-panel-tabs__tab.is-active {
    z-index: 1;
    border-bottom-color: var(--surface);
    margin-bottom: -1px;
    padding-bottom: 1px;
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--text) 6%, transparent),
      0 -1px 0 var(--surface);
  }

  .responsive-panel-tabs__label {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
