const CACHE_NAME = "check-camp-v3";
const urlsToCache = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          function(response) {
            // Google Fonts (fonts.googleapis.com / fonts.gstatic.com) are
            // cross-origin, so their response.type is "cors" or "opaque",
            // never "basic". The old check below skipped caching them
            // entirely, which meant the Material Symbols icon font (used
            // for every icon in the app) was never available offline or
            // on poor connections. When it failed to load, icons fell
            // back to raw ligature text (e.g. "photo_library"), an
            // unbreakable long word that broke the home screen's grid
            // layout and caused horizontal clipping on small screens.
            //
            // We still avoid caching real API/Supabase calls, but now
            // also allow caching cross-origin ("cors"/"opaque")
            // responses like Google Fonts so the icon font survives
            // offline/poor-signal conditions.
            var isCacheable =
              response &&
              (response.status === 200 || response.type === "opaque") &&
              !event.request.url.includes("api") &&
              !event.request.url.includes("supabase.co");

            if (!isCacheable) {
              return response;
            }

            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });
            return response;
          }
        );
      })
  );
});

self.addEventListener("activate", event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
