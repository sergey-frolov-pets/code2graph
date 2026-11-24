<script setup lang="ts">
import { computed, defineAsyncComponent, defineComponent, h, watch } from "vue";
import AppUpdateBanner from "@/components/AppUpdateBanner.vue";
import { bindAppRouterListeners, useAppRouter } from "@/composables/useAppRouter";
import LandingPage from "@/pages/LandingPage.vue";

const pageLoading = defineComponent({
  name: "PageLoading",
  setup() {
    return () =>
      h("div", {
        class: "app-boot-placeholder",
        role: "status",
        "aria-live": "polite",
        "aria-label": "Code2Graph",
      });
  },
});

const asyncPage = (loader: () => Promise<{ default: object }>) =>
  defineAsyncComponent({
    loader,
    delay: 0,
    loadingComponent: pageLoading,
  });

const App = asyncPage(() => import("@/App.vue"));
const AccountPage = asyncPage(() => import("@/pages/AccountPage.vue"));
const LanguagePage = asyncPage(() => import("@/pages/LanguagePage.vue"));
const McpPage = asyncPage(() => import("@/pages/McpPage.vue"));
const PreviewPage = asyncPage(() => import("@/pages/PreviewPage.vue"));
const AiChatSharePage = asyncPage(() => import("@/pages/AiChatSharePage.vue"));
const LoginPage = asyncPage(() => import("@/pages/LoginPage.vue"));
const RegisterPage = asyncPage(() => import("@/pages/RegisterPage.vue"));

bindAppRouterListeners();

const { route } = useAppRouter();

watch(
  () =>
    `${route.value.name}:${route.value.languageId ?? ""}:${route.value.diagramSlug ?? ""}`,
  () => {
    window.scrollTo(0, 0);
  },
);

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
    case "sample":
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
