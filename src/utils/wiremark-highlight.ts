import {
  escapeHtml,
  type HighlightToken,
  type HighlightTokenType,
} from "@/utils/plantuml-highlight";

const DIRECTIVES = new Set(["Wireframe", "Flow", "Icons"]);

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

    if (!seenComponent && /[A-Z]/.test(current)) {
      const name = line.slice(index).match(/^[A-Z][A-Za-z0-9]*/);
      const previous = index === 0 ? " " : line[index - 1];
      if (name && /\s/.test(previous)) {
        pushToken(
          tokens,
          DIRECTIVES.has(name[0]) ? "directive" : "keyword",
          name[0],
        );
        seenComponent = true;
        index += name[0].length;
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
