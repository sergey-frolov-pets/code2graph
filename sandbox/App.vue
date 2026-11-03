<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";

const source = ref(`waterfall
title Выручка 2026
y "млн ₽" 0 --> 120
=40 : Q1
+15 : Q2
+20 : Q3
=75 : Итог`);
const svg = shallowRef("");
const error = ref("");
const dark = ref(false);
const strict = ref(false);
const debugFrames = ref(false);
const renderMs = ref<number | null>(null);
const busy = ref(false);

const fixtures = import.meta.glob("./fixtures/*.mmd", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const fixtureList = computed(() =>
  Object.entries(fixtures)
    .map(([path, text]) => ({ name: path.replace("./fixtures/", ""), text }))
    .sort((a, b) => a.name.localeCompare(b.name)),
);

function loadFixture(name: string) {
  const f = fixtureList.value.find((x) => x.name === name);
  if (f) source.value = f.text;
}

async function render() {
  error.value = "";
  busy.value = true;
  const started = performance.now();
  try {
    const { tryRenderExtension } = await import("@/services/mermaid/ext");
    const result = await tryRenderExtension(source.value, {
      dark: dark.value,
      strict: strict.value,
      debugFrames: debugFrames.value,
    });
    if (!result) {
      error.value = "Тип не распознан как расширение — уйдёт в штатный Mermaid.";
      svg.value = "";
    } else {
      svg.value = result;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    svg.value = "";
  } finally {
    renderMs.value = Math.round(performance.now() - started);
    busy.value = false;
  }
}

function downloadSvg() {
  if (!svg.value) return;
  const blob = new Blob([svg.value], { type: "image/svg+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "diagram.svg";
  a.click();
  URL.revokeObjectURL(a.href);
}
</script>

<template>
  <div class="layout">
    <header class="bar">
      <strong>Mermaid Ext — песочница</strong>
      <span class="dim">прод не задет · __MERMAID_EXT__ = true</span>
      <span class="grow" />
      <label><input v-model="dark" type="checkbox" /> тёмная</label>
      <label><input v-model="strict" type="checkbox" /> строгий</label>
      <label><input v-model="debugFrames" type="checkbox" /> debug-рамки</label>
      <button class="primary" :disabled="busy" @click="render">Рендер</button>
      <button :disabled="!svg" @click="downloadSvg">SVG</button>
      <span v-if="renderMs !== null" class="dim">{{ renderMs }} мс</span>
    </header>

    <main class="panes">
      <section class="pane">
        <div class="pane-head">
          <span>Источник</span>
          <select @change="loadFixture(($event.target as HTMLSelectElement).value)">
            <option value="">— фикстура —</option>
            <option v-for="f in fixtureList" :key="f.name" :value="f.name">{{ f.name }}</option>
          </select>
        </div>
        <textarea v-model="source" spellcheck="false" />
      </section>

      <section class="pane">
        <div class="pane-head"><span>Превью</span></div>
        <div class="preview" :class="{ dark }">
          <div v-if="error" class="error">{{ error }}</div>
          <div v-else-if="svg" v-html="svg" />
          <div v-else class="dim">Нажми «Рендер»</div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.layout { display: flex; flex-direction: column; height: 100vh; }
.bar {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px; background: #fff; border-bottom: 1px solid var(--border);
}
.bar label { display: flex; align-items: center; gap: 4px; color: var(--fg-dim); }
.grow { flex: 1; }
.dim { color: var(--fg-dim); font-size: 12px; }
.panes { flex: 1; display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
.pane { display: flex; flex-direction: column; min-width: 0; border-right: 1px solid var(--border); }
.pane-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 12px; background: #fff; border-bottom: 1px solid var(--border);
  font-size: 12px; color: var(--fg-dim);
}
textarea { flex: 1; border: 0; border-radius: 0; resize: none; padding: 12px; line-height: 1.5; }
.preview { flex: 1; overflow: auto; padding: 16px; background: #fff; display: flex; align-items: flex-start; justify-content: center; }
.preview.dark { background: #1a1d21; }
.error { color: var(--err); white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 13px; }
</style>
