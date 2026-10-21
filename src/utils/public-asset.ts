/** Resolve a file from `public/` against Vite `base` (works on GitHub Pages subpaths). */
export function publicAsset(path: string): string {
  const relative = path.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "./";

  if (base.startsWith(".")) {
    return `./${relative}`;
  }

  return `${base.endsWith("/") ? base : `${base}/`}${relative}`;
}
