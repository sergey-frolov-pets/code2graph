import {
  LLM_KEY_CIPHER_PREFIX,
  LLM_KEY_IV_BYTES,
  LLM_KEY_KDF_INFO,
  LLM_KEY_KDF_SALT,
  LLM_KEY_SEED_MIN_LENGTH,
} from "@/constants/llm-account";

const AES_GCM = "AES-GCM";
const HKDF = "HKDF";
const SHA_256 = "SHA-256";
const AES_KEY_BITS = 256;
const RAW_KEY_FORMAT = "raw";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type LlmKeyCipherErrorCode = "missing_seed" | "decrypt_failed";

export class LlmKeyCipherError extends Error {
  readonly code: LlmKeyCipherErrorCode;

  constructor(code: LlmKeyCipherErrorCode) {
    super(code);
    this.name = "LlmKeyCipherError";
    this.code = code;
  }
}

let cachedSeed = "";
let cachedKey: Promise<CryptoKey> | null = null;

export function readLlmKeySeed(): string | null {
  const seed = import.meta.env.VITE_LLM_KEY_SEED?.trim() ?? "";
  if (seed.length < LLM_KEY_SEED_MIN_LENGTH) {
    return null;
  }

  return seed;
}

export function hasLlmKeySeed(): boolean {
  return readLlmKeySeed() !== null;
}

export function isSealedLlmApiKey(value: string): boolean {
  return value.startsWith(LLM_KEY_CIPHER_PREFIX);
}

export async function sealLlmApiKey(apiKey: string, providerId: string): Promise<string> {
  if (!apiKey) {
    return "";
  }

  const seed = readLlmKeySeed();
  if (!seed) {
    throw new LlmKeyCipherError("missing_seed");
  }

  const iv = crypto.getRandomValues(new Uint8Array(LLM_KEY_IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    {
      name: AES_GCM,
      iv,
      additionalData: textEncoder.encode(providerId),
    },
    await deriveAesKey(seed),
    textEncoder.encode(apiKey),
  );

  return `${LLM_KEY_CIPHER_PREFIX}${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
}

export async function openLlmApiKey(stored: string, providerId: string): Promise<string> {
  if (!stored) {
    return "";
  }

  if (!isSealedLlmApiKey(stored)) {
    return stored;
  }

  const seed = readLlmKeySeed();
  if (!seed) {
    throw new LlmKeyCipherError("missing_seed");
  }

  const payload = stored.slice(LLM_KEY_CIPHER_PREFIX.length);
  const separator = payload.indexOf(".");
  if (separator <= 0) {
    throw new LlmKeyCipherError("decrypt_failed");
  }

  const iv = base64ToBytes(payload.slice(0, separator));
  const cipher = base64ToBytes(payload.slice(separator + 1));
  if (!iv || !cipher || iv.length !== LLM_KEY_IV_BYTES) {
    throw new LlmKeyCipherError("decrypt_failed");
  }

  try {
    const plain = await crypto.subtle.decrypt(
      {
        name: AES_GCM,
        iv,
        additionalData: textEncoder.encode(providerId),
      },
      await deriveAesKey(seed),
      cipher,
    );
    return textDecoder.decode(plain);
  } catch (error) {
    if (error instanceof LlmKeyCipherError) {
      throw error;
    }
    throw new LlmKeyCipherError("decrypt_failed");
  }
}

async function deriveAesKey(seed: string): Promise<CryptoKey> {
  if (cachedKey && cachedSeed === seed) {
    return cachedKey;
  }

  const pending = crypto.subtle
    .importKey(RAW_KEY_FORMAT, textEncoder.encode(seed), HKDF, false, ["deriveKey"])
    .then((material) =>
      crypto.subtle.deriveKey(
        {
          name: HKDF,
          hash: SHA_256,
          salt: textEncoder.encode(LLM_KEY_KDF_SALT),
          info: textEncoder.encode(LLM_KEY_KDF_INFO),
        },
        material,
        { name: AES_GCM, length: AES_KEY_BITS },
        false,
        ["encrypt", "decrypt"],
      ),
    )
    .catch((error: unknown) => {
      if (cachedSeed === seed) {
        cachedSeed = "";
        cachedKey = null;
      }
      throw error;
    });

  cachedSeed = seed;
  cachedKey = pending;
  return pending;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}
