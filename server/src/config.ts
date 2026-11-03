import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.dirname(fileURLToPath(import.meta.url));

export const NODE_ENV = process.env.NODE_ENV?.trim() || "development";
export const IS_PRODUCTION = NODE_ENV === "production";

export const SERVER_PORT = Number(process.env.PORT ?? 3001);

export const MAX_PUML_FILE_BYTES = Number(
  process.env.MAX_PUML_FILE_BYTES ?? 512_000,
);

export const DB_PATH =
  process.env.DB_PATH ?? path.resolve(serverRoot, "../../data/library.db");

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || undefined;
export const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() || undefined;
export const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY?.trim() || undefined;

export const LLM_RATE_LIMIT_PER_MINUTE = Number(
  process.env.LLM_RATE_LIMIT_PER_MINUTE ?? 20,
);

/** Limits for the free LLM proxy: one request must not burn the whole quota. */
export const LLM_MAX_MESSAGES = Number(process.env.LLM_MAX_MESSAGES ?? 20);
export const LLM_MAX_MESSAGE_CHARS = Number(
  process.env.LLM_MAX_MESSAGE_CHARS ?? 8_000,
);
export const LLM_MAX_TOTAL_CHARS = Number(
  process.env.LLM_MAX_TOTAL_CHARS ?? 32_000,
);
export const LLM_MAX_OUTPUT_TOKENS = Number(
  process.env.LLM_MAX_OUTPUT_TOKENS ?? 2_048,
);

/** Login brute-force protection. */
export const LOGIN_MAX_ATTEMPTS = Number(
  process.env.LOGIN_MAX_ATTEMPTS ?? 10,
);
export const LOGIN_WINDOW_MS = Number(
  process.env.LOGIN_WINDOW_MS ?? 15 * 60 * 1000,
);
export const LOGIN_LOCKOUT_MS = Number(
  process.env.LOGIN_LOCKOUT_MS ?? 15 * 60 * 1000,
);

/** Share links expire by default; permanent links require an explicit flag. */
export const SHARE_LINK_DEFAULT_TTL_DAYS = Number(
  process.env.SHARE_LINK_DEFAULT_TTL_DAYS ?? 30,
);

const DEV_AUTH_TOKEN_SECRET = "code2graph-dev-auth-secret-change-me";

const configuredAuthTokenSecret = process.env.AUTH_TOKEN_SECRET?.trim();

/**
 * In production a real secret is mandatory: a default value would let anyone
 * forge a Bearer token. Fail fast instead of silently running insecurely.
 */
if (IS_PRODUCTION) {
  if (!configuredAuthTokenSecret) {
    throw new Error(
      "AUTH_TOKEN_SECRET must be set in production (see deploy/server.env.example)",
    );
  }
  if (configuredAuthTokenSecret === DEV_AUTH_TOKEN_SECRET) {
    throw new Error(
      "AUTH_TOKEN_SECRET still equals the development default — set a random secret",
    );
  }
  if (configuredAuthTokenSecret.length < 32) {
    throw new Error("AUTH_TOKEN_SECRET must be at least 32 characters long");
  }
}

export const AUTH_TOKEN_SECRET =
  configuredAuthTokenSecret || DEV_AUTH_TOKEN_SECRET;

export const SHARED_SECTION_TITLE =
  process.env.SHARED_SECTION_TITLE?.trim() || "Общие";

export const REGISTRATION_ENABLED =
  process.env.REGISTRATION_ENABLED?.trim() !== "false";

export const AGENT_API_TOKEN = process.env.AGENT_API_TOKEN?.trim() || undefined;

/**
 * The agent API stays closed unless a token is configured. Opening it to the
 * public internet requires an explicit opt-in flag.
 */
export const AGENT_API_ALLOW_PUBLIC =
  process.env.AGENT_API_ALLOW_PUBLIC?.trim() === "true";

/** Allowed browser origins for CORS. `*` is never used. */
const DEFAULT_CORS_ORIGINS = [
  "https://code2graph.ru",
  "https://www.code2graph.ru",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export const CORS_ORIGINS = (() => {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return DEFAULT_CORS_ORIGINS;
  }
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
})();

export const DIAGRAM_LANGUAGES = [
  "plantuml",
  "mermaid",
  "graphviz",
  "graphml",
  "wiremark",
  "d2",
  "structurizr",
  "ditaa",
  "other",
] as const;

export type DiagramLanguage = (typeof DIAGRAM_LANGUAGES)[number];

export function isDiagramLanguage(value: string): value is DiagramLanguage {
  return (DIAGRAM_LANGUAGES as readonly string[]).includes(value);
}
