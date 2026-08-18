<script setup lang="ts">
import LoadingState from "@/components/ui/LoadingState.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  sourceTab: "zip" | "folder" | "github";
  githubUrl: string;
  githubToken: string;
  githubEnabled: boolean;
  isLoading: boolean;
  errorMessage: string;
}>();

const emit = defineEmits<{
  "update:sourceTab": [value: "zip" | "folder" | "github"];
  "update:githubUrl": [value: string];
  "update:githubToken": [value: string];
  "zip-selected": [file: File];
  "folder-picker": [];
  "folder-input": [fileList: FileList];
  "github-load": [];
}>();

const { t } = useLocale();

function onZipChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit("zip-selected", file);
  }
}

function onFolderChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    emit("folder-input", input.files);
  }
}
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("codeGraph.sourceHint") }}</p>

    <div class="wizard-mode-toggle" role="tablist">
      <button
        v-for="tab in (['zip', 'folder', 'github'] as const)"
        :key="tab"
        class="wizard-mode-toggle__option"
        :class="{ 'is-active': sourceTab === tab, 'is-disabled': tab === 'github' && !githubEnabled }"
        type="button"
        :disabled="tab === 'github' && !githubEnabled"
        @click="emit('update:sourceTab', tab)"
      >
        {{ t(`codeGraph.source.${tab}`) }}
      </button>
    </div>

    <div v-if="sourceTab === 'zip'" class="code-graph-source-panel">
      <label class="code-graph-file-input">
        <span>{{ t("codeGraph.pickZip") }}</span>
        <input type="file" accept=".zip,application/zip" @change="onZipChange" />
      </label>
    </div>

    <div v-else-if="sourceTab === 'folder'" class="code-graph-source-panel">
      <button type="button" class="wizard-secondary-btn" @click="emit('folder-picker')">
        {{ t("codeGraph.pickFolderNative") }}
      </button>
      <label class="code-graph-file-input">
        <span>{{ t("codeGraph.pickFolderFallback") }}</span>
        <input
          type="file"
          webkitdirectory
          multiple
          @change="onFolderChange"
        />
      </label>
    </div>

    <div v-else class="code-graph-source-panel">
      <label>
        <span>{{ t("codeGraph.githubUrl") }}</span>
        <input
          :value="githubUrl"
          type="url"
          class="wizard-text-input"
          :placeholder="t('codeGraph.githubUrlPlaceholder')"
          @input="emit('update:githubUrl', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label>
        <span>{{ t("codeGraph.githubToken") }}</span>
        <input
          :value="githubToken"
          type="password"
          class="wizard-text-input"
          :placeholder="t('codeGraph.githubTokenPlaceholder')"
          @input="emit('update:githubToken', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <button type="button" class="wizard-primary-btn" @click="emit('github-load')">
        {{ t("codeGraph.loadGithub") }}
      </button>
    </div>

    <LoadingState v-if="isLoading" :label="t('codeGraph.loadingProject')" />
    <p v-if="errorMessage" class="wizard-error">{{ errorMessage }}</p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
<style scoped>
.code-graph-source-panel {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.code-graph-file-input {
  display: grid;
  gap: 6px;
}

.wizard-text-input {
  width: 100%;
}
</style>
