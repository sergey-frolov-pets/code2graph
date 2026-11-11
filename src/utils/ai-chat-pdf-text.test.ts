import { deflate } from "pako";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/utils/ai-chat-pdf-text";

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

describe("extractPdfText", () => {
  it("reads text operators from an uncompressed stream", () => {
    const pdf = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj\n<< /Length 48 >>\nstream\nBT (Hello PDF) Tj (A\\nB) Tj ET\nendstream\nendobj\n%%EOF\n",
    );
    expect(extractPdfText(pdf)).toContain("Hello PDF");
    expect(extractPdfText(pdf)).toContain("A\nB");
  });

  it("inflates a FlateDecode stream", () => {
    const inner = new TextEncoder().encode("BT (Deflated note) Tj ET");
    const compressed = deflate(inner);
    const pdf = concatBytes([
      new TextEncoder().encode("%PDF-1.4\n<< /Filter /FlateDecode >>\nstream\n"),
      compressed,
      new TextEncoder().encode("\nendstream\n%%EOF\n"),
    ]);
    expect(extractPdfText(pdf)).toContain("Deflated note");
  });
});
