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
  ClipboardCopy,
  Cloud,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  FolderOpen,
  GitCompare,
  Globe,
  History,
  House,
  Library,
  Moon,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Star,
  Sun,
  Table,
  Trash2,
  Undo2,
  Unlink,
  Upload,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "@lucide/vue";

export type ActionIconName =
  | "home"
  | "back"
  | "next"
  | "arrow-down"
  | "folder-open"
  | "save"
  | "check"
  | "clipboard-copy"
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
  | "settings"
  | "close"
  | "history"
  | "undo"
  | "redo"
  | "ai"
  | "syntax-help"
  | "transfer"
  | "open-link"
  | "eye"
  | "eye-off"
  | "star"
  | "cloud"
  | "shield"
  | "globe"
  | "unlink"
  | "user"
  | "more"
  | "code"
  | "table-paste"
  | "builder"
  | "session-compare";

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
  home: House,
  back: ArrowLeft,
  next: ArrowRight,
  "arrow-down": ArrowDown,
  "folder-open": FolderOpen,
  save: Save,
  check: CircleCheck,
  "clipboard-copy": ClipboardCopy,
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
  settings: Settings,
  close: X,
  history: History,
  undo: Undo2,
  redo: Redo2,
  ai: Sparkles,
  "syntax-help": CircleHelp,
  transfer: ArrowLeftRight,
  "open-link": ExternalLink,
  eye: Eye,
  "eye-off": EyeOff,
  star: Star,
  cloud: Cloud,
  shield: Shield,
  globe: Globe,
  unlink: Unlink,
  user: User,
  more: Ellipsis,
  code: Braces,
  "table-paste": Table,
  builder: SlidersHorizontal,
  "session-compare": GitCompare,
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
