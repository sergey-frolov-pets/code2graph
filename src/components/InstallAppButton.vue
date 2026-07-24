<script setup lang="ts">
import { computed, ref } from "vue";
import { useLongPressTooltip } from "@/composables/useLongPressTooltip";
import { useLocale } from "@/composables/useLocale";
import { usePwaInstall } from "@/composables/usePwaInstall";

const {
  canShowInstallButton,
  canInstallNow,
  needsHttps,
  isAlreadyInstalled,
  isInstalling,
  installApp,
} = usePwaInstall();

const { t } = useLocale();

const installTitle = computed(() => {
  if (needsHttps.value) {
    return t("install.httpsOnly");
  }

  if (isAlreadyInstalled.value) {
    return t("install.alreadyInstalled");
  }

  if (!canInstallNow.value) {
    return t("install.manual");
  }

  return t("install.title");
});

const rootRef = ref<HTMLElement | null>(null);

const {
  tooltipVisible,
  tooltipPosition,
  tooltipPlacement,
  tooltipRef,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onMouseEnter,
  onMouseLeave,
  consumeSuppressClick,
} = useLongPressTooltip(rootRef);

function onClick(event: MouseEvent): void {
  if (consumeSuppressClick()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  void installApp();
}
</script>

<template>
  <button
    v-if="canShowInstallButton"
    ref="rootRef"
    class="btn install-app-btn icon-btn"
    :class="{
      'install-app-btn--waiting': !canInstallNow && !needsHttps,
      'install-app-btn--needs-https': needsHttps,
      'install-app-btn--installed': isAlreadyInstalled,
    }"
    type="button"
    :aria-label="installTitle"
    :disabled="isInstalling"
    :aria-busy="isInstalling"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @contextmenu.prevent
    @click="onClick"
  >
    <svg class="install-app-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="7"
        y="2.5"
        width="10"
        height="19"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <circle cx="12" cy="18.5" r="0.9" fill="currentColor" />
      <path
        d="M12 14V7M12 14l-2.8-2.8M12 14l2.8-2.8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span class="install-app-btn__label">{{ t("install.label") }}</span>
  </button>

  <Teleport to="body">
    <span
      v-if="tooltipVisible"
      ref="tooltipRef"
      class="floating-tooltip"
      :class="`floating-tooltip--${tooltipPlacement}`"
      :style="{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
      }"
      role="tooltip"
    >
      {{ installTitle }}
    </span>
  </Teleport>
</template>

<style scoped>
.install-app-btn.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: auto;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  padding: 0 12px;
  line-height: 1;
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  background: color-mix(in srgb, var(--accent) 8%, var(--surface));
  white-space: nowrap;
  flex-shrink: 0;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.install-app-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}

.install-app-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.install-app-btn:not(:disabled):not(:hover) {
  opacity: 1;
}

.install-app-btn--waiting {
  opacity: 0.85;
}

.install-app-btn--needs-https {
  border-color: color-mix(in srgb, #c98a00 45%, var(--border));
  background: color-mix(in srgb, #c98a00 10%, var(--surface));
}

.install-app-btn--installed {
  border-color: color-mix(in srgb, var(--success) 35%, var(--border));
  background: color-mix(in srgb, var(--success) 8%, var(--surface));
}

.install-app-btn__icon {
  display: block;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.install-app-btn__label {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
}

@media (max-width: 720px) {
  .install-app-btn__label {
    display: none;
  }

  .install-app-btn.btn {
    width: 40px;
    min-width: 40px;
    padding: 0;
  }
}
</style>
