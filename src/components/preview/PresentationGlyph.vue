<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import {
  ArrowRight,
  Camera,
  Circle,
  Eye,
  EyeOff,
  Film,
  LoaderCircle,
  Minus,
  Palette,
  Pause,
  Play,
  Plus,
  Presentation,
  RefreshCw,
  SkipBack,
  SkipForward,
  Square,
  SquarePen,
  Trash2,
  Type,
} from "@lucide/vue";

const GLYPH_SIZE = 18;
const GLYPH_STROKE = 1.8;

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
  | "palette";

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
};

const props = defineProps<{
  name: PresentationGlyphName;
  spin?: boolean;
}>();

const icon = computed(() => ICONS[props.name]);
</script>

<template>
  <component
    :is="icon"
    class="presentation-glyph"
    :class="{ 'is-spinning': spin }"
    :size="GLYPH_SIZE"
    :stroke-width="GLYPH_STROKE"
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
