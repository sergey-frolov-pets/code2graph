import { renderDiagramImage, type DiagramImage } from "./render-image.js";

export type DiagramToolContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export interface DiagramToolResult {
  [key: string]: unknown;
  content: DiagramToolContent[];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return { result: value };
}

function textResult(value: unknown): DiagramToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export function diagramToolResult(
  value: unknown,
  image?: DiagramImage,
): DiagramToolResult {
  const content: DiagramToolContent[] = [
    { type: "text", text: JSON.stringify(value, null, 2) },
  ];
  if (image) {
    content.push({
      type: "image",
      data: image.base64,
      mimeType: image.mimeType,
    });
  }
  return { content };
}

export async function attachDiagramImage(
  payload: unknown,
  render: (format: string, source: string) => Promise<DiagramImage> = renderDiagramImage,
): Promise<DiagramToolResult> {
  const record = asRecord(payload);
  const format = typeof record.format === "string" ? record.format : "";
  const source = typeof record.source === "string" ? record.source : "";

  if (!format || !source.trim()) {
    return textResult({
      ...record,
      imageError: format ? "Diagram source is empty" : "Diagram format is missing",
    });
  }

  try {
    const image = await render(format, source);
    return diagramToolResult(
      { ...record, imageMimeType: image.mimeType },
      image,
    );
  } catch (error) {
    const imageError = error instanceof Error ? error.message : String(error);
    return textResult({ ...record, imageError });
  }
}
