#!/usr/bin/env node
/**
 * Проверка, что workflow запустил администратор репозитория.
 * Владелец репозитория допускается сразу. Остальных сверяем через
 * GitHub API: нужна роль admin.
 *
 * Переменные: GITHUB_ACTOR, GITHUB_REPOSITORY, GITHUB_TOKEN.
 */
import { pathToFileURL } from "node:url";
const GITHUB_API = "https://api.github.com";
const ADMIN_PERMISSION = "admin";
const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "code2graph-render-libraries";

export function adminAccess({ actor, owner, permission, apiStatus }) {
  if (actor && actor === owner) {
    return { ok: true, detail: `${actor} — владелец репозитория` };
  }

  if (apiStatus !== undefined && apiStatus !== 200) {
    return {
      ok: false,
      detail: `Не удалось проверить роль ${actor}: GitHub API ответил ${apiStatus}`,
    };
  }

  if (permission === ADMIN_PERMISSION) {
    return { ok: true, detail: `${actor}: ${permission}` };
  }

  return {
    ok: false,
    detail: `Этот workflow запускает только администратор репозитория. У ${actor} роль «${permission ?? "неизвестно"}».`,
  };
}

async function readPermission(owner, repo, actor, token, fetchImpl) {
  const response = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/collaborators/${actor}/permission`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    return { apiStatus: response.status, permission: null };
  }

  const payload = await response.json();
  return { apiStatus: response.status, permission: payload.permission };
}

async function main() {
  const actor = process.env.GITHUB_ACTOR ?? "";
  const repository = process.env.GITHUB_REPOSITORY ?? "";
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
  const [owner, repo] = repository.split("/");

  if (!actor || !owner || !repo) {
    console.error("require-repo-admin: нет GITHUB_ACTOR или GITHUB_REPOSITORY");
    process.exit(1);
  }

  let permission;
  let apiStatus;
  if (actor !== owner) {
    if (!token) {
      console.error("require-repo-admin: нет GITHUB_TOKEN");
      process.exit(1);
    }
    const result = await readPermission(owner, repo, actor, token, fetch);
    permission = result.permission;
    apiStatus = result.apiStatus;
  }

  const decision = adminAccess({ actor, owner, permission, apiStatus });
  if (!decision.ok) {
    console.error(decision.detail);
    process.exit(1);
  }

  console.log(decision.detail);
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
