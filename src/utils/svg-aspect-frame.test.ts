import { describe, expect, it } from "vitest";
import { applyMarkedAspectFrame, padSvgToAspect } from "./svg-aspect-frame";

describe("svg aspect frame", () => {
  it("widens a tall viewBox to 16:9 and keeps the drawing centered", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200" width="100" height="200"></svg>';
    const framed = padSvgToAspect(svg, { width: 16, height: 9 });
    expect(framed).toContain('viewBox="-127.778 0 355.556 200"');
    expect(framed).toContain('width="355.556"');
    expect(framed).toContain('height="200"');
  });

  it("reads a mermaid comment and leaves an unmarked svg unchanged", () => {
    const svg = '<svg viewBox="0 0 200 100"></svg>';
    expect(applyMarkedAspectFrame("flowchart LR\n  A-->B", svg)).toBe(svg);
    const framed = applyMarkedAspectFrame("%% ratio 1x1\nflowchart LR\n  A-->B", svg);
    expect(framed).toContain('viewBox="0 -50 200 200"');
  });
});