const TOKEN_KEY = "code2graph-billing-token";

export function readToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function writeToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const token = readToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "Ошибка запроса";
    throw new Error(message);
  }
  return payload;
}
