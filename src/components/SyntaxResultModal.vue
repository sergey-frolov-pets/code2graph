<script setup lang="ts">
import { computed } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import {
  formatLocalizedSyntaxIssues,
  localizeSyntaxIssue,
} from "@/utils/localize-syntax";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

const props = defineProps<{
  open: boolean;
  result: SyntaxCheckResult | null;
  isValidating: boolean;
  showSyntaxAsk?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  askSyntax: [];
}>();

const { t } = useLocale();

const title = computed(() => {
  if (props.isValidating || !props.result) {
    return t("syntax.titleChecking");
  }
  return props.result.valid
    ? t("syntax.titleValid")
    : t("syntax.titleInvalid");
});

const variant = computed(() => {
  if (props.isValidating || !props.result) {
    return "default";
  }
  return props.result.valid ? "success" : "error";
});

const message = computed(() => {
  if (props.isValidating) {
    return t("syntax.checkingMessage");
  }
  if (!props.result) {
    return "";
  }
  if (props.result.valid) {
    return t("syntax.validMessage");
  }
  return formatLocalizedSyntaxIssues(props.result.issues, t);
});

const errorLines = computed(() => {
  if (!props.result) {
    return [];
  }
  return [
    ...new Set(
      props.result.issues
        .map((issue) => issue.line)
        .filter((line): line is number => typeof line === "number"),
    ),
  ].sort((left, right) => left - right);
});
</script>

<template>
  <AppModal
    :open="open"
    :title="title"
    :variant="variant"
    @close="emit('close')"
  >
    <p class="syntax-message">{{ message }}</p>

    <ul v-if="!isValidating && result && !result.valid" class="issue-list">
      <li
        v-for="(issue, index) in result.issues"
        :key="`${issue.messageKey ?? issue.message}-${index}`"
        :class="issue.severity"
      >
        <span v-if="issue.line" class="issue-line">
          {{ t("syntax.line", { line: issue.line }) }}
        </span>
        {{ localizeSyntaxIssue(issue, t) }}
      </li>
    </ul>

    <p
      v-if="!isValidating && result && !result.valid && errorLines.length > 0"
      class="syntax-hint"
    >
      {{ t("syntax.highlightHint") }}
      {{ errorLines.join(", ") }}
    </p>

    <template #footer>
      <button
        v-if="showSyntaxAsk && !isValidating && result && !result.valid"
        class="btn"
        type="button"
        @click="emit('askSyntax')"
      >
        {{ t("llm.syntaxAsk.fromValidation") }}
      </button>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ isValidating ? t("app.wait") : t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.syntax-message {
  margin: 0 0 12px;
  white-space: pre-wrap;
  line-height: 1.5;
}

.issue-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.issue-list li {
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  background: var(--surface-muted);
}

.issue-list li.error {
  border-left: 3px solid var(--danger);
}

.issue-list li.warning {
  border-left: 3px solid #d4a017;
}

.issue-line {
  display: block;
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 2px;
}

.syntax-hint {
  margin: 12px 0 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}
</style>
