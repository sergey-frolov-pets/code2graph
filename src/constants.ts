export const APP_META = {
  name: "Code2Graph",
  developer: "FSVibe",
  developerLogo: "/icons/fsvibe-logo.png",
  landingHeroImage: "/images/landing-workflow.png",
  version: __APP_VERSION__,
  copyright: "© 2026 FSVibe",
} as const;

export const APP_LINKS = {
  site: "https://www.code2graph.ru/",
  githubPages: "https://sergey-frolov-pets.github.io/code2graph/",
  github: "https://github.com/sergey-frolov-pets/code2graph",
  githubReleases:
    "https://github.com/sergey-frolov-pets/code2graph/releases/latest",
  plantumlGuide: "https://plantuml.com/guide",
  plantuml: "https://plantuml.com/",
  plantumlCore: "https://www.npmjs.com/package/@plantuml/core",
  smetana: "https://plantuml.com/smetana02",
  mermaidGuide: "https://mermaid.js.org/intro/",
  mermaid: "https://mermaid.js.org/",
  mermaidInk: "https://mermaid.ink/",
  graphmlGuide: "http://graphml.graphdrawing.org/primer/graphml-primer.html",
  graphml: "http://graphml.graphdrawing.org/",
  yEd: "https://www.yworks.com/products/yed",
  dagre: "https://github.com/dagrejs/dagre",
  vue: "https://vuejs.org/",
  vite: "https://vite.dev/",
  mitLicense: "https://opensource.org/licenses/MIT",
  llmApiKeysGuide: "./llm-api-keys.html",
} as const;

export const STORAGE_KEY_SOURCE = "code2graph-source";
export const STORAGE_KEY_DIAGRAM_FORMAT = "code2graph-diagram-format";
export const STORAGE_KEY_FILE_NAME = "code2graph-file-name";
export const STORAGE_KEY_UI_DARK = "code2graph-ui-dark";
export const STORAGE_KEY_DIAGRAM_DARK = "code2graph-diagram-dark";
export const STORAGE_KEY_LAYOUT = "code2graph-layout";

export const RENDER_DEBOUNCE_MS = 400;

export const LAYOUT_ENGINES = {
  smetana: "smetana",
  elk: "elk",
  dot: "dot",
} as const;

export type LayoutEngine = (typeof LAYOUT_ENGINES)[keyof typeof LAYOUT_ENGINES];

export {
  getDefaultSource,
  getSampleSource,
  isDefaultSource,
  translateSourceForLocale,
  PLANTUML_SAMPLE_IDS,
  MERMAID_SAMPLE_IDS,
  type PlantUmlSampleId,
  type MermaidSampleId,
  type SampleSelection,
} from "@/constants/sample-diagrams";
