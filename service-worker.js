self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated!');
});

self.addEventListener('fetch', (event) => {
  console.log('[Service Worker] Fetching:', event.request.url);
});
