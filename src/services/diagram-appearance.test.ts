// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyDiagramAppearance } from "@/services/diagram-appearance";

const DARK_CANVAS = "#171d24";
const LIGHT_TEXT = "#1f2328";
const DARK_TEXT = "#e6edf3";

const GANTT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80">
  <rect x="0" y="20" width="20" height="60" fill="#F1E5E5"/>
  <rect x="40" y="30" width="50" height="12" fill="#90EE90"/>
  <text x="8" y="50" fill="#000000">1</text>
  <text x="100" y="40" fill="#000000">Task</text>
  <path d="M0 0 L10 10" fill="#00000000" stroke="#181818"/>
  <polygon points="0,0 4,4 0,8" fill="#FF7F50" stroke="#FF7F50"/>
</svg>`;

const BLOCK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <style>
    #b1 .flowchart-link{stroke:#333333;fill:none;}
    #b1 .marker{fill:#333333;stroke:#333333;}
    #b1 .label text,#b1 span{fill:#333;color:#333;}
    #b1 .node rect,#b1 .node path{fill:#ECECFF;stroke:#9370DB;}
  </style>
  <g id="b1">
    <text class="title" x="10" y="16" fill="#333">Title</text>
    <g class="node" data-look="classic">
      <rect x="0" y="30" width="80" height="40" style="fill:#e3f2fd"></rect>
      <foreignObject x="10" y="40" width="60" height="20">
        <div xmlns="http://www.w3.org/1999/xhtml"><span><p>Web</p></span></div>
      </foreignObject>
    </g>
    <g class="node" data-look="classic">
      <rect x="100" y="30" width="80" height="40"></rect>
      <foreignObject x="110" y="40" width="60" height="20">
        <p xmlns="http://www.w3.org/1999/xhtml">Queue</p>
      </foreignObject>
    </g>
  </g>
</svg>`;

function parsed(svg: string): Document {
  return new DOMParser().parseFromString(svg, "image/svg+xml");
}

describe("applyDiagramAppearance", () => {
  it("keeps gantt bar colors and contrasts labels with the surface behind them", () => {
    const svg = applyDiagramAppearance(GANTT_SVG, { background: DARK_CANVAS });
    const doc = parsed(svg);
    const texts = [...doc.querySelectorAll("text")];

    expect(texts[0]?.getAttribute("fill")).toBe(LIGHT_TEXT);
    expect(texts[1]?.getAttribute("fill")).toBe(DARK_TEXT);
    expect(doc.querySelector("rect[fill='#90EE90'], rect[fill='#90ee90']")).not.toBeNull();
    expect(svg).toContain("#90EE90");
    expect(svg).toContain("#F1E5E5");
    expect(svg).toContain("#FF7F50");
    expect(doc.querySelector("path")?.getAttribute("stroke")).toBe(DARK_TEXT);
    expect(doc.documentElement.getAttribute("style")).toContain(`background-color:${DARK_CANVAS}`);
  });

  it("keeps block fills and makes the title follow the canvas", () => {
    const svg = applyDiagramAppearance(BLOCK_SVG, { background: DARK_CANVAS });
    const doc = parsed(svg);

    expect(doc.querySelector("text.title")?.getAttribute("fill")).toBe(DARK_TEXT);
    expect(doc.querySelector("p")?.getAttribute("style")).toContain(LIGHT_TEXT);
    expect(svg.toLowerCase()).toContain("fill:#e3f2fd");
    expect(svg).toContain("#ECECFF");
    expect(svg).toContain(`stroke:${DARK_TEXT}`);
    expect(svg).toContain("color:#333");
  });

  it("uses a manual text color only for labels on the canvas", () => {
    const svg = applyDiagramAppearance(GANTT_SVG, {
      background: DARK_CANVAS,
      textColor: "#ff00aa",
    });
    const doc = parsed(svg);
    const texts = [...doc.querySelectorAll("text")];

    expect(texts[0]?.getAttribute("fill")).toBe(LIGHT_TEXT);
    expect(texts[1]?.getAttribute("fill")).toBe("#ff00aa");
  });

  it("leaves an explicit label color alone", () => {
    const source = GANTT_SVG.replace(
      '<text x="100" y="40" fill="#000000">Task</text>',
      '<text x="100" y="40" fill="#c62828">Task</text>',
    );
    const svg = applyDiagramAppearance(source, { background: DARK_CANVAS });
    const doc = parsed(svg);

    expect(doc.querySelectorAll("text")[1]?.getAttribute("fill")).toBe("#c62828");
  });

  it("does nothing without a background or a text color", () => {
    expect(applyDiagramAppearance(GANTT_SVG, {})).toBe(GANTT_SVG);
  });
});
