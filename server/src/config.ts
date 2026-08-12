import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.dirname(fileURLToPath(import.meta.url));

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

export const AUTH_TOKEN_SECRET =
  process.env.AUTH_TOKEN_SECRET?.trim() ||
  "code2graph-dev-auth-secret-change-me";

export const SHARED_SECTION_TITLE =
  process.env.SHARED_SECTION_TITLE?.trim() || "Общие";

export const REGISTRATION_ENABLED =
  process.env.REGISTRATION_ENABLED?.trim() !== "false";

export const DIAGRAM_LANGUAGES = [
  "plantuml",
  "mermaid",
  "graphviz",
  "graphml",
  "ditaa",
  "other",
] as const;

export type DiagramLanguage = (typeof DIAGRAM_LANGUAGES)[number];

export function isDiagramLanguage(value: string): value is DiagramLanguage {
  return (DIAGRAM_LANGUAGES as readonly string[]).includes(value);
}
