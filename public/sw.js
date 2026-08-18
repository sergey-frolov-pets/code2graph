const CACHE_PREFIX = "code2graph-";
const PRECACHE = "code2graph-precache-v1";
const SHARED_PUML_CACHE = "shared-puml-v1";
const APP_SHELL_CACHE = "code2graph-shell-v1";
const LIBRARY_API_CACHE = "code2graph-library-api-v1";

const PRECACHE_URLS = [
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon.svg",
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
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
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

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() =>
          caches
            .open(PRECACHE)
            .then((cache) => cache.match("./index.html"))
            .then((cached) => cached || caches.open(APP_SHELL_CACHE).then((cache) => cache.match("./index.html"))),
        ),
    );
  }
});

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
