export class DiagramImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiagramImageError";
  }
}
