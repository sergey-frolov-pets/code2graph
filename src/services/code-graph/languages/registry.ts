import { htmlLanguagePlugin } from "@/services/code-graph/languages/html";
import {
  javascriptLanguagePlugin,
  typescriptLanguagePlugin,
} from "@/services/code-graph/languages/javascript";
import { pythonLanguagePlugin } from "@/services/code-graph/languages/python";
import type { LanguagePlugin } from "@/services/code-graph/languages/types";

const LANGUAGE_PLUGINS: LanguagePlugin[] = [
  pythonLanguagePlugin,
  javascriptLanguagePlugin,
  typescriptLanguagePlugin,
  htmlLanguagePlugin,
];

export function getLanguagePlugin(language: string): LanguagePlugin | null {
  return LANGUAGE_PLUGINS.find((plugin) => plugin.id === language) ?? null;
}

export function getLanguagePluginForPath(path: string): LanguagePlugin | null {
  const lower = path.toLowerCase();
  return (
    LANGUAGE_PLUGINS.find((plugin) =>
      plugin.extensions.some((ext) => lower.endsWith(ext)),
    ) ?? null
  );
}

export function listRegisteredLanguages(): string[] {
  return LANGUAGE_PLUGINS.map((plugin) => plugin.id);
}

export { LANGUAGE_PLUGINS };
