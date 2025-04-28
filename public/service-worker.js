self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open("pwa-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/Bayanihan-PWA/public/index.html",
        "/Bayanihan-PWA/src/components/sidebar/sidebar.html",
        "/Bayanihan-PWA/src/components/sidebar/sidebar.js",
        "/Bayanihan-PWA/src/components/sidebar/sidebar.css",
        "/Bayanihan-PWA/src/pages/login/Login&RegistrationForm.html",
        "/Bayanihan-PWA/src/master.css",
      ]);
    }).catch((err) => {
      console.error("[Service Worker] Cache failed:", err);
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activated!");
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== "pwa-cache")
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  console.log("[Service Worker] Fetching:", event.request.url);

  // Handle navigation requests (e.g., redirects to index.html)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch((err) => {
        console.error("[Service Worker] Navigation fetch failed:", err);
        // Fallback to cached index.html for navigation requests
        return caches.match("/Bayanihan-PWA/public/index.html").then((response) => {
          if (response) {
            console.log("[Service Worker] Serving cached index.html for navigation");
            return response;
          }
          throw new Error("No cached index.html available");
        });
      })
    );
    return;
  }

  // Handle other requests (e.g., assets)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        console.log("[Service Worker] Found in cache:", event.request.url);
        return response;
      }
      console.log("[Service Worker] Fetching from network:", event.request.url);
      return fetch(event.request).catch((err) => {
        console.error("[Service Worker] Fetch failed for:", event.request.url, err);
        return new Response("Offline: Unable to fetch resource", { status: 503 });
      });
    })
  );
});

// Listen for a message to update the cache after login
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "UPDATE_CACHE") {
    console.log("[Service Worker] Updating cache after login...");
    caches.open("pwa-cache").then((cache) => {
      cache.addAll([
        "/Bayanihan-PWA/public/index.html",
        "/Bayanihan-PWA/src/components/sidebar/sidebar.html",
        "/Bayanihan-PWA/src/components/sidebar/sidebar.js",
        "/Bayanihan-PWA/src/pages/login/Login&RegistrationForm.html",
      ]).catch((err) => {
        console.error("[Service Worker] Cache update failed:", err);
      });
    });
  }
});