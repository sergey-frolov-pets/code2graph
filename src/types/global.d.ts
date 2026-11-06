import type { PlantUmlApi } from "@/types/plantuml";

export {};

declare global {
  interface Window {
    Viz?: unknown;
    PlantUML?: PlantUmlApi;
    PLANTUML_STDLIB_BASE?: string;
    PLANTUML_STDLIB_LOADER?: (
      bundleName: string,
      onLoad: () => void,
      onError: (message: string) => void,
    ) => boolean | void;
  }
}
