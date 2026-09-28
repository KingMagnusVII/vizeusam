const CACHE = "timetable-shell-v5";
const APP_SHELL = ["/", "/favicon.ico", "/app-icon.svg"];

async function getCustomManifest() {
  const fallback = await caches.match("/manifest.webmanifest");
  try {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("timetable-pwa", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("metadata");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const metadata = await new Promise((resolve, reject) => {
      const request = db.transaction("metadata", "readonly").objectStore("metadata").get("manifest");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (metadata?.name && metadata?.icons?.[0]?.src) {
      return new Response(JSON.stringify(metadata), {
        headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
      });
    }
  } catch {
    // Use the bundled manifest if IndexedDB is unavailable.
  }
  return fallback;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(getCustomManifest());
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/") )
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/app-icons/") ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/app-icon.svg";

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Timetable CSVs are checked online first so updated bundled data can reach
  // a fresh install, while the cached copy keeps the app usable offline.
  if (url.pathname.startsWith("/timetable/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
