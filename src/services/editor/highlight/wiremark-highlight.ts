import {
  WIREMARK_COMPONENTS,
  WIREMARK_DIRECTIVES,
  WIREMARK_MODIFIERS,
} from "@/languages/keywords/wiremark";
import {
  escapeHtml,
  type HighlightToken,
  type HighlightTokenType,
} from "@/utils/plantuml-highlight";

const DIRECTIVES = new Set<string>(WIREMARK_DIRECTIVES);
const COMPONENTS = new Set<string>(WIREMARK_COMPONENTS);
const MODIFIERS = new Set<string>(
  WIREMARK_MODIFIERS.map((modifier) => modifier.toLowerCase()),
);

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

export function highlightWiremarkLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let index = 0;
  let seenComponent = false;

  while (index < line.length) {
    const current = line[index];

    if (current === "/" && line[index + 1] === "/") {
      pushToken(tokens, "comment", line.slice(index));
      break;
    }

    if (current === '"') {
      let end = index + 1;
      while (end < line.length && line[end] !== '"') {
        end += 1;
      }
      if (end < line.length) {
        end += 1;
      }
      pushToken(tokens, "string", line.slice(index, end));
      index = end;
      continue;
    }

    if (current === "#") {
      const anchor = line.slice(index).match(/^#[A-Za-z_][\w-]*/);
      if (anchor) {
        pushToken(tokens, "variable", anchor[0]);
        index += anchor[0].length;
        continue;
      }
    }

    if (/[A-Za-z_]/.test(current)) {
      const name = line.slice(index).match(/^[A-Za-z_][\w]*/);
      if (name) {
        const text = name[0];
        const next = line[index + text.length];
        const previous = index === 0 ? " " : line[index - 1];
        let type: HighlightTokenType = "plain";

        if (DIRECTIVES.has(text)) {
          type = "directive";
          seenComponent = true;
        } else if (COMPONENTS.has(text)) {
          type = "keyword";
          seenComponent = true;
        } else if (
          !seenComponent &&
          /^[A-Z]/.test(text) &&
          /\s/.test(previous)
        ) {
          type = "keyword";
          seenComponent = true;
        } else if (MODIFIERS.has(text.toLowerCase()) || next === "=") {
          type = "keyword";
        }

        pushToken(tokens, type, text);
        index += text.length;
        continue;
      }
    }

    if (/\d/.test(current)) {
      const number = line.slice(index).match(/^\d+(?:\.\d+)?%?/);
      if (number && (index === 0 || /[\s=]/.test(line[index - 1]))) {
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

export function renderWiremarkHighlightedLine(line: string): string {
  return highlightWiremarkLine(line)
    .map(
      (token) =>
        `<span class="tok-${token.type}">${escapeHtml(token.text)}</span>`,
    )
    .join("");
}
