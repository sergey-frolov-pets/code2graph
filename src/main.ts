import { createApp } from "vue";
import { registerShareSupport } from "@/composables/usePumlShare";
import Root from "./Root.vue";
import { initInstallPromptCapture } from "./pwa/installPromptState";
import "@/config/library-profiles";
import "./styles/app.css";
import "./styles/utilities.css";

initInstallPromptCapture();
void registerShareSupport();

createApp(Root).mount("#app");
