<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import {
  ArrowRight,
  Camera,
  Check,
  Circle,
  Eye,
  EyeOff,
  Film,
  Flag,
  LoaderCircle,
  Minus,
  Octagon,
  Palette,
  Pause,
  Play,
  Plus,
  Presentation,
  RefreshCw,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Square,
  SquarePen,
  Trash2,
  TriangleAlert,
  Type,
  X,
} from "@lucide/vue";

const GLYPH_SIZE = 18;
const GLYPH_STROKE = 1.8;
const FLAG_RED = "#d00000";
const FLAG_GREEN = "#1f9d55";

export type PresentationGlyphName =
  | "presentation"
  | "edit"
  | "view"
  | "prev"
  | "next"
  | "play"
  | "pause"
  | "gif"
  | "loader"
  | "eye"
  | "eye-off"
  | "plus"
  | "trash"
  | "camera"
  | "refresh"
  | "minus"
  | "rect"
  | "ellipse"
  | "text"
  | "arrow"
  | "palette"
  | "warning"
  | "stop"
  | "flag-red"
  | "flag-green"
  | "check"
  | "cross"
  | "rotate-left"
  | "rotate-right";

const ICONS: Record<PresentationGlyphName, Component> = {
  presentation: Presentation,
  edit: SquarePen,
  view: Eye,
  prev: SkipBack,
  next: SkipForward,
  play: Play,
  pause: Pause,
  gif: Film,
  loader: LoaderCircle,
  eye: Eye,
  "eye-off": EyeOff,
  plus: Plus,
  trash: Trash2,
  camera: Camera,
  refresh: RefreshCw,
  minus: Minus,
  rect: Square,
  ellipse: Circle,
  text: Type,
  arrow: ArrowRight,
  palette: Palette,
  warning: TriangleAlert,
  stop: Octagon,
  "flag-red": Flag,
  "flag-green": Flag,
  check: Check,
  cross: X,
  "rotate-left": RotateCcw,
  "rotate-right": RotateCw,
};

const props = defineProps<{
  name: PresentationGlyphName;
  spin?: boolean;
}>();

const icon = computed(() => ICONS[props.name]);
const iconColor = computed(() => {
  if (props.name === "flag-red") {
    return FLAG_RED;
  }
  if (props.name === "flag-green") {
    return FLAG_GREEN;
  }
  return undefined;
});
</script>

<template>
  <component
    :is="icon"
    class="presentation-glyph"
    :class="{ 'is-spinning': spin }"
    :size="GLYPH_SIZE"
    :stroke-width="GLYPH_STROKE"
    :color="iconColor"
    aria-hidden="true"
  />
</template>

<style scoped>
.presentation-glyph {
  display: block;
  flex-shrink: 0;
}

.presentation-glyph.is-spinning {
  animation: presentation-glyph-spin 0.8s linear infinite;
}

@keyframes presentation-glyph-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
