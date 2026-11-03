import { describeGoldenRoutes } from "@/services/conversion/pipeline/golden-test-utils";
import {
  MERMAID_CLASS_MINIMAL,
  PLANTUML_CLASS_MINIMAL,
} from "@/services/conversion/__fixtures__/class-samples";

describeGoldenRoutes("class diagram golden routes", [
  {
    source: PLANTUML_CLASS_MINIMAL,
    sourceFormat: "plantuml",
    targetFormat: "mermaid",
    expectedTokens: ["classDiagram", "Animal", "Dog"],
  },
  {
    source: MERMAID_CLASS_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "plantuml",
    expectedTokens: ["@startuml", "class Animal", "class Dog"],
  },
  {
    source: PLANTUML_CLASS_MINIMAL,
    sourceFormat: "plantuml",
    targetFormat: "graphml",
    expectedTokens: ["<graphml", "Animal", "Dog"],
    skipRoundTrip: true,
  },
  {
    source: MERMAID_CLASS_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "graphml",
    expectedTokens: ["<graphml", "Animal", "Dog"],
    skipRoundTrip: true,
  },
]);
