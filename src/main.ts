import { createApp } from "vue";
import { reportAppVisit } from "@/analytics";
import { useAnalytics } from "@/composables/useAnalytics";
import { readInitialLocale } from "@/composables/useLocale";
import { loadDeploymentConfig } from "@/config/library-api";
import Root from "./Root.vue";
import { initInstallPromptCapture } from "./pwa/installPromptState";
import "@/config/library-profiles";
import "./styles/app.css";
import "./styles/utilities.css";

async function boot(): Promise<void> {
  await loadDeploymentConfig();
  initInstallPromptCapture();
  void import("@/composables/usePumlShare").then((module) => {
    module.registerShareSupport();
  });
  createApp(Root).mount("#app");
  // Один визит на открытие приложения; язык интерфейса прикладывается к нему
  // (раз в сутки) — см. reportAppVisit в @/analytics/usage.
  reportAppVisit(readInitialLocale());
}

void boot();

// Router-driven tracking (named routes, language pages): просмотры разделов
// идут как page/<раздел>. Сырые pageview по хешу сняты — в отчёте они
// дублировали page/*.
useAnalytics();
