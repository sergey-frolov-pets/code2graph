export interface PlantUmlRenderOptions {
  dark?: boolean;
}

export interface PlantUmlApi {
  render(
    lines: string[],
    targetId: string,
    options?: PlantUmlRenderOptions,
  ): void;
  renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
    options?: PlantUmlRenderOptions,
  ): void;
}
