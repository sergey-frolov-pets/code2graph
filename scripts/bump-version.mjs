import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJsonPath = path.join(appRoot, "package.json");
const packageLockPath = path.join(appRoot, "package-lock.json");

function bumpPatchVersion(version) {
  const parts = version.split(".");
  if (parts.length !== 3) {
    throw new Error(`Invalid semver: ${version}`);
  }

  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const patch = Number(parts[2]);

  if ([major, minor, patch].some(Number.isNaN)) {
    throw new Error(`Invalid semver: ${version}`);
  }

  return `${major}.${minor}.${patch + 1}`;
}

function updatePackageJson(version) {
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const previousVersion = packageJson.version;
  packageJson.version = version;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return previousVersion;
}

function updatePackageLock(version) {
  const packageLock = JSON.parse(readFileSync(packageLockPath, "utf8"));
  packageLock.version = version;
  if (packageLock.packages?.[""]) {
    packageLock.packages[""].version = version;
  }
  writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const nextVersion = bumpPatchVersion(packageJson.version);
const previousVersion = updatePackageJson(nextVersion);
updatePackageLock(nextVersion);

console.log(`Version bumped: ${previousVersion} -> ${nextVersion}`);
