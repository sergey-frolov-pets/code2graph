import { createMiddleware } from "hono/factory";
import {
  LIBRARY_AUTH_PASSWORD,
  LIBRARY_AUTH_USERNAME,
  isLibraryAuthEnabled,
} from "./config.js";

function parseBasicAuth(header: string | undefined): {
  username: string;
  password: string;
} | null {
  if (!header?.startsWith("Basic ")) {
    return null;
  }

  const encoded = header.slice(6).trim();
  if (!encoded) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    const colonIndex = decoded.indexOf(":");
    if (colonIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, colonIndex),
      password: decoded.slice(colonIndex + 1),
    };
  } catch {
    return null;
  }
}

export const libraryAuthMiddleware = createMiddleware(async (context, next) => {
  if (!isLibraryAuthEnabled()) {
    await next();
    return;
  }

  const credentials = parseBasicAuth(context.req.header("Authorization"));
  if (
    !credentials ||
    credentials.username !== LIBRARY_AUTH_USERNAME ||
    credentials.password !== LIBRARY_AUTH_PASSWORD
  ) {
    return context.json({ error: "Authentication required" }, 401);
  }

  await next();
});
