import {
  exampleDomains,
  type DiagramExample,
  type DiagramTypeTag,
  type ExampleTagRef,
} from "@/constants/diagram-example-catalog";
import { getSampleSource } from "@/constants/sample-diagrams";
import type { AppLocale } from "@/constants/i18n";
import type { LocaleKey, TranslateFn } from "@/locales/types";
import { isLocaleKey } from "@/locales/types";

const TITLE_KEYS: Record<string, LocaleKey> = {
  "mermaid:waterfall": "llm.wizard.gallery.example.mermaid.waterfall.title",
  "mermaid:waterfallMono": "llm.wizard.gallery.example.mermaid.waterfallMono.title",
  "mermaid:waterfallBreak": "llm.wizard.gallery.example.mermaid.waterfallBreak.title",
  "mermaid:waterfallMulti": "llm.wizard.gallery.example.mermaid.waterfallMulti.title",
  "mermaid:waterfallLabels": "llm.wizard.gallery.example.mermaid.waterfallLabels.title",
  "mermaid:waterfallNoLines": "llm.wizard.gallery.example.mermaid.waterfallNoLines.title",
  "mermaid:waterfallThresholds":
    "llm.wizard.gallery.example.mermaid.waterfallThresholds.title",
  "mermaid:clustered": "llm.wizard.gallery.example.mermaid.clustered.title",
  "mermaid:clusteredRotated":
    "llm.wizard.gallery.example.mermaid.clusteredRotated.title",
  "mermaid:clusteredStacked":
    "llm.wizard.gallery.example.mermaid.clusteredStacked.title",
  "mermaid:clusteredMono": "llm.wizard.gallery.example.mermaid.clusteredMono.title",
  "mermaid:clusteredMonoInvert":
    "llm.wizard.gallery.example.mermaid.clusteredMonoInvert.title",
  "mermaid:seriesLines": "llm.wizard.gallery.example.mermaid.seriesLines.title",
  "mermaid:seriesCagr": "llm.wizard.gallery.example.mermaid.seriesCagr.title",
  "wiremark:login": "llm.wizard.gallery.example.wiremark.login.title",
  "wiremark:dashboard": "llm.wizard.gallery.example.wiremark.dashboard.title",
  "wiremark:form": "llm.wizard.gallery.example.wiremark.form.title",
  "wiremark:settings": "llm.wizard.gallery.example.wiremark.settings.title",
  "wiremark:flow": "llm.wizard.gallery.example.wiremark.flow.title",
  "wiremark:product": "llm.wizard.gallery.example.wiremark.product.title",
};

const DESCRIPTION_KEYS: Record<string, LocaleKey> = {
  "mermaid:waterfall": "llm.wizard.gallery.example.mermaid.waterfall.description",
  "mermaid:waterfallMono":
    "llm.wizard.gallery.example.mermaid.waterfallMono.description",
  "mermaid:waterfallBreak":
    "llm.wizard.gallery.example.mermaid.waterfallBreak.description",
  "mermaid:waterfallMulti":
    "llm.wizard.gallery.example.mermaid.waterfallMulti.description",
  "mermaid:waterfallLabels":
    "llm.wizard.gallery.example.mermaid.waterfallLabels.description",
  "mermaid:waterfallNoLines":
    "llm.wizard.gallery.example.mermaid.waterfallNoLines.description",
  "mermaid:waterfallThresholds":
    "llm.wizard.gallery.example.mermaid.waterfallThresholds.description",
  "mermaid:clustered":
    "llm.wizard.gallery.example.mermaid.clustered.description",
  "mermaid:clusteredRotated":
    "llm.wizard.gallery.example.mermaid.clusteredRotated.description",
  "mermaid:clusteredStacked":
    "llm.wizard.gallery.example.mermaid.clusteredStacked.description",
  "mermaid:clusteredMono":
    "llm.wizard.gallery.example.mermaid.clusteredMono.description",
  "mermaid:clusteredMonoInvert":
    "llm.wizard.gallery.example.mermaid.clusteredMonoInvert.description",
  "mermaid:seriesLines": "llm.wizard.gallery.example.mermaid.seriesLines.description",
  "mermaid:seriesCagr": "llm.wizard.gallery.example.mermaid.seriesCagr.description",
  "wiremark:login": "llm.wizard.gallery.example.wiremark.login.description",
  "wiremark:dashboard": "llm.wizard.gallery.example.wiremark.dashboard.description",
  "wiremark:form": "llm.wizard.gallery.example.wiremark.form.description",
  "wiremark:settings": "llm.wizard.gallery.example.wiremark.settings.description",
  "wiremark:flow": "llm.wizard.gallery.example.wiremark.flow.description",
  "wiremark:product": "llm.wizard.gallery.example.wiremark.product.description",
};

const EXTRA_DIAGRAM_LABELS: Partial<Record<DiagramTypeTag, LocaleKey>> = {
  waterfall: "llm.wizard.gallery.tag.diagramType.waterfall",
  bubble: "llm.wizard.gallery.tag.diagramType.bubble",
  heatmap: "llm.wizard.gallery.tag.diagramType.heatmap",
  orgchart: "llm.wizard.gallery.tag.diagramType.orgchart",
  ev: "llm.wizard.gallery.tag.diagramType.ev",
  boxplot: "llm.wizard.gallery.tag.diagramType.boxplot",
  treemap: "llm.wizard.gallery.tag.diagramType.treemap",
  radar: "llm.wizard.gallery.tag.diagramType.radar",
  voronoi: "llm.wizard.gallery.tag.diagramType.voronoi",
  series: "llm.wizard.gallery.tag.diagramType.clustered",
  decision: "llm.wizard.gallery.tag.diagramType.decision",
};

const EXTRA_DIAGRAM_DESCRIPTIONS: Partial<Record<DiagramTypeTag, LocaleKey>> = {
  bubble: "llm.wizard.gallery.desc.bubble",
  heatmap: "llm.wizard.gallery.desc.heatmap",
  orgchart: "llm.wizard.gallery.desc.orgchart",
  ev: "llm.wizard.gallery.desc.ev",
  boxplot: "llm.wizard.gallery.desc.boxplot",
  treemap: "llm.wizard.gallery.desc.treemap",
  radar: "llm.wizard.gallery.desc.radar",
  voronoi: "llm.wizard.gallery.desc.voronoi",
  series: "llm.wizard.gallery.desc.clustered",
  decision: "llm.wizard.gallery.desc.decision",
};

function requireLocaleKey(key: string): LocaleKey {
  if (!isLocaleKey(key)) {
    throw new Error(`Missing gallery locale key ${key}`);
  }

  return key;
}

export function diagramTypeLabel(diagramType: DiagramTypeTag, t: TranslateFn): string {
  const extra = EXTRA_DIAGRAM_LABELS[diagramType];
  if (extra) {
    return t(extra);
  }

  return t(requireLocaleKey(`llm.wizard.type.${diagramType}`));
}

export function exampleTagLabel(tag: ExampleTagRef, t: TranslateFn): string {
  if (tag.axis === "language") {
    return t(requireLocaleKey(`llm.wizard.language.${tag.id}`));
  }

  if (tag.axis === "diagramType") {
    return diagramTypeLabel(tag.id as DiagramTypeTag, t);
  }

  if (tag.axis === "chartFamily") {
    return t(requireLocaleKey(`llm.wizard.gallery.tag.chartFamily.${tag.id}`));
  }

  if (tag.axis === "domain") {
    return t(requireLocaleKey(`llm.wizard.gallery.tag.domain.${tag.id}`));
  }

  return t(requireLocaleKey(`llm.wizard.gallery.tag.setting.${tag.id}`));
}

export function diagramExampleTitle(example: DiagramExample, t: TranslateFn): string {
  const override = TITLE_KEYS[example.id];
  if (override) {
    return t(override);
  }

  return t("llm.wizard.gallery.composedTitle", {
    type: diagramTypeLabel(example.diagramType, t),
    language: t(requireLocaleKey(`llm.wizard.language.${example.format}`)),
  });
}

export function diagramExampleDescription(
  example: DiagramExample,
  t: TranslateFn,
): string {
  const override = DESCRIPTION_KEYS[example.id];
  if (override) {
    return t(override);
  }

  const extra = EXTRA_DIAGRAM_DESCRIPTIONS[example.diagramType];
  if (extra) {
    return t(extra);
  }

  return t(requireLocaleKey(`llm.wizard.typeDesc.${example.diagramType}`));
}

export function diagramExampleSearchText(
  example: DiagramExample,
  t: TranslateFn,
  locale: AppLocale,
): string {
  const labels = example.tags.map((tag) => exampleTagLabel(tag, t));
  const source = getSampleSource(
    { format: example.format, id: example.sampleId },
    locale,
  );

  return [
    diagramExampleTitle(example, t),
    diagramExampleDescription(example, t),
    labels.join("\n"),
    source,
  ].join("\n");
}

export function diagramExamplePrompt(example: DiagramExample, t: TranslateFn): string {
  const settings = example.tags
    .filter((tag) => tag.axis === "setting")
    .map((tag) => exampleTagLabel(tag, t));
  const params = {
    title: diagramExampleTitle(example, t),
    language: t(requireLocaleKey(`llm.wizard.language.${example.format}`)),
    type: diagramTypeLabel(example.diagramType, t),
    domains: exampleDomains(example)
      .map((id) => exampleTagLabel({ axis: "domain", id }, t))
      .join(", "),
    description: diagramExampleDescription(example, t),
    settings: settings.join(", "),
  };

  if (settings.length === 0) {
    return t("llm.wizard.gallery.promptPlain", params);
  }

  return t("llm.wizard.gallery.prompt", params);
}
