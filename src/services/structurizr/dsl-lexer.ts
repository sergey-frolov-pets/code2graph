import {
  IDENT_PART,
  IDENT_START,
  StructurizrParseError,
  type Token,
  type TokenKind,
} from "@/services/structurizr/dsl-types";

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;

  const push = (kind: TokenKind, text: string, tokenLine: number) => {
    tokens.push({ kind, text, line: tokenLine });
  };

  while (index < source.length) {
    const current = source[index];

    if (current === "\n") {
      line += 1;
      index += 1;
      continue;
    }

    if (current === "\r" || current === " " || current === "\t") {
      index += 1;
      continue;
    }

    if (current === "/" && source[index + 1] === "/") {
      while (index < source.length && source[index] !== "\n") {
        index += 1;
      }
      continue;
    }

    if (current === "/" && source[index + 1] === "*") {
      const startLine = line;
      index += 2;
      while (
        index < source.length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        if (source[index] === "\n") {
          line += 1;
        }
        index += 1;
      }
      if (index >= source.length) {
        throw new StructurizrParseError(startLine, "structurizr.unclosedBlock");
      }
      index += 2;
      continue;
    }

    if (current === '"') {
      const startLine = line;
      index += 1;
      let value = "";
      while (index < source.length && source[index] !== '"') {
        if (source[index] === "\\" && index + 1 < source.length) {
          value += source[index + 1];
          index += 2;
          continue;
        }
        if (source[index] === "\n") {
          line += 1;
        }
        value += source[index];
        index += 1;
      }
      if (source[index] !== '"') {
        throw new StructurizrParseError(startLine, "structurizr.unclosedString");
      }
      index += 1;
      push("string", value, startLine);
      continue;
    }

    if (current === "{") {
      push("lbrace", "{", line);
      index += 1;
      continue;
    }

    if (current === "}") {
      push("rbrace", "}", line);
      index += 1;
      continue;
    }

    if (current === "=") {
      push("equals", "=", line);
      index += 1;
      continue;
    }

    if (current === "-" && source[index + 1] === ">") {
      push("arrow", "->", line);
      index += 2;
      continue;
    }

    if (current === "*") {
      push("star", "*", line);
      index += 1;
      continue;
    }

    if (current === ".") {
      push("dot", ".", line);
      index += 1;
      continue;
    }

    if (current === "#") {
      const start = index;
      index += 1;
      while (index < source.length && /[0-9A-Fa-f]/.test(source[index])) {
        index += 1;
      }
      push("color", source.slice(start, index), line);
      continue;
    }

    if (/\d/.test(current)) {
      const start = index;
      while (index < source.length && /[\d.]/.test(source[index])) {
        index += 1;
      }
      push("number", source.slice(start, index), line);
      continue;
    }

    if (IDENT_START.test(current)) {
      const start = index;
      index += 1;
      while (index < source.length && IDENT_PART.test(source[index])) {
        index += 1;
      }
      push("ident", source.slice(start, index), line);
      continue;
    }

    throw new StructurizrParseError(line, "structurizr.unexpected", {
      token: current,
    });
  }

  push("eof", "", line);
  return tokens;
}

export function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function identifierFromName(name: string): string {
  const parts = name.match(/[A-Za-z0-9]+/g) ?? [];
  const camel = parts
    .map((part, partIndex) => {
      const lower = part.toLowerCase();
      if (partIndex === 0) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");

  return /^[A-Za-z]/.test(camel) ? camel : "element";
}
