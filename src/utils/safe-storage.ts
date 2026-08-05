/**
 * Безопасный доступ к localStorage.
 * На file:// и в приватном режиме браузер может блокировать storage —
 * все операции возвращают null/false вместо throw.
 */

export function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorageItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readStorageBoolean(key: string): boolean | null {
  const saved = readStorageItem(key);
  if (saved === null) {
    return null;
  }

  return saved === "true";
}

export function readStorageJson<T>(
  key: string,
  parse: (value: unknown) => T | null,
): T | null {
  const raw = readStorageItem(key);
  if (!raw) {
    return null;
  }

  try {
    return parse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeStorageJson(key: string, value: unknown): boolean {
  try {
    return writeStorageItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}
