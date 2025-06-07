const CACHE_NAME = 'bayanihan-cache-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/pages/dashboard.html',
    '/components/sidebar.html',
    '/components/sidebar.css',
    '/css/dashboard.css',
    '/css/global.css',
    '/js/dashboard.js',
    '/assets/images/AB_logo.png',
    '/components/sidebar.js', // Added if it exists
    '/assets/images/user.jpg', // Added if it exists
];

// Install event - cache essential files and skip waiting
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Lenlen: Service Worker caching files');
                return Promise.all(
                    urlsToCache.map(url => {
                        return fetch(url)
                            .then(response => {
                                if (!response.ok) throw new Error(`Failed to fetch ${url}`);
                                return cache.put(url, response);
                            })
                            .catch(error => {
                                console.warn(`Lenlen: Skipping invalid URL ${url}:`, error);
                                return Promise.resolve(); // Skip failed URLs
                            });
                    })
                );
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('Lenlen: Service Worker installation failed:', error);
            })
    );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('Lenlen: Deleting old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
        .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
    if (!event.request) {
        console.error('Lenlen: Fetch event has no request object:', event);
        return;
    }

    const requestUrl = event.request.url;
    console.log('Lenlen: Fetching:', requestUrl);

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                const fetchPromise = fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        })
                        .catch(error => {
                            console.error('Lenlen: Failed to cache:', requestUrl, error);
                        });

                    return networkResponse;
                }).catch(error => {
                    console.error('Lenlen: Fetch failed for:', requestUrl, error);
                    return cachedResponse || new Response('Network error occurred', { status: 503 });
                });

                return cachedResponse || fetchPromise;
            })
    );
});