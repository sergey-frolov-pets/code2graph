function detectCsvDelimiter(text: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          index += 1;
        } else {
          inQuotes = false;
        }
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === "\n") {
      break;
    }
    if (char === ",") {
      commas += 1;
    } else if (char === ";") {
      semicolons += 1;
    }
  }

  return semicolons > commas ? ";" : ",";
}

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectCsvDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char ?? "";
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char ?? "";
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  while (
    rows.length > 0 &&
    rows[rows.length - 1]?.every((item) => item.trim().length === 0)
  ) {
    rows.pop();
  }

  return rows;
}
