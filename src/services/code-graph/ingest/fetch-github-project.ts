import type { RawProjectFile } from "@/services/code-graph/ingest/project-files";

export interface GitHubProjectRef {
  owner: string;
  repo: string;
  ref: string;
  subPath: string;
}

const GITHUB_API = "https://api.github.com";

export function parseGitHubProjectUrl(input: string): GitHubProjectRef | null {
  const trimmed = input.trim();

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
      ref: "HEAD",
      subPath: "",
    };
  }

  const httpsMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+)(?:\/(.*))?)?\/?$/,
  );
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2].replace(/\.git$/, ""),
      ref: httpsMatch[3] ?? "HEAD",
      subPath: httpsMatch[4] ?? "",
    };
  }

  const shortMatch = trimmed.match(/^([^/]+)\/([^/]+)(?:@([^/]+))?(?:\/(.*))?$/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      ref: shortMatch[3] ?? "HEAD",
      subPath: shortMatch[4] ?? "",
    };
  }

  return null;
}

async function githubFetch(
  url: string,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token?.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`CODE_GRAPH_GITHUB_${response.status}`);
  }

  return response;
}

async function resolveDefaultBranch(
  owner: string,
  repo: string,
  token?: string,
): Promise<string> {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}`,
    token,
  );
  const data = (await response.json()) as { default_branch?: string };
  return data.default_branch ?? "main";
}

async function fetchRepoTree(
  owner: string,
  repo: string,
  ref: string,
  token?: string,
): Promise<Array<{ path: string; type: string; sha: string; size?: number }>> {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  );
  const data = (await response.json()) as {
    tree?: Array<{ path: string; type: string; sha: string; size?: number }>;
  };
  return data.tree ?? [];
}

async function fetchBlobContent(
  owner: string,
  repo: string,
  sha: string,
  token?: string,
): Promise<string> {
  const response = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/blobs/${sha}`,
    token,
  );
  const data = (await response.json()) as { content?: string; encoding?: string };
  if (data.encoding !== "base64" || !data.content) {
    return "";
  }

  const binary = atob(data.content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

export async function fetchGitHubProject(
  input: string,
  token?: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ rootName: string; files: RawProjectFile[] }> {
  const ref = parseGitHubProjectUrl(input);
  if (!ref) {
    throw new Error("CODE_GRAPH_GITHUB_INVALID_URL");
  }

  const branch = ref.ref === "HEAD"
    ? await resolveDefaultBranch(ref.owner, ref.repo, token)
    : ref.ref;

  const tree = await fetchRepoTree(ref.owner, ref.repo, branch, token);
  const prefix = ref.subPath ? `${ref.subPath.replace(/\/$/, "")}/` : "";
  const blobs = tree.filter(
    (entry) =>
      entry.type === "blob" &&
      (!prefix || entry.path.startsWith(prefix)),
  );

  const files: RawProjectFile[] = [];
  let loaded = 0;

  for (const blob of blobs) {
    const relativePath = prefix
      ? blob.path.slice(prefix.length)
      : blob.path;
    if (!relativePath) {
      continue;
    }

    const content = await fetchBlobContent(ref.owner, ref.repo, blob.sha, token);
    files.push({ relativePath, content });
    loaded += 1;
    onProgress?.(loaded, blobs.length);
  }

  return {
    rootName: `${ref.owner}-${ref.repo}`,
    files,
  };
}
