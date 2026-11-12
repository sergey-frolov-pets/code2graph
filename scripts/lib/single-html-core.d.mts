/** Типы для импорта из тестов. Реализация — в соседнем single-html-core.mjs. */
export const SERVICE_WORKER_VERSION_TOKEN: string;

export function stampServiceWorker(source: string, version: string): string;

export function readAppVersion(): string;

export function writeStampedServiceWorker(targetPath: string): void;
