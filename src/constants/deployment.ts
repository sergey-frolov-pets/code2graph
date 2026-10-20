/**
 * Значение VITE_API_BASE_URL: API на том же хосте, что и сайт (`/api`).
 * Пустая переменная — статическая сборка без сервера и базы данных.
 */
export const DEPLOYMENT_API_SAME_ORIGIN = "same-origin";

export const DEPLOYMENT_API_SAME_ORIGIN_ALIASES = [
  DEPLOYMENT_API_SAME_ORIGIN,
  "auto",
  "/",
] as const;
