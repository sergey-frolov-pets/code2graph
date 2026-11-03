import type { MiddlewareHandler } from "hono";

/**
 * HTTP security headers for the library API.
 *
 * The API serves JSON only, so the policy can be strict: no inline scripts,
 * no framing, no referrer leakage. `connect-src` allows the analytics host
 * used by the frontend when it is served from the same origin.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://stats.code2graph.ru",
  "font-src 'self' data:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export function securityHeaders(): MiddlewareHandler {
  return async (context, next) => {
    await next();

    const headers = context.res.headers;
    headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=()",
    );
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Resource-Policy", "same-site");
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  };
}
