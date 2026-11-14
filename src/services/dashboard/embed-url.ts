export function dashboardLocalEmbedUrl(origin: string, diagramId: string): string {
  const url = new URL(origin);
  url.hash = `#/embed/local/${encodeURIComponent(diagramId)}`;
  return url.toString();
}

export function dashboardServerEmbedUrl(
  origin: string,
  username: string,
  slug: string,
): string {
  const url = new URL(origin);
  url.hash = `#/embed/server/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
  return url.toString();
}

export function dashboardEmbedSnippet(src: string): string {
  return `<iframe src="${src}" title="Дашборд" style="width:100%;height:480px;border:0"></iframe>`;
}
