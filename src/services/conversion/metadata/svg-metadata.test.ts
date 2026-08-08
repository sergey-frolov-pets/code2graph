import { describe, expect, it } from "vitest";
import { SVG_METADATA_ID } from "@/constants/conversion-settings";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import {
  embedSvgMetadata,
  readSvgMetadata,
} from "@/services/conversion/metadata/svg-metadata";

const SAMPLE_IR: DiagramIR = {
  version: 1,
  kind: "graph",
  nodes: [{ id: "n1", label: "Alice", matchConfidence: 1 }],
  edges: [],
};

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">
  <rect width="10" height="10" />
</svg>`;

describe("svg-metadata", () => {
  it("embeds and reads diagram IR from SVG", () => {
    const embedded = embedSvgMetadata(SAMPLE_SVG, SAMPLE_IR);
    expect(embedded).toContain(`id="${SVG_METADATA_ID}"`);

    const restored = readSvgMetadata(embedded);
    expect(restored).toEqual(SAMPLE_IR);
  });

  it("replaces existing metadata block", () => {
    const first = embedSvgMetadata(SAMPLE_SVG, SAMPLE_IR);
    const updated: DiagramIR = {
      ...SAMPLE_IR,
      nodes: [
        { id: "n1", label: "Alice", matchConfidence: 1 },
        { id: "n2", label: "Bob", matchConfidence: 1 },
      ],
    };
    const second = embedSvgMetadata(first, updated);

    expect(readSvgMetadata(second)?.nodes).toHaveLength(2);
    expect(second.match(new RegExp(`id="${SVG_METADATA_ID}"`, "g"))).toHaveLength(
      1,
    );
  });
});
