const CACHE_PREFIX = "code2graph-";
const PRECACHE = "code2graph-precache-v2";
const SHARED_PUML_CACHE = "shared-puml-v1";
const APP_SHELL_CACHE = "code2graph-shell-v2";
const LIBRARY_API_CACHE = "code2graph-library-api-v1";

const PRECACHE_URLS = [
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/fsvibe-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== PRECACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => caches.open(PRECACHE))
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    // Keep the worker alive until it leaves the waiting phase. Without
    // waitUntil the click on "Обновить" returns and the page never reloads.
    event.waitUntil(self.skipWaiting());
    return;
  }

  if (event.data?.type !== "GET_SHARED_PUML") {
    return;
  }

  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHARED_PUML_CACHE);
      const response = await cache.match("latest.puml");
      const text = response ? await response.text() : null;
      await cache.delete("latest.puml");
      event.ports[0]?.postMessage(text);
    })(),
  );
});

const APP_SHELL_PATH = "/index.html";
const CLIPBOARD_DIAGRAM_PATH = "/diagram";
const LOCAL_DATA_LINK_PATH = /^\/local\/[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function normalizedPath(pathname) {
  const path = pathname.replace(/\/+$/, "");
  return path || "/";
}

function isAppShellNavigation(url) {
  if (url.origin !== self.location.origin) {
    return false;
  }
  const path = normalizedPath(url.pathname);
  return (
    path === "/" ||
    path === APP_SHELL_PATH ||
    path.toLowerCase() === CLIPBOARD_DIAGRAM_PATH ||
    LOCAL_DATA_LINK_PATH.test(path)
  );
}

function appShellRequest() {
  return new Request(new URL(APP_SHELL_PATH, self.location.origin).href, {
    credentials: "same-origin",
  });
}

async function readCachedShell() {
  const shellUrl = new URL(APP_SHELL_PATH, self.location.origin).href;
  const precache = await caches.open(PRECACHE);
  const fromPrecache =
    (await precache.match(shellUrl)) || (await precache.match("./index.html"));
  if (fromPrecache) {
    return fromPrecache;
  }
  const shellCache = await caches.open(APP_SHELL_CACHE);
  return (await shellCache.match(shellUrl)) || (await shellCache.match("./index.html"));
}

async function storeShell(response) {
  if (!response.ok) {
    return;
  }
  const cache = await caches.open(APP_SHELL_CACHE);
  await cache.put(new URL(APP_SHELL_PATH, self.location.origin).href, response.clone());
}

async function handleNavigation(request) {
  const url = new URL(request.url);
  const path = normalizedPath(url.pathname);
  const prettyPath = path !== "/" && path !== APP_SHELL_PATH;
  const networkRequest = prettyPath ? appShellRequest() : request;

  try {
    const response = await fetch(networkRequest);
    if (response.ok) {
      await storeShell(response);
      return response;
    }
  } catch {
    // Offline: the installed PWA still opens /local/<slug> and /diagram from the shell.
  }

  const cached = await readCachedShell();
  if (cached) {
    return cached;
  }

  return new Response("Code2Graph is offline", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method === "POST") {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/share-target")) {
      event.respondWith(handleShareTarget(request));
    }
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstLibraryApi(request));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.endsWith("/deployment.json")) {
    event.respondWith(networkFirstDeploymentConfig(request));
    return;
  }

  if (request.mode === "navigate" && isAppShellNavigation(url)) {
    event.respondWith(handleNavigation(request));
  }
});

async function networkFirstDeploymentConfig(request) {
  const cache = await caches.open("code2graph-deployment-v1");

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    return new Response("", { status: 504 });
  }
}

async function networkFirstLibraryApi(request) {
  const cache = await caches.open(LIBRARY_API_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw new Error("Library API unavailable offline");
  }
}

async function handleShareTarget(request) {
  let sharedText = "";

  try {
    const formData = await request.formData();
    const file = formData.get("diagram");

    if (file instanceof File) {
      sharedText = await file.text();
    } else {
      const text = formData.get("text");
      if (typeof text === "string" && text.trim()) {
        sharedText = text;
      }
    }
  } catch {
    sharedText = "";
  }

  if (sharedText.trim()) {
    const cache = await caches.open(SHARED_PUML_CACHE);
    await cache.put(
      "latest.puml",
      new Response(sharedText, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }),
    );
  }

  return Response.redirect("./index.html?shared=1", 303);
}
