import type { BuiltinSnippet } from "@/types/snippets";
import { PLANTUML_BUILTIN_SNIPPETS } from "@/constants/snippets/plantuml-snippets";
import { MERMAID_BUILTIN_SNIPPETS } from "@/constants/snippets/mermaid-snippets";
import { WIREMARK_BUILTIN_SNIPPETS } from "@/constants/snippets/wiremark-snippets";
import { D2_BUILTIN_SNIPPETS } from "@/constants/snippets/d2-snippets";
import { STRUCTURIZR_BUILTIN_SNIPPETS } from "@/constants/snippets/structurizr-snippets";

export const BUILTIN_SNIPPETS: BuiltinSnippet[] = [
  ...PLANTUML_BUILTIN_SNIPPETS,
  ...MERMAID_BUILTIN_SNIPPETS,
  ...WIREMARK_BUILTIN_SNIPPETS,
  ...D2_BUILTIN_SNIPPETS,
  ...STRUCTURIZR_BUILTIN_SNIPPETS,
];

export function findBuiltinSnippet(id: string): BuiltinSnippet | undefined {
  return BUILTIN_SNIPPETS.find((snippet) => snippet.id === id);
}
