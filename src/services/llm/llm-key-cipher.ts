import {
  LLM_KEY_CIPHER_PREFIX,
  LLM_KEY_DEVICE_CIPHER_PREFIX,
  LLM_KEY_IV_BYTES,
  LLM_KEY_KDF_INFO,
  LLM_KEY_KDF_SALT,
  LLM_KEY_REMEMBERED_SEED_LIMIT,
  LLM_KEY_SEED_MIN_LENGTH,
} from "@/constants/llm-account";
import {
  STORAGE_KEY_LLM_DEVICE_SEED,
  STORAGE_KEY_LLM_LEGACY_SEEDS,
} from "@/constants/llm-settings";
import { readStorageItem, writeStorageItem, writeStorageJson } from "@/core/safe-storage";

const AES_GCM = "AES-GCM";
const HKDF = "HKDF";
const SHA_256 = "SHA-256";
const AES_KEY_BITS = 256;
const RAW_KEY_FORMAT = "raw";
const DEVICE_SEED_BYTES = 32;

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
let deviceSeedCache: { seed: string; persisted: boolean } | null = null;

export function resetLlmKeyCipherCache(): void {
  cachedSeed = "";
  cachedKey = null;
  deviceSeedCache = null;
}

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

function isUsableSeed(seed: string): boolean {
  return seed.trim().length >= LLM_KEY_SEED_MIN_LENGTH;
}

/** Сид этого браузера. `persisted: false` — нельзя им перешифровывать ключи на диске. */
export function ensureLlmDeviceSeed(): { seed: string; persisted: boolean } {
  if (deviceSeedCache) {
    return deviceSeedCache;
  }

  const existing = readStorageItem(STORAGE_KEY_LLM_DEVICE_SEED)?.trim() ?? "";
  if (isUsableSeed(existing)) {
    deviceSeedCache = { seed: existing, persisted: true };
    return deviceSeedCache;
  }

  const seed = bytesToBase64(crypto.getRandomValues(new Uint8Array(DEVICE_SEED_BYTES)));
  writeStorageItem(STORAGE_KEY_LLM_DEVICE_SEED, seed);
  const winner = readStorageItem(STORAGE_KEY_LLM_DEVICE_SEED)?.trim() ?? "";
  if (isUsableSeed(winner)) {
    deviceSeedCache = { seed: winner, persisted: true };
    return deviceSeedCache;
  }

  deviceSeedCache = { seed, persisted: false };
  return deviceSeedCache;
}

export function canPersistLlmSecrets(): boolean {
  return ensureLlmDeviceSeed().persisted || readLlmKeySeed() !== null;
}

function readRememberedSeeds(): string[] {
  const raw = readStorageItem(STORAGE_KEY_LLM_LEGACY_SEEDS);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string" && isUsableSeed(item));
  } catch {
    return [];
  }
}

/** Запоминает сид сборки, чтобы следующая версия открыла конверты `enc:v1`. */
export function rememberLlmKeySeed(seed: string): void {
  const trimmed = seed.trim();
  if (!isUsableSeed(trimmed)) {
    return;
  }

  const seeds = readRememberedSeeds().filter((item) => item !== trimmed);
  seeds.unshift(trimmed);
  writeStorageJson(
    STORAGE_KEY_LLM_LEGACY_SEEDS,
    seeds.slice(0, LLM_KEY_REMEMBERED_SEED_LIMIT),
  );
}

export function readLegacyLlmKeySeeds(): string[] {
  const envSeed = readLlmKeySeed();
  if (envSeed) {
    rememberLlmKeySeed(envSeed);
  }

  const seeds: string[] = [];
  for (const seed of [envSeed, ...readRememberedSeeds()]) {
    if (seed && !seeds.includes(seed)) {
      seeds.push(seed);
    }
  }

  return seeds;
}

export function isSealedLlmApiKey(value: string): boolean {
  return (
    value.startsWith(LLM_KEY_DEVICE_CIPHER_PREFIX) || value.startsWith(LLM_KEY_CIPHER_PREFIX)
  );
}

/** Пустой ключ и конверт v2 уже в форме, которую пишет текущая сборка. */
export function storedLlmApiKeyNeedsReseal(apiKey: string): boolean {
  return apiKey.length > 0 && !apiKey.startsWith(LLM_KEY_DEVICE_CIPHER_PREFIX);
}

export async function sealLlmApiKey(apiKey: string, providerId: string): Promise<string> {
  if (!apiKey) {
    return "";
  }

  const device = ensureLlmDeviceSeed();
  if (device.persisted) {
    return encryptWithSeed(apiKey, device.seed, providerId, LLM_KEY_DEVICE_CIPHER_PREFIX);
  }

  const envSeed = readLlmKeySeed();
  if (!envSeed) {
    throw new LlmKeyCipherError("missing_seed");
  }

  return encryptWithSeed(apiKey, envSeed, providerId, LLM_KEY_CIPHER_PREFIX);
}

/** Конверт старого формата. Нужен, чтобы прочитать ключи, сохранённые прошлыми сборками. */
export async function sealLegacyLlmApiKey(
  apiKey: string,
  providerId: string,
  seed: string,
): Promise<string> {
  if (!apiKey) {
    return "";
  }

  if (!isUsableSeed(seed)) {
    throw new LlmKeyCipherError("missing_seed");
  }

  return encryptWithSeed(apiKey, seed.trim(), providerId, LLM_KEY_CIPHER_PREFIX);
}

export async function openLlmApiKey(stored: string, providerId: string): Promise<string> {
  if (!stored) {
    return "";
  }

  if (stored.startsWith(LLM_KEY_DEVICE_CIPHER_PREFIX)) {
    const device = ensureLlmDeviceSeed();
    if (!device.persisted) {
      throw new LlmKeyCipherError("decrypt_failed");
    }

    return decryptWithSeed(stored, LLM_KEY_DEVICE_CIPHER_PREFIX, device.seed, providerId);
  }

  if (!stored.startsWith(LLM_KEY_CIPHER_PREFIX)) {
    return stored;
  }

  const seeds = readLegacyLlmKeySeeds();
  if (seeds.length === 0) {
    throw new LlmKeyCipherError("missing_seed");
  }

  let failure = new LlmKeyCipherError("decrypt_failed");
  for (const seed of seeds) {
    try {
      return await decryptWithSeed(stored, LLM_KEY_CIPHER_PREFIX, seed, providerId);
    } catch (error) {
      failure =
        error instanceof LlmKeyCipherError ? error : new LlmKeyCipherError("decrypt_failed");
    }
  }

  throw failure;
}

async function encryptWithSeed(
  apiKey: string,
  seed: string,
  providerId: string,
  prefix: string,
): Promise<string> {
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

  return `${prefix}${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(cipher))}`;
}

async function decryptWithSeed(
  stored: string,
  prefix: string,
  seed: string,
  providerId: string,
): Promise<string> {
  const payload = stored.slice(prefix.length);
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
