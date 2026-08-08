import { createApp } from "vue";
import { registerShareSupport } from "@/composables/usePumlShare";
import App from "./App.vue";
import { initInstallPromptCapture } from "./pwa/installPromptState";
import "@/config/library-profiles";
import "./styles/app.css";

initInstallPromptCapture();
void registerShareSupport();

createApp(App).mount("#app");
