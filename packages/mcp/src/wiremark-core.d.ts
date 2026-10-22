declare module "@wiremark/core" {
  export function render(
    input: string,
    options?: {
      theme?: "light" | "dark";
      interactive?: boolean;
    },
  ): {
    svg: string;
    diagnostics: unknown[];
  };
}
