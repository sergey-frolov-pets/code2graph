import { describeGoldenRoutes } from "@/services/conversion/pipeline/golden-test-utils";
import {
  MERMAID_SEQUENCE_MINIMAL,
  PLANTUML_SEQUENCE_MINIMAL,
} from "@/services/conversion/__fixtures__/sequence-samples";

describeGoldenRoutes("sequence diagram golden routes", [
  {
    source: PLANTUML_SEQUENCE_MINIMAL,
    sourceFormat: "plantuml",
    targetFormat: "mermaid",
    expectedTokens: ["sequenceDiagram", "A", "B", "hi"],
  },
  {
    source: MERMAID_SEQUENCE_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "plantuml",
    expectedTokens: ["@startuml", "A", "B", "hi"],
  },
  {
    source: PLANTUML_SEQUENCE_MINIMAL,
    sourceFormat: "plantuml",
    targetFormat: "graphml",
    expectedTokens: ["<graphml", "A", "B"],
    skipRoundTrip: true,
  },
  {
    source: MERMAID_SEQUENCE_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "graphml",
    expectedTokens: ["<graphml", "A", "B"],
    skipRoundTrip: true,
  },
]);
