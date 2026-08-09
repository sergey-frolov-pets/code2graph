import type mermaid from "mermaid";

type MermaidApi = typeof mermaid;

let mermaidModule: MermaidApi | null = null;
let loadPromise: Promise<MermaidApi> | null = null;

export async function loadMermaid(): Promise<MermaidApi> {
  if (mermaidModule) {
    return mermaidModule;
  }

  if (!loadPromise) {
    loadPromise = import("mermaid").then((module) => {
      mermaidModule = module.default;
      return mermaidModule;
    });
  }

  return loadPromise;
}
