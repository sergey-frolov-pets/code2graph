<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

const EXAMPLE_SOURCE = `@startuml
Alice -> Bob : Hello
@enduml`;

const { t } = useLocale();
</script>

<template>
  <figure class="mcp-preview">
    <figcaption class="mcp-preview__caption">
      {{ t("site.mcp.exampleCaption") }}
    </figcaption>
    <div class="mcp-preview__pair">
      <div class="mcp-preview__pane">
        <p class="mcp-preview__label">
          {{ t("site.mcp.exampleSource") }}
        </p>
        <pre class="mcp-preview__source"><code>{{ EXAMPLE_SOURCE }}</code></pre>
      </div>
      <div class="mcp-preview__pane">
        <p class="mcp-preview__label">
          {{ t("site.mcp.exampleImage") }}
        </p>
        <svg
          class="mcp-preview__image"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 280 128"
          role="img"
          :aria-label="t('site.mcp.exampleImage')"
        >
          <rect
            width="280"
            height="128"
            fill="#ffffff"
          />
          <rect
            x="28"
            y="16"
            width="72"
            height="28"
            rx="4"
            fill="#ffffff"
            stroke="#64748b"
          />
          <text
            x="64"
            y="34"
            text-anchor="middle"
            font-size="13"
            fill="#0f172a"
            font-family="sans-serif"
          >Alice</text>
          <rect
            x="180"
            y="16"
            width="72"
            height="28"
            rx="4"
            fill="#ffffff"
            stroke="#64748b"
          />
          <text
            x="216"
            y="34"
            text-anchor="middle"
            font-size="13"
            fill="#0f172a"
            font-family="sans-serif"
          >Bob</text>
          <line
            x1="64"
            y1="44"
            x2="64"
            y2="112"
            stroke="#94a3b8"
            stroke-dasharray="4 3"
          />
          <line
            x1="216"
            y1="44"
            x2="216"
            y2="112"
            stroke="#94a3b8"
            stroke-dasharray="4 3"
          />
          <line
            x1="72"
            y1="78"
            x2="204"
            y2="78"
            stroke="#334155"
            stroke-width="1.5"
            marker-end="url(#mcp-preview-arrow)"
          />
          <text
            x="140"
            y="70"
            text-anchor="middle"
            font-size="12"
            fill="#0f172a"
            font-family="sans-serif"
          >Hello</text>
          <defs>
            <marker
              id="mcp-preview-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill="#334155"
              />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  </figure>
</template>

<style scoped>
.mcp-preview {
  margin: 0;
  display: grid;
  gap: 12px;
  width: min(640px, 100%);
  text-align: left;
}

.mcp-preview__caption {
  color: var(--text-muted);
  line-height: 1.5;
}

.mcp-preview__pair {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.mcp-preview__pane {
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.mcp-preview__label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.mcp-preview__source {
  margin: 0;
  overflow: auto;
  color: var(--text);
  font-size: 0.85rem;
  line-height: 1.45;
}

.mcp-preview__source code {
  color: inherit;
}

.mcp-preview__image {
  width: 100%;
  height: auto;
  border-radius: calc(var(--radius) - 4px);
  background: #ffffff;
}
</style>
