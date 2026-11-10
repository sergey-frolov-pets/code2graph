import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Hono } from "hono";
import {
  DEPLOYMENT_API_BASE_URL,
  PUBLIC_ORIGIN,
  STATIC_DIR,
} from "./config.js";

export function deploymentDocument(): {
  apiBaseUrl: string;
  publicOrigin: string;
} {
  return {
    apiBaseUrl: DEPLOYMENT_API_BASE_URL,
    publicOrigin: PUBLIC_ORIGIN,
  };
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".webmanifest")) return "application/manifest+json";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

export function registerStaticHost(app: Hono): void {
  app.get("/deployment.json", (context) => context.json(deploymentDocument()));

  if (!STATIC_DIR) {
    return;
  }

  const root = path.resolve(STATIC_DIR);
  app.get("*", (context) => {
    const requestPath = context.req.path;
    if (requestPath.startsWith("/api/") || requestPath === "/api") {
      return context.notFound();
    }

    const relative = decodeURIComponent(requestPath).replace(/^\/+/, "");
    const candidate = path.resolve(root, relative);
    const rootPrefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (candidate !== root && !candidate.startsWith(rootPrefix)) {
      return context.text("Bad path", 400);
    }

    let filePath = candidate;
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(root, "index.html");
    }

    if (!existsSync(filePath)) {
      return context.notFound();
    }

    const body = new Uint8Array(readFileSync(filePath));
    return context.body(body, 200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": filePath.endsWith("deployment.json")
        ? "no-store"
        : "public, max-age=3600",
    });
  });
}
