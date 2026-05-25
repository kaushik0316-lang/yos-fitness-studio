const CACHE = "yos-v1";
const OFFLINE_URL = "/staff-dashboard";

// On install — cache the staff dashboard shell
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(["/staff-dashboard", "/icons/icon-192.png", "/icons/icon-512.png"])
    )
  );
  self.skipWaiting();
});

// On activate — clean up old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache for navigation
self.addEventListener("fetch", (e) => {
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(OFFLINE_URL)
      )
    );
    return;
  }
  // For everything else — network only (API calls must be fresh)
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
