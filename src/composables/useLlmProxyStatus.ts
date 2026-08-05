import { onMounted, ref, watch } from "vue";
import {
  fetchLlmProxyStatus,
  type LlmProxyStatus,
} from "@/services/llm/proxy-status";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { isLlmProxyConfigured } from "@/utils/llm-proxy";

export function useLlmProxyStatus() {
  const { libraryApiUrl } = useLibraryApiUrl();
  const proxyStatus = ref<LlmProxyStatus | null>(null);
  const isLoading = ref(false);

  async function refreshProxyStatus(): Promise<void> {
    if (!isLlmProxyConfigured()) {
      proxyStatus.value = null;
      return;
    }

    isLoading.value = true;
    try {
      proxyStatus.value = await fetchLlmProxyStatus();
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    void refreshProxyStatus();
  });

  watch(libraryApiUrl, () => {
    void refreshProxyStatus();
  });

  return {
    proxyStatus,
    isLoading,
    refreshProxyStatus,
  };
}
