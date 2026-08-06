export const APP_META = {
  name: "vuePlantUML",
  developer: "FSVibe",
  version: __APP_VERSION__,
  copyright: "© 2026 FSVibe",
} as const;

export const APP_LINKS = {
  site: "https://puml.sergey-frolov.ru/",
  githubPages: "https://sergey-frolov-pets.github.io/vuePUML/",
  github: "https://github.com/sergey-frolov-pets/vuePUML",
  githubReleases:
    "https://github.com/sergey-frolov-pets/vuePUML/releases/latest",
  plantumlGuide: "https://plantuml.com/guide",
  plantuml: "https://plantuml.com/",
  plantumlCore: "https://www.npmjs.com/package/@plantuml/core",
  smetana: "https://plantuml.com/smetana02",
  vue: "https://vuejs.org/",
  vite: "https://vite.dev/",
  mitLicense: "https://opensource.org/licenses/MIT",
  llmApiKeysGuide: "./llm-api-keys.html",
} as const;

export const STORAGE_KEY_SOURCE = "plantuml-smetana-source";
/** @deprecated Используйте STORAGE_KEY_UI_DARK и STORAGE_KEY_DIAGRAM_DARK */
export const STORAGE_KEY_DARK = "plantuml-smetana-dark";
export const STORAGE_KEY_UI_DARK = "plantuml-smetana-ui-dark";
export const STORAGE_KEY_DIAGRAM_DARK = "plantuml-smetana-diagram-dark";
export const STORAGE_KEY_LAYOUT = "plantuml-smetana-layout";

export const RENDER_DEBOUNCE_MS = 400;

export const LAYOUT_ENGINES = {
  smetana: "smetana",
  elk: "elk",
  dot: "dot",
} as const;

export type LayoutEngine = (typeof LAYOUT_ENGINES)[keyof typeof LAYOUT_ENGINES];

export {
  DEFAULT_SOURCE,
  SAMPLE_DIAGRAMS,
  getDefaultSource,
  getSampleDiagramSource,
  getSampleSource,
  isDefaultSource,
  isSampleDiagramSource,
  translateSourceForLocale,
  SAMPLE_DIAGRAM_IDS,
  PLANTUML_SAMPLE_IDS,
  MERMAID_SAMPLE_IDS,
  type SampleDiagramId,
  type PlantUmlSampleId,
  type MermaidSampleId,
  type SampleSelection,
} from "@/constants/sample-diagrams";
