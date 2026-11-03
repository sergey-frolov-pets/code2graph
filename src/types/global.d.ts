import type { PlantUmlApi } from "@/types/plantuml";

export {};

declare global {
  interface Window {
    Viz?: unknown;
    PlantUML?: PlantUmlApi;
  }
}
