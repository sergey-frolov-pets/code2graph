const CACHE_PREFIX = "code2graph-";
const SHARED_PUML_CACHE = "shared-puml-v1";
const LIBRARY_API_CACHE = "code2graph-library-api-v1";

// Подставляется при сборке. Имя precache и байты sw.js меняются с релизом,
// поэтому registration.update() видит новый воркер без query ?v=.
const APP_RELEASE = "__C2G_APP_VERSION__";
const PRECACHE = `code2graph-precache-${APP_RELEASE}`;
self.__code2graphRelease = APP_RELEASE;

const PRECACHE_URLS = [
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/fsvibe-logo.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== PRECACHE)
          .map((key) => caches.delete(key)),
      );
      const cache = await caches.open(PRECACHE);
      await cache.addAll(PRECACHE_URLS);
      // Страница на старой оболочке может не догрузиться и не нажать
      // «Обновить». Новый воркер забирает управление сам.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      // Вкладка с ответом сломанного воркера сама документ не перезапросит.
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        windows.map((client) => (client.navigate ? client.navigate(client.url) : undefined)),
      );
    })(),
  );
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
  }

  // Навигацию не перехватываем: документ грузит браузер (тонкий HTML + assets).
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
