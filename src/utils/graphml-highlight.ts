import {
  escapeHtml,
  type HighlightToken,
  type HighlightTokenType,
} from "@/utils/plantuml-highlight";

const ROOT_TAGS = new Set(["graphml", "graph"]);
const ELEMENT_TAGS = new Set([
  "node",
  "edge",
  "key",
  "data",
  "desc",
  "loc",
  "port",
  "hyperedge",
  "endpoint",
]);

const ATTRIBUTE_PATTERN =
  /\s+([A-Za-z_:][\w:.-]*)(?:\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s/>]+))?/g;

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

function pushPlain(tokens: HighlightToken[], text: string): void {
  pushToken(tokens, "plain", text);
}

function classifyTagName(name: string): HighlightTokenType {
  const lower = name.toLowerCase();

  if (ROOT_TAGS.has(lower)) {
    return "directive";
  }

  if (ELEMENT_TAGS.has(lower)) {
    return "keyword";
  }

  return "plain";
}

function highlightTagContent(tokens: HighlightToken[], tag: string): void {
  if (!tag.startsWith("<")) {
    pushPlain(tokens, tag);
    return;
  }

  const closing = tag.startsWith("</");
  const selfClosing = tag.endsWith("/>");
  const openBracketLength = closing ? 2 : 1;
  const closeBracketLength = selfClosing ? 2 : 1;
  const inner = tag.slice(
    openBracketLength,
    tag.length - closeBracketLength,
  );

  pushPlain(tokens, tag.slice(0, openBracketLength));

  const nameMatch = inner.match(/^([A-Za-z_:][\w:.-]*)/);
  if (!nameMatch) {
    pushPlain(tokens, inner);
    pushPlain(tokens, tag.slice(tag.length - closeBracketLength));
    return;
  }

  const tagName = nameMatch[0];
  pushToken(tokens, classifyTagName(tagName), tagName);

  let cursor = tagName.length;
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let attributeMatch = ATTRIBUTE_PATTERN.exec(inner);

  while (attributeMatch) {
    pushPlain(tokens, inner.slice(cursor, attributeMatch.index));
    pushToken(tokens, "variable", attributeMatch[1]);

    const value = attributeMatch[2];
    if (value) {
      pushPlain(tokens, "=");
      if (value.startsWith('"') || value.startsWith("'")) {
        pushToken(tokens, "string", value);
      } else {
        pushToken(tokens, "number", value);
      }
    }

    cursor = attributeMatch.index + attributeMatch[0].length;
    attributeMatch = ATTRIBUTE_PATTERN.exec(inner);
  }

  pushPlain(tokens, inner.slice(cursor));
  pushPlain(tokens, tag.slice(tag.length - closeBracketLength));
}

export function highlightGraphmlLine(line: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let index = 0;

  while (index < line.length) {
    if (line.startsWith("<!--", index)) {
      const end = line.indexOf("-->", index + 4);
      const commentEnd = end >= 0 ? end + 3 : line.length;
      pushToken(tokens, "comment", line.slice(index, commentEnd));
      index = commentEnd;
      continue;
    }

    if (line.startsWith("<?", index)) {
      const end = line.indexOf("?>", index + 2);
      const declarationEnd = end >= 0 ? end + 2 : line.length;
      pushToken(tokens, "preprocessor", line.slice(index, declarationEnd));
      index = declarationEnd;
      continue;
    }

    if (line[index] === "<") {
      let tagEnd = index + 1;
      let inQuote: '"' | "'" | null = null;

      while (tagEnd < line.length) {
        const char = line[tagEnd];

        if (inQuote) {
          if (char === inQuote) {
            inQuote = null;
          }
          tagEnd += 1;
          continue;
        }

        if (char === '"' || char === "'") {
          inQuote = char;
          tagEnd += 1;
          continue;
        }

        if (char === ">") {
          tagEnd += 1;
          break;
        }

        tagEnd += 1;
      }

      highlightTagContent(tokens, line.slice(index, tagEnd));
      index = tagEnd;
      continue;
    }

    const nextTag = line.indexOf("<", index);
    const segmentEnd = nextTag >= 0 ? nextTag : line.length;
    pushPlain(tokens, line.slice(index, segmentEnd));
    index = segmentEnd;
  }

  if (tokens.length === 0) {
    tokens.push({ type: "plain", text: line || " " });
  }

  return tokens;
}

export function renderGraphmlHighlightedLine(line: string): string {
  return highlightGraphmlLine(line)
    .map(
      (token) =>
        `<span class="tok-${token.type}">${escapeHtml(token.text)}</span>`,
    )
    .join("");
}
