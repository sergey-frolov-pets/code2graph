import {
  escapeHtml,
  type HighlightToken,
  type HighlightTokenType,
} from "@/utils/plantuml-highlight";

const D2_KEYWORDS = new Set([
  "direction",
  "shape",
  "style",
  "class",
  "classes",
  "constraint",
  "label",
  "icon",
  "tooltip",
  "link",
  "near",
  "width",
  "height",
  "grid-rows",
  "grid-columns",
  "grid-gap",
  "animated",
  "fill",
  "stroke",
  "opacity",
  "bold",
  "italic",
  "underline",
]);

const D2_ARROW = /^(<->|->|<-|--)/;

function pushToken(
  tokens: HighlightToken[],
  type: HighlightTokenType,
  text: string,
): void {
  if (!text) {
    return;
  }

  const last = tokens[tokens.length - 1];
  if (last && last.type === type) {
    last.text += text;
    return;
  }

  tokens.push({ type, text });
}

export function highlightD2Line(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let index = 0;

  while (index < line.length) {
    const current = line[index];

    if (current === "#") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }

    if (current === '"' || current === "'") {
      const quote = current;
      let end = index + 1;
      while (end < line.length && line[end] !== quote) {
        if (line[end] === "\\" && end + 1 < line.length) {
          end += 2;
          continue;
        }
        end += 1;
      }
      if (end < line.length) {
        end += 1;
      }
      pushToken(tokens, "string", line.slice(index, end));
      index = end;
      continue;
    }

    const arrow = line.slice(index).match(D2_ARROW);
    if (arrow) {
      pushToken(tokens, "arrow", arrow[0]);
      index += arrow[0].length;
      continue;
    }

    if (/[A-Za-z_]/.test(current)) {
      const word = line.slice(index).match(/^[A-Za-z_][\w-]*/);
      if (word) {
        pushToken(
          tokens,
          D2_KEYWORDS.has(word[0]) ? "keyword" : "plain",
          word[0],
        );
        index += word[0].length;
        continue;
      }
    }

    if (/\d/.test(current)) {
      const number = line.slice(index).match(/^\d+(?:\.\d+)?/);
      if (number && (index === 0 || /[\s:={]/.test(line[index - 1] ?? ""))) {
        pushToken(tokens, "number", number[0]);
        index += number[0].length;
        continue;
      }
    }

    pushToken(tokens, "plain", current);
    index += 1;
  }

  if (tokens.length === 0) {
    tokens.push({ type: "plain", text: line || " " });
  }

  return tokens;
}

export function renderD2HighlightedLine(line: string): string {
  return highlightD2Line(line)
    .map(
      (token) =>
        `<span class="tok-${token.type}">${escapeHtml(token.text)}</span>`,
    )
    .join("");
}
