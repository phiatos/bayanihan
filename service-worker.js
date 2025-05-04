const CACHE_NAME = 'bayanihan-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  './index.js',
  './manifest.json',
  './assets/images/logox192.png',
  './css/global.css',
  './pages/login.html',
  './css/login.css',
  './js/login.js',
  './js/global.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Install error:', error)) // Add error handling
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          console.log('Cache hit for:', event.request.url);
          return response;
        }

        // Not in cache - fetch from network
        console.log('Cache miss for:', event.request.url, '- Fetching from network');
        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
                console.log('Cached new version for:', event.request.url);
              });

            return response;
          }
        );
      })
  );

  // Also try to fetch the latest version in the background and update the cache
  event.waitUntil(
    fetch(event.request.clone()).then(async (response) => { // Clone the request here
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return;
      }
      const cache = await caches.open(CACHE_NAME);
      console.log('Background update for:', event.request.url);
      await cache.put(event.request, response.clone());
    })
  );
});