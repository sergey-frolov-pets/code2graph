declare module "@wiremark/core" {
  export interface WiremarkLoc {
    line: number;
    col?: number;
  }

  export interface WiremarkDiagnostic {
    severity: "warning" | "error";
    message: string;
    loc?: WiremarkLoc;
  }

  export class WiremarkError extends Error {
    loc?: WiremarkLoc;
  }

  export function render(
    input: string,
    options?: {
      direction?: "TD" | "LR";
      theme?: "light" | "dark";
      interactive?: boolean;
    },
  ): { svg: string; diagnostics: WiremarkDiagnostic[] };
}
