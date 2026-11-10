<script setup lang="ts">
import { computed } from "vue";
import AppUpdateBanner from "@/components/AppUpdateBanner.vue";
import App from "@/App.vue";
import { bindAppRouterListeners, useAppRouter } from "@/composables/useAppRouter";
import AccountPage from "@/pages/AccountPage.vue";
import LandingPage from "@/pages/LandingPage.vue";
import LanguagePage from "@/pages/LanguagePage.vue";
import McpPage from "@/pages/McpPage.vue";
import PreviewPage from "@/pages/PreviewPage.vue";
import AiChatSharePage from "@/pages/AiChatSharePage.vue";
import LoginPage from "@/pages/LoginPage.vue";
import RegisterPage from "@/pages/RegisterPage.vue";

bindAppRouterListeners();

const { route } = useAppRouter();

const view = computed(() => {
  switch (route.value.name) {
    case "login":
      return LoginPage;
    case "register":
      return RegisterPage;
    case "account":
      return AccountPage;
    case "app":
      return App;
    case "language":
      return LanguagePage;
    case "mcp":
      return McpPage;
    case "preview":
      return PreviewPage;
    case "aiChatShare":
      return AiChatSharePage;
    case "diagram":
    case "clipboard":
    case "libraryLink":
      return App;
    default:
      return LandingPage;
  }
});
</script>

<template>
  <AppUpdateBanner />
  <component :is="view" />
</template>
