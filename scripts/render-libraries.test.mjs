import assert from "node:assert/strict";
import test from "node:test";
import {
  ARCHIMATE_LIBRARY_ID,
  C4_LIBRARY_ID,
  GIT_REF_RELEASE_BRANCH,
  GIT_REF_TAG,
  STATUS_AHEAD,
  STATUS_MISSING,
  STATUS_UP_TO_DATE,
  STATUS_UPDATE,
  buildReport,
  compareVersions,
  formatCommitMessage,
  gitLibrary,
  installedNpmVersion,
  libraryVersionLabel,
  nextGitPin,
  npmLatestUrl,
  readCatalog,
  updatesInReport,
  versionStatus,
} from "./render-libraries.mjs";

test("compareVersions orders release numbers and prereleases", () => {
  assert.equal(compareVersions("1.2026.6", "1.2026.6"), 0);
  assert.equal(compareVersions("1.2026.6", "1.2026.7"), -1);
  assert.equal(compareVersions("v2.14.0", "2.13.0"), 1);
  assert.equal(compareVersions("11.0.0-rc.1", "11.0.0"), -1);
  assert.equal(compareVersions("0.1.34", "0.1.35"), -1);
});

test("versionStatus marks missing installs and available updates", () => {
  assert.equal(versionStatus(null, "1.0.0"), STATUS_MISSING);
  assert.equal(versionStatus("1.0.0", "1.0.0"), STATUS_UP_TO_DATE);
  assert.equal(versionStatus("1.0.0", "1.1.0"), STATUS_UPDATE);
  assert.equal(versionStatus("2.0.0", "1.9.0"), STATUS_AHEAD);
});

test("updatesInReport does not downgrade a pin that is already newer", () => {
  const pending = updatesInReport({
    items: [
      { status: STATUS_AHEAD, title: "mermaid" },
      { status: STATUS_UP_TO_DATE, title: "@d2lang/d2" },
      { status: STATUS_UPDATE, title: "C4-PlantUML" },
      { status: STATUS_MISSING, title: "@wiremark/core" },
    ],
  });
  assert.deepEqual(
    pending.map((item) => item.title),
    ["C4-PlantUML", "@wiremark/core"],
  );
});

test("nextGitPin keeps C4 on the release branch and Archimate on the tag", () => {
  const releaseBranch = nextGitPin(
    {
      id: C4_LIBRARY_ID,
      title: "C4-PlantUML",
      refKind: GIT_REF_RELEASE_BRANCH,
      ref: "release/v2.13.0",
      version: "2.13.0",
    },
    { tag_name: "v2.14.0", target_commitish: "release/v2.14.0" },
  );
  assert.equal(releaseBranch.ref, "release/v2.14.0");
  assert.equal(releaseBranch.version, "2.14.0");

  const tag = nextGitPin(
    {
      id: ARCHIMATE_LIBRARY_ID,
      title: "Archimate-PlantUML",
      refKind: GIT_REF_TAG,
      ref: "v3.2.2",
      version: "3.2.2",
    },
    { tag_name: "v3.2.3", target_commitish: "master" },
  );
  assert.equal(tag.ref, "v3.2.3");
  assert.equal(tag.version, "3.2.3");
});

test("nextGitPin refuses a C4 release that is not published from release/*", () => {
  assert.throws(
    () => nextGitPin(
      { title: "C4-PlantUML", refKind: GIT_REF_RELEASE_BRANCH },
      { tag_name: "v2.14.0", target_commitish: "master" },
    ),
    /release\//,
  );
});

test("catalog pins the render engines and both PlantUML libraries", () => {
  const catalog = readCatalog();
  assert.deepEqual(catalog.npm, [
    "@plantuml/core",
    "mermaid",
    "@d2lang/d2",
    "@wiremark/core",
  ]);
  assert.equal(gitLibrary(catalog, C4_LIBRARY_ID).ref, "release/v2.13.0");
  assert.equal(gitLibrary(catalog, ARCHIMATE_LIBRARY_ID).ref, "v3.2.2");
  assert.equal(libraryVersionLabel(gitLibrary(catalog, C4_LIBRARY_ID).version), "v2.13.0");
});

test("installedNpmVersion reads the lockfile package entry", () => {
  const version = installedNpmVersion(
    { packages: { "node_modules/mermaid": { version: "11.16.1" } } },
    "mermaid",
  );
  assert.equal(version, "11.16.1");
  assert.equal(installedNpmVersion({ packages: {} }, "mermaid"), null);
});

test("buildReport and commit message list only libraries that moved", () => {
  const catalog = {
    npm: ["mermaid"],
    git: [
      {
        id: C4_LIBRARY_ID,
        title: "C4-PlantUML",
        repository: "plantuml-stdlib/C4-PlantUML",
        version: "2.13.0",
      },
    ],
  };
  const report = buildReport({
    catalog,
    packageLock: { packages: { "node_modules/mermaid": { version: "11.16.1" } } },
    npmLatests: new Map([["mermaid", "11.16.1"]]),
    gitReleases: new Map([
      [C4_LIBRARY_ID, { tag_name: "v2.14.0", html_url: "https://example.test/c4" }],
    ]),
  });

  assert.equal(report.items[0].status, STATUS_UP_TO_DATE);
  assert.equal(report.items[1].status, STATUS_UPDATE);
  assert.match(formatCommitMessage(report), /C4-PlantUML 2\.13\.0 -> 2\.14\.0/);
  assert.equal(npmLatestUrl("@plantuml/core"), "https://registry.npmjs.org/@plantuml%2fcore/latest");
});
