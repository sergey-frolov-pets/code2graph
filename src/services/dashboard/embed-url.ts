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

const HTML_PREFIX = "code2graph-dashboard-html:";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Страница сразу открывает сам дашборд, без кадра. */
export function dashboardEmbedDocument(src: string, title: string): string {
  const safeTitle = escapeHtml(title.trim() || "Dashboard");
  const safeSrc = escapeHtml(src);
  const scriptSrc = JSON.stringify(src);
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url=${safeSrc}">
<title>${safeTitle}</title>
<script>location.replace(${scriptSrc})</script>
</head>
<body>
<p><a href="${safeSrc}">${safeTitle}</a></p>
</body>
</html>
`;
}

export function readDashboardEmbedHtml(diagramId: string): string {
  try {
    return localStorage.getItem(HTML_PREFIX + diagramId) ?? "";
  } catch {
    return "";
  }
}

export function writeDashboardEmbedHtml(diagramId: string, html: string): void {
  try {
    localStorage.setItem(HTML_PREFIX + diagramId, html);
  } catch {
    // The downloaded file still keeps a copy.
  }
}

export function downloadTextFile(filename: string, contents: string, type: string): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
