import { describeGoldenRoutes } from "@/services/conversion/pipeline/golden-test-utils";
import {
  MERMAID_STATE_MINIMAL,
  PLANTUML_STATE_MINIMAL,
} from "@/services/conversion/__fixtures__/state-samples";

describeGoldenRoutes("state diagram golden routes", [
  {
    source: PLANTUML_STATE_MINIMAL,
    sourceFormat: "plantuml",
    targetFormat: "mermaid",
    expectedTokens: ["stateDiagram", "Idle", "Done"],
  },
  {
    source: MERMAID_STATE_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "plantuml",
    expectedTokens: ["@startuml", "Idle", "Done"],
  },
  {
    source: PLANTUML_STATE_MINIMAL,
    sourceFormat: "plantuml",
    targetFormat: "graphml",
    expectedTokens: ["<graphml", "Idle", "Done"],
    skipRoundTrip: true,
  },
  {
    source: MERMAID_STATE_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "graphml",
    expectedTokens: ["<graphml"],
    skipRoundTrip: true,
  },
]);
