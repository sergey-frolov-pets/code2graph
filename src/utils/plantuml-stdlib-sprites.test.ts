import { describe, expect, it } from "vitest";
import {
  isBundledC4Sprite,
  readStdlibSpriteFiles,
} from "../../scripts/lib/plantuml-stdlib-sprites.mjs";

describe("C4 offline sprite bundles", () => {
  it("keeps Office icons and the icon sets used by C4 samples", () => {
    expect(isBundledC4Sprite("office", "users/users")).toBe(true);
    expect(isBundledC4Sprite("office", "_examples_/example")).toBe(false);
    expect(isBundledC4Sprite("tupadr3", "devicons/angular")).toBe(true);
    expect(isBundledC4Sprite("tupadr3", "font-awesome-5/server")).toBe(true);
    expect(isBundledC4Sprite("tupadr3", "font-awesome-6/server")).toBe(false);
    expect(isBundledC4Sprite("aws", "compute/ec2")).toBe(false);
    expect(isBundledC4Sprite("office", "../users")).toBe(false);
  });

  it("turns packed sprite lines into a local puml file", () => {
    const sprite = "sprite $users [1x1/16] {;ABCD;};;label\\nnext";
    const source = `window.PLANTUML_STDLIB.office["users/users"]=${JSON.stringify(sprite)};`;

    const files = readStdlibSpriteFiles(source, "office");

    expect(files).toEqual([
      {
        key: "users/users",
        relativePath: "office/users/users.puml",
        contents: "sprite $users [1x1/16] {\nABCD\n}\n\nlabel\\nnext",
      },
    ]);
  });
});
