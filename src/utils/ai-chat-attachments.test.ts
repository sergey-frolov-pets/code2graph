import { describe, expect, it } from "vitest";
import { AI_CHAT_MESSAGE_MAX_CHARS } from "@/constants/ai-chat";
import {
  classifyAiChatFile,
  composeAiChatUserContent,
  readAiChatAttachment,
} from "@/utils/ai-chat-attachments";
import { extractXlsxText } from "@/utils/ai-chat-xlsx-text";

const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_EOCD_SIGNATURE = 0x06054b50;
const ZIP_CRC32_POLYNOMIAL = 0xedb88320;
const ZIP_VERSION = 20;

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (ZIP_CRC32_POLYNOMIAL & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storeZip(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = new TextEncoder().encode(entry.name);
    const checksum = crc32(entry.data);
    const local = new Uint8Array(30 + nameBytes.length + entry.data.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, ZIP_LOCAL_SIGNATURE, true);
    localView.setUint16(4, ZIP_VERSION, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, entry.data.length, true);
    localView.setUint32(22, entry.data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(entry.data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, ZIP_CENTRAL_SIGNATURE, true);
    centralView.setUint16(4, ZIP_VERSION, true);
    centralView.setUint16(6, ZIP_VERSION, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, entry.data.length, true);
    centralView.setUint32(24, entry.data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, ZIP_EOCD_SIGNATURE, true);
  eocdView.setUint16(8, entries.length, true);
  eocdView.setUint16(10, entries.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);

  const total = offset + centralSize + eocd.length;
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, cursor);
    cursor += part.length;
  }
  return out;
}

function xml(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function sampleWorkbook(): Blob {
  const bytes = storeZip([
    {
      name: "xl/workbook.xml",
      data: xml(
        `<?xml version="1.0" encoding="UTF-8"?>
        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <sheets><sheet name="Actors" sheetId="1" r:id="rId1"/></sheets>
        </workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: xml(
        `<?xml version="1.0" encoding="UTF-8"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
          <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
        </Relationships>`,
      ),
    },
    {
      name: "xl/sharedStrings.xml",
      data: xml(
        `<?xml version="1.0" encoding="UTF-8"?>
        <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <si><t>Actor</t></si>
          <si><t>Alice</t></si>
        </sst>`,
      ),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: xml(
        `<?xml version="1.0" encoding="UTF-8"?>
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
          <sheetData>
            <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><v>2</v></c></row>
            <row r="2"><c r="A2" t="s"><v>1</v></c></row>
          </sheetData>
        </worksheet>`,
      ),
    },
  ]);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("ai chat attachments", () => {
  it("treats markdown as text and xlsx as a spreadsheet", () => {
    expect(classifyAiChatFile("notes.md", "text/markdown")).toBe("text");
    expect(classifyAiChatFile("README.markdown", "")).toBe("text");
    expect(classifyAiChatFile("actors.xlsx", "")).toBe("spreadsheet");
    expect(classifyAiChatFile("flow.puml", "")).toBe("diagram");
    expect(classifyAiChatFile("notes.txt", "text/plain")).toBe("text");
    expect(classifyAiChatFile("photo.png", "image/png")).toBe("image");
    expect(classifyAiChatFile("spec.pdf", "application/pdf")).toBe("pdf");
    expect(classifyAiChatFile("archive.zip", "")).toBeNull();
  });

  it("keeps markdown source in the model prompt", async () => {
    const file = new File(["# Actors\n\nAlice talks to Bob"], "actors.md", { type: "text/markdown" });
    const result = await readAiChatAttachment(file);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const prompt = composeAiChatUserContent("Нарисуй", [result.attachment]);
    expect(prompt).toContain("Attached markdown file");
    expect(prompt).toContain("Alice talks to Bob");
    expect(prompt).not.toContain("imageBase64");
  });

  it("reads an xlsx sheet into text", async () => {
    const text = await extractXlsxText(sampleWorkbook());
    expect(text).toContain("# Actors");
    expect(text).toContain("Actor");
    expect(text).toContain("Alice");
    expect(text).toContain("2");
  });

  it("reads an image without putting its bytes into the text prompt", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    const file = new File([png], "dot.png", { type: "image/png" });
    const result = await readAiChatAttachment(file);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.attachment.imageBase64?.length).toBeGreaterThan(0);
    const prompt = composeAiChatUserContent("Посмотри", [
      { name: result.attachment.name, kind: result.attachment.kind, mimeType: result.attachment.mimeType },
    ]);
    expect(prompt).toContain("Attached image file");
    expect(prompt).not.toContain(result.attachment.imageBase64);
  });

  it("caps the composed prompt", () => {
    const prompt = composeAiChatUserContent("x".repeat(AI_CHAT_MESSAGE_MAX_CHARS), [
      { name: "notes.md", kind: "text", mimeType: "text/markdown", textExcerpt: "y".repeat(500) },
    ]);
    expect(prompt.length).toBeLessThanOrEqual(AI_CHAT_MESSAGE_MAX_CHARS);
  });
});
