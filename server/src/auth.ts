import { createMiddleware } from "hono/factory";
import { getRequestUser, type AuthVariables } from "./auth/context.js";
import { verifyAuthToken } from "./auth/token.js";
import { isLibraryAuthEnabled } from "./config.js";
import { ensureDbBootstrapped, getDb } from "./db.js";
import { authenticateUser, getUserById } from "./users.js";

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

async function resolveUserFromAuthorization(
  authorization: string | undefined,
): Promise<import("./types.js").UserDto | null> {
  const database = getDb();

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7).trim();
    const verified = verifyAuthToken(token);
    if (!verified) {
      return null;
    }
    return getUserById(database, verified.userId);
  }

  if (authorization?.startsWith("Basic ")) {
    const credentials = parseBasicAuth(authorization);
    if (!credentials) {
      return null;
    }
    return authenticateUser(
      database,
      credentials.username,
      credentials.password,
    );
  }

  return null;
}

export const libraryAuthMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (context, next) => {
    await ensureDbBootstrapped();
    let user = await resolveUserFromAuthorization(
      context.req.header("Authorization"),
    );

    if (!user && !isLibraryAuthEnabled()) {
      const database = getDb();
      const adminRow = database
        .prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
        .get() as { id: string } | undefined;
      if (adminRow) {
        user = getUserById(database, adminRow.id);
      }
    }

    if (isLibraryAuthEnabled() && !user) {
      return context.json({ error: "Authentication required" }, 401);
    }

    if (user?.blocked) {
      return context.json({ error: "Account blocked" }, 403);
    }

    context.set("user", user);
    await next();
  },
);

export async function resolveOptionalUser(
  authorization: string | undefined,
): Promise<import("./types.js").UserDto | null> {
  const user = await resolveUserFromAuthorization(authorization);
  if (user?.blocked) {
    return null;
  }
  return user;
}

export function requireAuthenticatedUser(
  context: { get: (key: "user") => import("./types.js").UserDto | null },
): import("./types.js").UserDto | Response {
  const user = getRequestUser(context as never);
  if (!user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
