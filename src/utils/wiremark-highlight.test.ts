import { describe, expect, it } from "vitest";
import { renderWiremarkHighlightedLine } from "@/utils/wiremark-highlight";

describe("wiremark highlight", () => {
  it("marks the frame root, strings, and comments", () => {
    const html = renderWiremarkHighlightedLine(
      'Wireframe #login mobile  // sign in',
    );
    expect(html).toContain('class="tok-directive"');
    expect(html).toContain("Wireframe");
    expect(html).toContain('class="tok-variable"');
    expect(html).toContain("#login");
    expect(html).toContain('class="tok-comment"');
  });

  it("marks component names and quoted labels", () => {
    const html = renderWiremarkHighlightedLine('  Button "Sign in" contained');
    expect(html).toContain('class="tok-keyword"');
    expect(html).toContain('class="tok-string"');
    expect(html).toContain("Sign in");
  });
});
