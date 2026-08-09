import { describe, expect, it } from "vitest";
import { LibraryApiError } from "./client";

describe("library api client", () => {
  it("creates LibraryApiError with status", () => {
    const error = new LibraryApiError("Not found", 404);
    expect(error.name).toBe("LibraryApiError");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Not found");
  });
});
