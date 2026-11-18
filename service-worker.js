const CACHE_NAME = "veille-sanitaire-v1";
const APP_SHELL = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./data/city-health-data.js",
  "./data/daily-updates.js",
  "./data/health-data.js",
  "./data/provinces-rdc.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) =>
            cacheName.startsWith("veille-sanitaire-") && cacheName !== CACHE_NAME
          )
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  const requestUrl = new URL(request.url);
  const isDailyUpdates = requestUrl.pathname.endsWith("/data/daily-updates.js");
  if (isDailyUpdates) requestUrl.search = "";

  const updatePromise = fetch(request)
    .then((response) => {
      if (!response.ok || response.type !== "basic") return response;
      return caches.open(CACHE_NAME)
        .then((cache) => cache.put(isDailyUpdates ? requestUrl.href : request, response.clone()))
        .then(() => response);
    })
    .catch(() => null);

  event.waitUntil(updatePromise.then(() => undefined));
  event.respondWith((async () => {
    const cachedResponse = await caches.match(request, { ignoreSearch: isDailyUpdates });
    if (cachedResponse) return cachedResponse;

    const networkResponse = await updatePromise;
    if (networkResponse) return networkResponse;

    if (request.mode === "navigate") {
      const offlinePage = new URL("./index.html", self.registration.scope).href;
      return await caches.match(offlinePage) || Response.error();
    }

    return Response.error();
  })());
});
