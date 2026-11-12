<script setup lang="ts">
import { APP_META } from "@/constants";

const HEADER_LOGO_SIZE_PX = 28;
const headerLogoSize = `${HEADER_LOGO_SIZE_PX}px`;
</script>

<template>
  <img
    class="app-logo"
    :src="APP_META.logo"
    alt=""
    aria-hidden="true"
    :width="HEADER_LOGO_SIZE_PX"
    :height="HEADER_LOGO_SIZE_PX"
    decoding="async"
  >
</template>

<style scoped>
.app-logo {
  display: block;
  flex: 0 0 auto;
  width: v-bind(headerLogoSize);
  height: v-bind(headerLogoSize);
}
</style>
