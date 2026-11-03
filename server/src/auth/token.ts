import crypto from "node:crypto";
import { AUTH_TOKEN_SECRET } from "../config.js";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
  exp: number;
}

export function createAuthToken(userId: string): string {
  const payload: TokenPayload = {
    sub: userId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyAuthToken(token: string): { userId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [body, signature] = parts;
  const expected = crypto
    .createHmac("sha256", AUTH_TOKEN_SECRET)
    .update(body)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (!payload.sub || payload.exp < Date.now()) {
      return null;
    }
    return { userId: payload.sub };
  } catch {
    return null;
  }
}
