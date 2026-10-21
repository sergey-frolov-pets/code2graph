<script setup lang="ts">
import SiteFooter from "@/components/site/SiteFooter.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";
import { APP_LINKS } from "@/constants";

const MCP_CONFIG = `{
  "mcpServers": {
    "code2graph": {
      "command": "node",
      "args": ["/ABS/PATH/code2graph/packages/mcp/bin/code2graph-mcp.js"],
      "env": {
        "CODE2GRAPH_API_URL": "https://www.code2graph.ru",
        "CODE2GRAPH_API_TOKEN": "same-value-as-AGENT_API_TOKEN"
      }
    }
  }
}`;

const { t } = useLocale();
const { navigateTo } = useAppRouter();
const sourceUrl = `${APP_LINKS.github}/tree/main/packages/mcp`;
</script>

<template>
  <div class="site-page mcp-page">
    <SiteHeader />

    <main class="mcp-main">
      <button
        class="btn btn-ghost mcp-back"
        type="button"
        @click="navigateTo('landing')"
      >
        {{ t("site.backHome") }}
      </button>

      <h1>{{ t("site.mcp.pageTitle") }}</h1>
      <p class="mcp-lead">
        {{ t("site.mcp.summary") }}
      </p>

      <section aria-labelledby="mcp-tools-title">
        <h2 id="mcp-tools-title">
          {{ t("site.mcp.toolsTitle") }}
        </h2>
        <ul>
          <li>
            <code>list_diagram_formats</code>
            — {{ t("site.mcp.toolList") }}
          </li>
          <li>
            <code>plan_diagram</code>
            — {{ t("site.mcp.toolPlan") }}
          </li>
          <li>
            <code>generate_diagram</code>
            — {{ t("site.mcp.toolGenerate") }}
          </li>
        </ul>
      </section>

      <section aria-labelledby="mcp-connect-title">
        <h2 id="mcp-connect-title">
          {{ t("site.mcp.connectTitle") }}
        </h2>
        <p>{{ t("site.mcp.connectText") }}</p>
        <pre class="mcp-config"><code>{{ MCP_CONFIG }}</code></pre>
        <p>
          <a
            :href="sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
          >{{ t("site.mcp.source") }}</a>
        </p>
      </section>

      <section aria-labelledby="mcp-api-title">
        <h2 id="mcp-api-title">
          {{ t("site.mcp.apiTitle") }}
        </h2>
        <p>{{ t("site.mcp.apiText") }}</p>
        <ul>
          <li><code>GET /api/agent/formats</code> — {{ t("site.mcp.apiFormats") }}</li>
          <li><code>POST /api/agent/diagrams/plan</code> — {{ t("site.mcp.apiPlan") }}</li>
          <li><code>POST /api/agent/diagrams/scaffold</code> — {{ t("site.mcp.apiScaffold") }}</li>
        </ul>
        <p class="mcp-note">
          {{ t("site.mcp.staticNote") }}
        </p>
      </section>

      <button
        class="btn btn-primary"
        type="button"
        @click="navigateTo('app')"
      >
        {{ t("site.openEditor") }}
      </button>
    </main>

    <SiteFooter />
  </div>
</template>

<style scoped>
.mcp-main {
  width: min(720px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0 64px;
  display: grid;
  gap: 16px;
}

.mcp-back {
  justify-self: start;
}

.mcp-main h1 {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
}

.mcp-lead,
.mcp-main p,
.mcp-note {
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.mcp-main h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}

.mcp-main ul {
  margin: 0;
  padding-left: 1.2rem;
  display: grid;
  gap: 8px;
}

.mcp-main a,
.mcp-main code {
  color: var(--accent);
}

.mcp-config {
  margin: 0;
  padding: 16px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font-size: 0.85rem;
  line-height: 1.45;
}

.mcp-config code {
  color: inherit;
}
</style>
