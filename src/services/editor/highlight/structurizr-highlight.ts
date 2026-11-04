import { STRUCTURIZR_KEYWORD_SET } from "@/languages/keywords/structurizr";
import {
  escapeHtml,
  type HighlightToken,
  type HighlightTokenType,
} from "@/utils/plantuml-highlight";

const STRUCTURIZR_ARROW = /^->/;

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

export function highlightStructurizrLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let index = 0;

  while (index < line.length) {
    const current = line[index];

    if (current === "/" && line[index + 1] === "/") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }

    if (current === "#") {
      const color = line.slice(index).match(/^#[0-9A-Fa-f]{3,8}/);
      if (color) {
        pushToken(tokens, "color", color[0]);
        index += color[0].length;
        continue;
      }
    }

    if (current === '"') {
      let end = index + 1;
      while (end < line.length && line[end] !== '"') {
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

    if (STRUCTURIZR_ARROW.test(line.slice(index))) {
      pushToken(tokens, "arrow", "->");
      index += 2;
      continue;
    }

    if (/[A-Za-z_!]/.test(current)) {
      const word = line.slice(index).match(/^[!A-Za-z_][\w]*/);
      if (word) {
        const keyword = STRUCTURIZR_KEYWORD_SET.has(word[0].toLowerCase());
        const directive = word[0].startsWith("!");
        pushToken(
          tokens,
          directive ? "preprocessor" : keyword ? "keyword" : "plain",
          word[0],
        );
        index += word[0].length;
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

export function renderStructurizrHighlightedLine(line: string): string {
  return highlightStructurizrLine(line)
    .map(
      (token) =>
        `<span class="tok-${token.type}">${escapeHtml(token.text)}</span>`,
    )
    .join("");
}
