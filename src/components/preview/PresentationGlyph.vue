<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  Circle,
  Copy,
  Eye,
  EyeOff,
  FileCode,
  Film,
  Flag,
  GripHorizontal,
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
  | "first"
  | "play"
  | "pause"
  | "gif"
  | "html"
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
  | "rotate-right"
  | "copy"
  | "up"
  | "down"
  | "grip";

const ICONS: Record<PresentationGlyphName, Component> = {
  presentation: Presentation,
  edit: SquarePen,
  view: ChevronsDown,
  prev: ChevronLeft,
  next: ChevronRight,
  first: SkipBack,
  play: Play,
  pause: Pause,
  gif: Film,
  html: FileCode,
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
  copy: Copy,
  up: ArrowUp,
  down: ArrowDown,
  grip: GripHorizontal,
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
