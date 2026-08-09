import { expect, vi } from "vitest";

export const TEST_API_BASE = "https://api.test/api";

export function jsonResponse(
  body: unknown,
  status = 200,
  init: ResponseInit = {},
): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });
}

export function createFetchMock() {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function expectFetchUrl(
  fetchMock: ReturnType<typeof createFetchMock>,
  index: number,
  expectedUrl: string,
): void {
  expect(fetchMock.mock.calls[index]?.[0]).toBe(expectedUrl);
}

export function expectFetchMethod(
  fetchMock: ReturnType<typeof createFetchMock>,
  index: number,
  expectedMethod: string,
): void {
  const init = fetchMock.mock.calls[index]?.[1] as RequestInit | undefined;
  expect(init?.method ?? "GET").toBe(expectedMethod);
}
