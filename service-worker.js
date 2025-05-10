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

// Install event: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker install error:', error);
      })
  );
  // Force the waiting service worker to become active immediately
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  // Take control of the page immediately
  self.clients.claim();
});

// Fetch event: Handle requests with a cache-first strategy for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for Firebase Authentication API requests and other sensitive/dynamic endpoints
  if (
    requestUrl.origin === 'https://identitytoolkit.googleapis.com' ||
    requestUrl.origin === 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app' ||
    event.request.url.includes('emailjs') || // Skip EmailJS requests
    event.request.method !== 'GET' // Skip non-GET requests (e.g., POST for login)
  ) {
    console.log('Bypassing cache for:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          console.log('Cache hit for:', event.request.url);
          return response;
        }

        console.log('Cache miss for:', event.request.url, '- Fetching from network');
        return fetch(event.request).then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
              console.log('Cached new version for:', event.request.url);
            })
            .catch((error) => {
              console.error('Failed to cache:', event.request.url, error);
            });

          return response;
        }).catch((error) => {
          console.error('Fetch failed for:', event.request.url, error);
          throw error;
        });
      })
  );

  // Background update for cached static assets
  if (urlsToCache.some(url => event.request.url.includes(url))) {
    event.waitUntil(
      fetch(event.request.clone()).then(async (response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return;
        }
        const cache = await caches.open(CACHE_NAME);
        console.log('Background update for:', event.request.url);
        await cache.put(event.request, response.clone());
      }).catch((error) => {
        console.error('Background update failed for:', event.request.url, error);
      })
    );
  }
});