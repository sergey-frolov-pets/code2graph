/**
 * События использования — счётчики Code2Graph в GoatCounter.
 *
 * Модель «одно событие — один факт»: повторов нет ни после перезагрузки
 * страницы, ни с каждым кликом. Отчёт в дашборде читается по префиксу пути:
 *
 *   visit/app               — один раз на открытие приложения (сессия вкладки),
 *                             к нему же прикладывается язык интерфейса
 *   page/<раздел>           — просмотр раздела: page/landing, page/app,
 *                             page/mcp, page/account, page/master-<язык>,
 *                             page/diagram, page/clipboard, page/sample,
 *                             page/preview. Один раз за открытие на раздел.
 *   click/<куда>            — переход по внешней ссылке: click/github,
 *                             click/discussions, click/donation, click/license,
 *                             click/site/<язык>, click/cta-<кнопка>
 *   open/<язык>             — открытие диаграммы (файл, библиотека, шаринг,
 *                             пример визарда): open/mermaid
 *   surface/<вид>           — какой вид редактора используется: surface/code,
 *                             surface/builder (по шагам), surface/ai-chat.
 *                             Один раз за открытие на вид.
 *   wizard/open             — открыли визард (единственное событие визарда)
 *   language/<язык>         — язык интерфейса, один раз в сутки
 *
 * Правило «один факт — одно событие» действует там, где факт повторяем:
 * визит, просмотры разделов, виды редактора — только в памяти (события
 * текущего открытия), язык — раз в сутки в хранилище. Клики — настоящие
 * действия, каждый считается отдельно.
 *
 * В отчёт не попадает ничего личного: ни адреса, ни имена файлов, ни тексты
 * диаграмм. Любое значение извне проходит через строгий шаблон: только наши
 * известные пути, всё остальное молча отбрасывается.
 */

import { trackEvent } from "./goatcounter";

/** Язык интерфейса — один раз в сутки. */
const DAY_KEY = "code2graph.analytics.day";

/** Безопасный кусок пути: латиница, цифры, точка, подчёркивание, дефис. */
export function analyticsSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "unknown";
}

function today(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function storage(): Storage | null {
  try {
    const scope = globalThis as {
      localStorage?: Storage;
      sessionStorage?: Storage;
    };
    return scope.localStorage ?? scope.sessionStorage ?? null;
  } catch {
    // Доступ к хранилищу запрещён настройками браузера.
    return null;
  }
}

/** Копия дня в памяти: приватный режим не даёт писать в хранилище. */
let memoryDay = "";

function readDay(box: Storage | null): string {
  let stored = "";
  try {
    stored = box?.getItem(DAY_KEY) ?? "";
  } catch {
    stored = "";
  }
  return stored > memoryDay ? stored : memoryDay;
}

function writeDay(day: string, box: Storage | null): void {
  memoryDay = day;
  try {
    box?.setItem(DAY_KEY, day);
  } catch {
    // Приватный режим: язык уйдёт повторно при следующем входе.
  }
}

/**
 * Язык интерфейса — раз в сутки.
 *
 * Вызывается из отчёта о визите: первое событие дня прикладывает
 * `language/<язык>`, дальше до смены суток молчит.
 */
export function reportLanguage(language: string): void {
  const box = storage();
  const day = today();
  if (readDay(box) === day) return;
  trackEvent(`language/${analyticsSlug(language)}`);
  writeDay(day, box);
}

/** Визит уже посчитан в этом открытии приложения. */
let visited = false;

/**
 * Вход в приложение — один раз на сессию вкладки.
 *
 * `visit/app` уходит при первом показе приложения, язык интерфейса
 * прикладывается к нему же (раз в сутки). Повторные вызовы молчат.
 */
export function reportAppVisit(language: string): void {
  if (visited) return;
  visited = true;
  trackEvent("visit/app");
  reportLanguage(language);
}

/** Разделы, которые считаются просмотрами страниц. */
const PAGE_SECTIONS = [
  "landing",
  "app",
  "mcp",
  "login",
  "register",
  "account",
  "diagram",
  "clipboard",
  "sample",
  "preview",
  "library",
] as const;

export type PageSection = (typeof PAGE_SECTIONS)[number] | `master-${string}`;

/** Наши разделы: фиксированный список плюс страницы языков `master-<язык>`. */
const PAGE_SECTION_PATTERN = new RegExp(
  `^(?:${PAGE_SECTIONS.join("|")}|master-[a-z0-9]+(?:-[a-z0-9]+)*)$`,
);

/** Просмотренные за это открытие разделы: повторный переход не считается. */
const pages = new Set<string>();

/**
 * Просмотр раздела — один раз за открытие приложения на раздел.
 *
 * Событие идёт как `page/<раздел>`: page/landing, page/app, page/master-mermaid.
 * Повторный переход в тот же раздел в этой вкладке молчит, чужое имя
 * (не из нашего списка) отбрасывается.
 */
export function reportPage(section: PageSection): void {
  const slug = analyticsSlug(section);
  if (!PAGE_SECTION_PATTERN.test(slug)) return;
  if (pages.has(slug)) return;
  pages.add(slug);
  trackEvent(`page/${slug}`);
}

/** Ссылки футера, каталога и кнопки лендинга: что именно считаем кликом. */
const CLICK_TARGETS = [
  "github",
  "discussions",
  "donation",
  "license",
  "cta-landing-app",
  "cta-landing-mcp",
] as const;

/** Клик по кнопке: наш список плюс `cta-gallery-<язык>`, `cta-scenario-<аудитория>`, `audience-<аудитория>`. */
const CLICK_PATTERN = new RegExp(
  `^(?:${CLICK_TARGETS.join("|")}|cta-gallery-[a-z0-9]+|cta-scenario-[a-z0-9]+|audience-[a-z0-9]+)$`,
);

/**
 * Переход по внешней ссылке или кнопке — событие `click/<куда>`.
 *
 * Имя режется до безопасного пути и сверяется с нашим шаблоном: постороннее
 * значение (например, подставленный адрес) в отчёт не уходит.
 */
export function reportClick(target: string): void {
  const slug = analyticsSlug(target);
  if (!CLICK_PATTERN.test(slug)) return;
  trackEvent(`click/${slug}`);
}

/** Клик по сайту языка диаграммы из каталога: `click/site/<язык>`. */
export function reportSiteClick(name: string): void {
  const slug = analyticsSlug(name);
  if (slug === "unknown") return;
  trackEvent(`click/site/${slug}`);
}

/** Открыли диаграмму: файл, библиотека, шаринг, пример визарда — `open/<язык>`. */
export function reportOpen(format: string): void {
  trackEvent(`open/${analyticsSlug(format)}`);
}

/** Вид редактора: код, по шагам или ИИ-чат. */
export type EditorSurface = "code" | "builder" | "ai-chat";

const EDITOR_SURFACES: readonly EditorSurface[] = ["code", "builder", "ai-chat"];

/** Виды, уже посчитанные в этом открытии приложения. */
const surfaces = new Set<EditorSurface>();

/**
 * Каким видом редактора пользуются — `surface/code`, `surface/builder`,
 * `surface/ai-chat`. Один раз за открытие на вид: повторное переключение
 * туда-обратно не раздувает отчёт. Чужое значение отбрасывается.
 */
export function reportSurface(mode: EditorSurface): void {
  if (!EDITOR_SURFACES.includes(mode)) return;
  if (surfaces.has(mode)) return;
  surfaces.add(mode);
  trackEvent(`surface/${mode}`);
}

/** Открыли визард — единственное событие визарда: `wizard/open`. */
export function reportWizardOpen(): void {
  trackEvent("wizard/open");
}

/** Сбросить копию в памяти — нужно тестам, в приложении не вызывается. */
export function resetUsageMemory(): void {
  memoryDay = "";
  visited = false;
  pages.clear();
  surfaces.clear();
}
