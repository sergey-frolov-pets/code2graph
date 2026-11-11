import readXlsxFile from "read-excel-file/universal";
import {
  AI_CHAT_ATTACHMENT_EXCERPT_MAX_CHARS,
  AI_CHAT_XLSX_MAX_COLUMNS,
  AI_CHAT_XLSX_MAX_ROWS,
  AI_CHAT_XLSX_MAX_SHEETS,
} from "@/constants/ai-chat";

const ISO_DATE_LENGTH = 10;

function formatCell(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, ISO_DATE_LENGTH);
  }
  return String(value).replace(/[\t\r\n]+/g, " ").trim();
}

/** Листы .xlsx в виде текста: имя листа и строки через табуляцию. */
export async function extractXlsxText(input: Blob): Promise<string> {
  const sheets = await readXlsxFile(input, { trim: true });
  const lines: string[] = [];
  let length = 0;
  let truncated = false;

  const pushLine = (line: string): boolean => {
    if (length >= AI_CHAT_ATTACHMENT_EXCERPT_MAX_CHARS) {
      truncated = true;
      return false;
    }
    lines.push(line);
    length += line.length + 1;
    return true;
  };

  sheets.slice(0, AI_CHAT_XLSX_MAX_SHEETS).forEach((sheet, sheetIndex) => {
    if (sheetIndex > 0 && !pushLine("")) {
      return;
    }
    if (!pushLine(`# ${sheet.sheet}`)) {
      return;
    }
    const rows = sheet.data.slice(0, AI_CHAT_XLSX_MAX_ROWS);
    if (sheet.data.length > AI_CHAT_XLSX_MAX_ROWS) {
      truncated = true;
    }
    for (const row of rows) {
      if (row.length > AI_CHAT_XLSX_MAX_COLUMNS) {
        truncated = true;
      }
      const cells = row.slice(0, AI_CHAT_XLSX_MAX_COLUMNS).map((cell) => formatCell(cell));
      if (cells.every((cell) => cell.length === 0)) {
        continue;
      }
      if (!pushLine(cells.join("\t"))) {
        return;
      }
    }
  });

  if (sheets.length > AI_CHAT_XLSX_MAX_SHEETS) {
    truncated = true;
  }
  if (truncated) {
    pushLine("…");
  }
  return lines.join("\n").trim();
}
