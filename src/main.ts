import { createApp } from "vue";
import { registerShareSupport } from "@/composables/usePumlShare";
import { trackPageview } from "@/analytics";
import { useAnalytics } from "@/composables/useAnalytics";
import Root from "./Root.vue";
import { initInstallPromptCapture } from "./pwa/installPromptState";
import "@/config/library-profiles";
import "./styles/app.css";
import "./styles/utilities.css";

initInstallPromptCapture();
void registerShareSupport();

createApp(Root).mount("#app");

// Hash-routed SPA: GoatCounter only sees the initial load, so every route
// change has to be reported explicitly. Without this all visits collapse to "/".
window.addEventListener("hashchange", () => {
  trackPageview(window.location.hash);
});

// Router-driven tracking (named routes, language pages) on top of the raw
// hash listener above.
useAnalytics();
