import { languageKeywords } from "@/languages/keyword-completion";
import type { LanguageKeyword } from "@/languages/types";

const KEYWORD_INSERT_SUFFIX = " ";

const STRUCTURIZR_KEYWORD_LABELS = [
  "workspace",
  "model",
  "views",
  "person",
  "softwareSystem",
  "container",
  "component",
  "deploymentNode",
  "deploymentEnvironment",
  "containerInstance",
  "softwareSystemInstance",
  "infrastructureNode",
  "group",
  "include",
  "exclude",
  "autolayout",
  "styles",
  "element",
  "relationship",
  "tags",
  "description",
  "technology",
  "properties",
  "theme",
  "configuration",
  "title",
  "systemContext",
  "systemLandscape",
  "dynamic",
  "deployment",
  "filtered",
  "url",
  "instances",
  "location",
  "perspectives",
] as const;

const STRUCTURIZR_PREPROCESSOR_LABELS = [
  "!identifiers",
  "!impliedRelationships",
  "!docs",
  "!adrs",
] as const;

export const STRUCTURIZR_KEYWORD_SET = new Set<string>(
  [...STRUCTURIZR_KEYWORD_LABELS, ...STRUCTURIZR_PREPROCESSOR_LABELS].map(
    (label) => label.toLowerCase(),
  ),
);

export const structurizrLanguageKeywords: readonly LanguageKeyword[] = [
  ...languageKeywords(STRUCTURIZR_KEYWORD_LABELS, {
    insertSuffix: KEYWORD_INSERT_SUFFIX,
  }),
  ...languageKeywords(STRUCTURIZR_PREPROCESSOR_LABELS, {
    kind: "preprocessor",
    insertSuffix: KEYWORD_INSERT_SUFFIX,
  }),
];
