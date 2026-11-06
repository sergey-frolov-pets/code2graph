/**
 * Оффлайн-рендер держит исходник диаграммы на устройстве.
 * Сеть допустима только для файлов библиотеки PlantUML с того же адреса,
 * с которого открыто приложение. Чужие URL, параметры запроса и скрипты
 * стандартной библиотеки с абсолютным адресом не запрашиваются.
 */

const PLANTUML_STDLIB_DIRECTORY = "plantuml-lib/";

const PLANTUML_LIBRARY_PATH = `/${PLANTUML_STDLIB_DIRECTORY}`;

const REMOTE_STDLIB_BUNDLE =
  /^(?:[a-z][a-z0-9+.-]*:|\/\/|\\\\)/i;

const LOCAL_STDLIB_BUNDLE = /^[\w./-]+$/;

const LOCAL_SVG_REFERENCE = /^(?:#|data:|blob:)/i;

const CSS_URL_SOURCE = String.raw`url\(\s*(['"]?)([^'")]+)\1\s*\)`;

const CSS_IMPORT_SOURCE = String.raw`@import\b[^;]*;`;

function cssUrlPattern(): RegExp {
  return new RegExp(CSS_URL_SOURCE, "gi");
}

function cssImportPattern(): RegExp {
  return new RegExp(CSS_IMPORT_SOURCE, "gi");
}

const SVG_RESOURCE_TAGS = new Set([
  "image",
  "use",
  "script",
  "feimage",
  "link",
  "audio",
  "video",
  "iframe",
  "embed",
  "object",
  "source",
  "img",
]);

const FALLBACK_PAGE_HREF = "http://localhost/";

type PlantUmlStdlibLoader = NonNullable<Window["PLANTUML_STDLIB_LOADER"]>;

const STDLIB_GUARD = Symbol("code2graph.plantumlStdlibGuard");

type GuardedStdlibLoader = PlantUmlStdlibLoader & {
  [STDLIB_GUARD]?: true;
};

/**
 * Каталог, из которого офлайн-движок берёт спрайты (`openiconic.js` и библиотеки).
 * Для http(s) это корень приложения, чтобы глубокий маршрут не искал файл рядом с собой.
 * Для file:// файл лежит рядом со страницей, как и `plantuml-lib/`.
 */
export function plantUmlStdlibBaseHref(
  pageHref: string = offlineRenderPageHref(),
  appBasePath: string = import.meta.env.BASE_URL,
): string {
  const page = new URL(pageHref);
  if (page.protocol === "file:") {
    return new URL(PLANTUML_STDLIB_DIRECTORY, page).href;
  }

  const basePath = appBasePath.endsWith("/") ? appBasePath : `${appBasePath}/`;
  const applicationRoot = new URL(basePath, page.origin);
  return new URL(PLANTUML_STDLIB_DIRECTORY, applicationRoot).href;
}

export function offlineRenderPageHref(): string {
  if (typeof window !== "undefined" && window.location?.href) {
    return window.location.href;
  }

  return FALLBACK_PAGE_HREF;
}

/** Файл из поставки `plantuml-lib` на том же адресе, что и само приложение. */
export function isBundledPlantUmlLibraryUrl(
  includeUrl: string,
  pageHref: string = offlineRenderPageHref(),
): boolean {
  let page: URL;
  let target: URL;
  try {
    page = new URL(pageHref);
    target = new URL(includeUrl, page);
  } catch {
    return false;
  }

  if (target.username || target.password || target.search) {
    return false;
  }

  let path = target.pathname;
  try {
    path = decodeURIComponent(target.pathname);
  } catch {
    return false;
  }

  if (!path.includes(PLANTUML_LIBRARY_PATH)) {
    return false;
  }

  if (page.protocol === "file:") {
    return target.protocol === "file:";
  }

  return (
    target.origin === page.origin &&
    (target.protocol === "https:" || target.protocol === "http:")
  );
}

/**
 * Имя пакета, которое движок PlantUML подгружает как скрипт.
 * Абсолютные и protocol-relative адреса уходят на чужой хост — их не грузим.
 */
export function plantUmlStdlibBundleStaysOnDevice(bundleName: string): boolean {
  const name = bundleName.trim();
  if (!name || REMOTE_STDLIB_BUNDLE.test(name)) {
    return false;
  }

  if (
    name.includes("..") ||
    name.includes("\\") ||
    name.includes("?") ||
    name.includes("#")
  ) {
    return false;
  }

  return LOCAL_STDLIB_BUNDLE.test(name);
}

/** Ссылка внутри SVG, которая не вызывает сетевой запрос. */
export function svgPaintReferenceStaysOnDevice(reference: string): boolean {
  const value = reference.trim();
  if (!value) {
    return true;
  }

  return LOCAL_SVG_REFERENCE.test(value);
}

export function rewriteOffDeviceCssUrls(css: string): string {
  const withoutImport = css.replace(cssImportPattern(), (rule) => {
    const urls = [...rule.matchAll(cssUrlPattern())].map((match) => match[2] ?? "");
    const quoted = /['"]([^'"]+)['"]/.exec(rule);
    const candidates = urls.length > 0 ? urls : quoted ? [quoted[1]] : [];
    const leavesDevice = candidates.some(
      (item) => !svgPaintReferenceStaysOnDevice(item),
    );
    return leavesDevice ? "" : rule;
  });

  return withoutImport.replace(
    cssUrlPattern(),
    (full, _quote: string, target: string) =>
      svgPaintReferenceStaysOnDevice(target) ? full : "none",
  );
}

function isSvgResourceElement(element: Element): boolean {
  return SVG_RESOURCE_TAGS.has(element.localName.toLowerCase());
}

/**
 * Убирает из SVG ссылки, по которым браузер скачал бы картинку или скрипт
 * с другого адреса. Локальные `url(#id)`, data: и blob: остаются.
 */
export function stripOffDeviceSvgResources(svg: string): string {
  if (!svg.includes("<svg") || typeof DOMParser === "undefined") {
    return svg;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return svg;
  }

  let changed = false;
  const elements = [root, ...root.querySelectorAll("*")];
  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      const rewritten = rewriteOffDeviceCssUrls(attribute.value);
      if (rewritten !== attribute.value) {
        attribute.value = rewritten;
        changed = true;
      }

      const loadsResource =
        attribute.localName === "src" ||
        attribute.localName === "srcset" ||
        (attribute.localName === "href" && isSvgResourceElement(element));
      if (!loadsResource || svgPaintReferenceStaysOnDevice(attribute.value)) {
        continue;
      }

      element.removeAttributeNS(attribute.namespaceURI, attribute.localName);
      changed = true;
    }

    if (element.localName.toLowerCase() === "style" && element.textContent) {
      const rewritten = rewriteOffDeviceCssUrls(element.textContent);
      if (rewritten !== element.textContent) {
        element.textContent = rewritten;
        changed = true;
      }
    }
  }

  // Обычный SVG без внешних ссылок возвращаем как есть: повторная
  // сериализация меняет порядок атрибутов и ломает сравнение эталонов.
  if (!changed) {
    return svg;
  }

  return new XMLSerializer().serializeToString(root);
}

/** Не даёт оффлайн-движку PlantUML вставить `<script src>` на чужой адрес. */
export function installPlantUmlStdlibNetworkGuard(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.PLANTUML_STDLIB_BASE = plantUmlStdlibBaseHref();

  const current = window.PLANTUML_STDLIB_LOADER as GuardedStdlibLoader | undefined;
  if (current?.[STDLIB_GUARD]) {
    return;
  }

  const previous = current;
  const guard: GuardedStdlibLoader = (bundleName, onLoad, onError) => {
    if (!plantUmlStdlibBundleStaysOnDevice(bundleName)) {
      onError("include.remoteBlocked");
      return true;
    }

    if (previous) {
      return previous(bundleName, onLoad, onError);
    }

    return false;
  };
  guard[STDLIB_GUARD] = true;
  window.PLANTUML_STDLIB_LOADER = guard;
}
