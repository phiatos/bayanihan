const CACHE_NAME = 'bayanihan-cache-v2';

const urlsToCache = [
    '/bayanihan/pages/dashboard.html',
    '/bayanihan/components/sidebar.html',
    '/bayanihan/components/sidebar.css',
    '/bayanihan/components/sidebar.js',
    '/bayanihan/css/dashboard.css',
    '/bayanihan/css/global.css',
    '/bayanihan/js/dashboard.js',
    '/bayanihan/assets/images/AB_logo.png',
    '/bayanihan/assets/images/user.jpg',
    '/bayanihan/pages/login.html',
    '/bayanihan/css/login.css',
    '/bayanihan/js/login.js',
    '/bayanihan/js/global.js',
    '/bayanihan/pages/rdanaVerification.html',
    '/bayanihan/pages/rdanaLog.html',
    '/bayanihan/js/rdanaLog.js',
    '/bayanihan/css/rdanaLog.css',
    '/bayanihan/pages/profile.js',
];

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
    self.skipWaiting();
});

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
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // Bypass cache for Firebase, EmailJS, emulator, Google Maps, and non-GET requests
    if (
        requestUrl.origin === 'https://identitytoolkit.googleapis.com' ||
        requestUrl.origin === 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app' ||
        requestUrl.origin === 'http://localhost:9099' || // Explicitly bypass emulator requests
        requestUrl.origin === 'https://maps.googleapis.com' || // Bypass Google Maps API
        event.request.url.includes('emailjs') ||
        event.request.method !== 'GET'
    ) {
        console.log('Bypassing cache for:', event.request.url);
        event.respondWith(
            fetch(event.request).catch(error => {
                console.error('Fetch failed for bypassed request:', event.request.url, error);
                throw error;
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    console.log('Cache hit for:', event.request.url);
                    return response;
                }

                console.log('Cache miss for:', event.request.url, '- Fetching from network');
                return fetch(event.request).then((response) => {
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
                    if (event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('/bayanihan/pages/dashboard.html');
                    }
                    if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png')) {
                        return caches.match('/bayanihan/assets/images/AB_logo.png');
                    }
                    throw error;
                });
            })
    );

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