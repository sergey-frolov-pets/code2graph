import { describe, expect, it } from "vitest";
import {
  containsForbiddenClientLlmKeyField,
  parseLlmProxyChatBody,
} from "./llm-proxy-request.js";

const validMessages = [{ role: "user" as const, content: "hello" }];

describe("llm-proxy-request", () => {
  it("rejects bodies that include client apiKey fields", () => {
    expect(
      containsForbiddenClientLlmKeyField({
        providerId: "google-gemini-free",
        messages: validMessages,
        apiKey: "sk-user-secret",
      }),
    ).toBe(true);

    expect(
      parseLlmProxyChatBody({
        providerId: "google-gemini-free",
        messages: validMessages,
        apiKey: "sk-user-secret",
      }),
    ).toBeNull();
  });

  it("rejects BYOK provider ids (only free_builtin allowed on server)", () => {
    expect(
      parseLlmProxyChatBody({
        providerId: "google-gemini",
        messages: validMessages,
      }),
    ).toBeNull();
  });

  it("accepts free_builtin proxy requests without client keys", () => {
    const body = parseLlmProxyChatBody({
      providerId: "google-gemini-free",
      messages: validMessages,
      jsonMode: true,
    });

    expect(body).toEqual({
      providerId: "google-gemini-free",
      messages: validMessages,
      jsonMode: true,
    });
  });

  it("accepts a user image and rejects an unknown mime type", () => {
    const png = "iVBORw0KGgo=";
    const body = parseLlmProxyChatBody({
      providerId: "google-gemini-free",
      messages: [
        {
          role: "user",
          content: "look",
          images: [{ mimeType: "image/png", dataBase64: png }],
        },
      ],
    });
    expect(body?.messages[0]?.images).toEqual([{ mimeType: "image/png", dataBase64: png }]);

    expect(
      parseLlmProxyChatBody({
        providerId: "google-gemini-free",
        messages: [
          {
            role: "user",
            content: "look",
            images: [{ mimeType: "image/svg+xml", dataBase64: png }],
          },
        ],
      }),
    ).toBeNull();
  });
});
