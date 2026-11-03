import { computed, ref } from "vue";
import {
  fetchLlmProxyStatus,
  type LlmProxyProviderStatus,
} from "@/services/llm/proxy-status";
import { isLlmProxyConfigured } from "@/utils/llm-proxy";

const proxyReachable = ref(false);
const proxyProviders = ref<LlmProxyProviderStatus[]>([]);
let refreshPromise: Promise<void> | null = null;

async function refreshLlmProxyAvailability(): Promise<void> {
  if (refreshPromise) {
    await refreshPromise;
    return;
  }

  refreshPromise = (async () => {
    if (!isLlmProxyConfigured()) {
      proxyReachable.value = false;
      proxyProviders.value = [];
      return;
    }

    const status = await fetchLlmProxyStatus();
    if (!status?.ok) {
      proxyReachable.value = false;
      proxyProviders.value = [];
      return;
    }

    proxyReachable.value = true;
    proxyProviders.value = status.providers;
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export function useLlmProxyAvailability() {
  const proxyConfigured = computed(() => isLlmProxyConfigured());

  const availableFreeProviderIds = computed(() =>
    proxyProviders.value.filter((provider) => provider.configured).map(
      (provider) => provider.id,
    ),
  );

  const hasAvailableFreeProviders = computed(
    () => availableFreeProviderIds.value.length > 0,
  );

  return {
    proxyConfigured,
    proxyReachable,
    availableFreeProviderIds,
    hasAvailableFreeProviders,
    refreshLlmProxyAvailability,
  };
}
