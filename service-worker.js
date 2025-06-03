const CACHE_NAME = 'bayanihan-cache-v2'; 

const urlsToCache = [
    '/',
    './index.html',
    './index.css',
    './index.js',
    './manifest.json',
    '../assets/images/logox192.png',
    '../assets/images/user.jpg',
    '../css/global.css',
    '../pages/login.html',
    '../css/login.css',
    '../js/login.js',
    '../js/global.js',
    '../js/volunteergroupmanagement.js',
    '../pages/volunteergroupmanagement.html',
    '../pages/rdanaVerification.html',
    '../pages/rdanaLog.html',
    '../components/sidebar.html',
    '../components/sidebar.js',
    '../components/sidebar.css',
    '../js/rdanaLog.js',
    '../css/rdanaLog.css',
    // '../pages/profile.js', 
    // '../pages/profile.html',
    // '../css/profile.css',
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

    if (
        requestUrl.origin === 'https://identitytoolkit.googleapis.com' ||
        requestUrl.origin === 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app' ||
        requestUrl.origin === 'http://localhost:9099' || 
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
                        return caches.match('/index.html');
                    }
                    if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png')) {
                        return caches.match('./assets/images/placeholder.jpg');
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

