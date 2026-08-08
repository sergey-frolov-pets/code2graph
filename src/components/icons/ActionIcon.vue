<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  Braces,
  CircleCheck,
  CircleHelp,
  Cloud,
  Download,
  Eye,
  FolderOpen,
  Globe,
  History,
  Library,
  Moon,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  SquarePen,
  Star,
  Sun,
  Trash2,
  Undo2,
  Unlink,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "@lucide/vue";

export type ActionIconName =
  | "back"
  | "next"
  | "arrow-down"
  | "folder-open"
  | "save"
  | "check"
  | "trash"
  | "refresh"
  | "sun"
  | "moon"
  | "library"
  | "snippets"
  | "plus"
  | "export"
  | "import"
  | "zoom-in"
  | "zoom-out"
  | "edit"
  | "close"
  | "history"
  | "undo"
  | "redo"
  | "ai"
  | "syntax-help"
  | "transfer"
  | "eye"
  | "star"
  | "cloud"
  | "shield"
  | "globe"
  | "unlink";

const props = withDefaults(
  defineProps<{
    name: ActionIconName;
    size?: "default" | "large";
  }>(),
  {
    size: "default",
  },
);

const ICON_MAP: Record<ActionIconName, Component> = {
  back: ArrowLeft,
  next: ArrowRight,
  "arrow-down": ArrowDown,
  "folder-open": FolderOpen,
  save: Save,
  check: CircleCheck,
  trash: Trash2,
  refresh: RefreshCw,
  sun: Sun,
  moon: Moon,
  library: Library,
  snippets: Braces,
  plus: Plus,
  export: Upload,
  import: Download,
  "zoom-in": ZoomIn,
  "zoom-out": ZoomOut,
  edit: SquarePen,
  close: X,
  history: History,
  undo: Undo2,
  redo: Redo2,
  ai: Sparkles,
  "syntax-help": CircleHelp,
  transfer: ArrowLeftRight,
  eye: Eye,
  star: Star,
  cloud: Cloud,
  shield: Shield,
  globe: Globe,
  unlink: Unlink,
};

const iconComponent = computed(() => ICON_MAP[props.name]);
const iconSize = computed(() => (props.size === "large" ? 22 : 20));
</script>

<template>
  <component
    :is="iconComponent"
    class="action-icon"
    :class="{ 'action-icon--large': size === 'large' }"
    :size="iconSize"
    :stroke-width="1.8"
    aria-hidden="true"
  />
</template>

<style scoped>
.action-icon {
  display: block;
  flex-shrink: 0;
}

.action-icon--large {
  width: 22px;
  height: 22px;
}
</style>
