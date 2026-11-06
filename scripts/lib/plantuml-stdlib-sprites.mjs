/**
 * Разбор бандлов стандартной библиотеки PlantUML (`*.min.js`).
 * Внутри строки перевода строк записаны как `;`, чтобы офлайн-рендер
 * мог положить спрайты в обычные `.puml`.
 */

const STDLIB_ASSIGNMENT_PREFIX = "PLANTUML_STDLIB.";

export const C4_OFFLINE_SPRITE_LIBRARIES = [
  {
    id: "office",
    groups: null,
  },
  {
    id: "tupadr3",
    groups: ["devicons", "font-awesome-5"],
  },
];

export const OPENICONIC_BUNDLE_FILE = "openiconic.js";

const SPRITE_KEY_PATTERN = /^[\w.-]+(?:\/[\w.-]+)*$/;

const STDLIB_NEWLINE = ";";

function decodeJsString(literal) {
  let decoded = "";

  for (let index = 0; index < literal.length; index += 1) {
    const char = literal[index];
    if (char !== "\\") {
      decoded += char;
      continue;
    }

    index += 1;
    const escaped = literal[index];
    switch (escaped) {
      case "n":
        decoded += "\n";
        break;
      case "r":
        decoded += "\r";
        break;
      case "t":
        decoded += "\t";
        break;
      case "\\":
      case '"':
      case "'":
        decoded += escaped;
        break;
      case "u": {
        const hex = literal.slice(index + 1, index + 5);
        decoded += String.fromCharCode(Number.parseInt(hex, 16));
        index += 4;
        break;
      }
      default:
        decoded += escaped ?? "";
        break;
    }
  }

  return decoded;
}

function readJsString(source, quoteIndex) {
  if (source[quoteIndex] !== '"') {
    throw new Error("Stdlib sprite value is not a string");
  }

  let index = quoteIndex + 1;
  let literal = "";
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      literal += char + (source[index + 1] ?? "");
      index += 2;
      continue;
    }
    if (char === '"') {
      return { value: decodeJsString(literal), nextIndex: index + 1 };
    }
    literal += char;
    index += 1;
  }

  throw new Error("Unclosed stdlib sprite string");
}

export function isBundledC4Sprite(libraryId, key) {
  if (!SPRITE_KEY_PATTERN.test(key) || key.split("/").includes("..")) {
    return false;
  }

  const library = C4_OFFLINE_SPRITE_LIBRARIES.find(
    (item) => item.id === libraryId,
  );
  if (!library || key.startsWith("_")) {
    return false;
  }

  if (!library.groups) {
    return true;
  }

  return library.groups.includes(key.split("/")[0]);
}

export function readStdlibSpriteFiles(source, libraryId) {
  const marker = `${STDLIB_ASSIGNMENT_PREFIX}${libraryId}["`;
  const files = [];
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const markerIndex = source.indexOf(marker, searchFrom);
    if (markerIndex < 0) {
      break;
    }

    const keyStart = markerIndex + marker.length;
    const keyEnd = source.indexOf('"]', keyStart);
    if (keyEnd < 0) {
      throw new Error(`Broken stdlib key in ${libraryId}`);
    }

    const key = source.slice(keyStart, keyEnd);
    const quoteIndex = source.indexOf('"', keyEnd + 2);
    const { value, nextIndex } = readJsString(source, quoteIndex);
    searchFrom = nextIndex;

    if (!isBundledC4Sprite(libraryId, key)) {
      continue;
    }

    files.push({
      key,
      relativePath: `${libraryId}/${key}.puml`,
      contents: value.replaceAll(STDLIB_NEWLINE, "\n"),
    });
  }

  return files;
}
