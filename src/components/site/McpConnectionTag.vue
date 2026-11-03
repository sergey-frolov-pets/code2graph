<script setup lang="ts">
import { computed } from "vue";
import { isStaticDeployment } from "@/config/library-api";
import { useLocale } from "@/composables/useLocale";

const { t } = useLocale();

const connected = computed(
  () => !isStaticDeployment(import.meta.env.VITE_API_BASE_URL),
);

const label = computed(() =>
  connected.value ? t("site.mcp.connected") : t("site.mcp.disconnected"),
);
</script>

<template>
  <span
    class="mcp-connection-tag"
    :class="connected ? 'mcp-connection-tag--on' : 'mcp-connection-tag--off'"
  >
    {{ label }}
  </span>
</template>

<style scoped>
.mcp-connection-tag {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.4;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.mcp-connection-tag--on {
  color: var(--success);
  background: color-mix(in srgb, var(--success) 16%, transparent);
  border-color: color-mix(in srgb, var(--success) 45%, transparent);
}

.mcp-connection-tag--off {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 16%, transparent);
  border-color: color-mix(in srgb, var(--danger) 45%, transparent);
}
</style>
