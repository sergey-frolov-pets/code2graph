export interface StdlibSpriteFile {
  key: string;
  relativePath: string;
  contents: string;
}

export function isBundledC4Sprite(libraryId: string, key: string): boolean;

export function readStdlibSpriteFiles(
  source: string,
  libraryId: string,
): StdlibSpriteFile[];
