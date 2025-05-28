// const CACHE_NAME = 'bayanihan-cache-v2';
// const urlsToCache = [
//     '/',
//     '/index.html',
//     './index.js',
//     './manifest.json',
//     './assets/images/logox192.png',
//     './css/global.css',
//     './pages/login.html',
//     './css/login.css',
//     './js/login.js',
//     './js/global.js',
//     './pages/rdanaVerification.html',
//     './pages/rdanaLog.html',
//     './components/sidebar.html',
//     './components/sidebar.js',
//     './components/sidebar.css',
//     './js/rdanaLog.js',
//     './css/rdanaLog.css',
//     './assets/images/user.jpg',
//     './pages/profile.js"'
// ];

// self.addEventListener('install', (event) => {
//     event.waitUntil(
//         caches.open(CACHE_NAME)
//             .then((cache) => {
//                 console.log('Opened cache:', CACHE_NAME);
//                 return cache.addAll(urlsToCache);
//             })
//             .catch(error => {
//                 console.error('Service Worker install error:', error);
//             })
//     );
//     self.skipWaiting();
// });

// self.addEventListener('activate', (event) => {
//     event.waitUntil(
//         caches.keys().then((cacheNames) => {
//             return Promise.all(
//                 cacheNames
//                     .filter((cacheName) => cacheName !== CACHE_NAME)
//                     .map((cacheName) => {
//                         console.log('Deleting old cache:', cacheName);
//                         return caches.delete(cacheName);
//                     })
//             );
//         })
//     );
//     self.clients.claim();
// });

// self.addEventListener('fetch', (event) => {
//     const requestUrl = new URL(event.request.url);

//     // Bypass cache for Firebase, EmailJS, emulator, and non-GET requests
//     if (
//         requestUrl.origin === 'https://identitytoolkit.googleapis.com' ||
//         requestUrl.origin === 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app' ||
//         requestUrl.origin === 'http://localhost:9099' || // Explicitly bypass emulator requests
//         event.request.url.includes('emailjs') ||
//         event.request.method !== 'GET'
//     ) {
//         console.log('Bypassing cache for:', event.request.url);
//         event.respondWith(
//             fetch(event.request).catch(error => {
//                 console.error('Fetch failed for bypassed request:', event.request.url, error);
//                 // Return a fallback response or rethrow the error
//                 throw error;
//             })
//         );
//         return;
//     }

//     event.respondWith(
//         caches.match(event.request)
//             .then((response) => {
//                 if (response) {
//                     console.log('Cache hit for:', event.request.url);
//                     return response;
//                 }

//                 console.log('Cache miss for:', event.request.url, '- Fetching from network');
//                 return fetch(event.request).then((response) => {
//                     if (!response || response.status !== 200 || response.type !== 'basic') {
//                         return response;
//                     }

//                     const responseToCache = response.clone();
//                     caches.open(CACHE_NAME)
//                         .then((cache) => {
//                             cache.put(event.request, responseToCache);
//                             console.log('Cached new version for:', event.request.url);
//                         })
//                         .catch((error) => {
//                             console.error('Failed to cache:', event.request.url, error);
//                         });

//                     return response;
//                 }).catch((error) => {
//                     console.error('Fetch failed for:', event.request.url, error);
//                     if (event.request.headers.get('accept').includes('text/html')) {
//                         return caches.match('/index.html');
//                     }
//                     if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png')) {
//                         return caches.match('./assets/images/placeholder.jpg');
//                     }
//                     throw error;
//                 });
//             })
//     );

//     if (urlsToCache.some(url => event.request.url.includes(url))) {
//         event.waitUntil(
//             fetch(event.request.clone()).then(async (response) => {
//                 if (!response || response.status !== 200 || response.type !== 'basic') {
//                     return;
//                 }
//                 const cache = await caches.open(CACHE_NAME);
//                 console.log('Background update for:', event.request.url);
//                 await cache.put(event.request, response.clone());
//             }).catch((error) => {
//                 console.error('Background update failed for:', event.request.url, error);
//             })
//         );
//     }
// });

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // New bypass rules for Vite's development server
    // These paths are internal to Vite's HMR and development server.
    if (
        requestUrl.pathname.startsWith('/@vite/') || // Bypass Vite client and internal modules
        requestUrl.pathname.includes('node_modules') || // Often direct node_modules access is dev-only
        requestUrl.protocol === 'ws:' || // Bypass WebSocket connections (though fetch won't intercept these directly)
        requestUrl.protocol === 'wss:' // Secure WebSocket connections
    ) {
        console.log('Bypassing cache for Vite dev server or internal:', event.request.url);
        // Do not intercept or cache these requests; let the browser handle them naturally.
        return;
    }

    // Existing bypass rules for Firebase, EmailJS, emulator, and non-GET requests
    if (
        requestUrl.origin === 'https://identitytoolkit.googleapis.com' ||
        requestUrl.origin === 'https://bayanihan-5ce7e-default-rtdb.asia-southeast1.firebasedatabase.app' ||
        requestUrl.origin === 'http://localhost:9099' || // Explicitly bypass emulator requests
        event.request.url.includes('emailjs') ||
        event.request.method !== 'GET'
    ) {
        console.log('Bypassing cache for external API or non-GET request:', event.request.url);
        event.respondWith(
            fetch(event.request).catch(error => {
                console.error('Fetch failed for bypassed request:', event.request.url, error);
                throw error;
            })
        );
        return;
    }

    // Your existing caching logic (cache-first, then network, update cache)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    console.log('Cache hit for:', event.request.url);
                    return response;
                }

                console.log('Cache miss for:', event.request.url, '- Fetching from network');
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                                console.log('Cached new version for:', event.request.url);
                            })
                            .catch((error) => {
                                console.error('Failed to cache:', event.request.url, error);
                            });

                        return networkResponse;
                    }).catch((error) => {
                        console.error('Fetch failed for:', event.request.url, error);
                        // Fallback logic for HTML and images
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/bayanihan/index.html'); // Ensure this path is correct relative to base
                        }
                        if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png')) {
                            // You might want to pre-cache this placeholder image during install
                            return caches.match('/bayanihan/assets/images/user.jpg'); // Changed to user.jpg as it's in your cache list, assuming it's a generic fallback
                        }
                        throw error;
                    });
            })
    );

});

const urlsToCache = [
    '/bayanihan/', // The root of your app
    '/bayanihan/index.html',
    '/bayanihan/index.js',
    '/bayanihan/manifest.json',
    '/bayanihan/assets/images/logox192.png',
    '/bayanihan/css/global.css',
    '/bayanihan/pages/login.html',
    '/bayanihan/css/login.css',
    '/bayanihan/js/login.js',
    '/bayanihan/js/global.js',
    '/bayanihan/pages/rdanaVerification.html',
    '/bayanihan/pages/rdanaLog.html',
    '/bayanihan/components/sidebar.html',
    '/bayanihan/components/sidebar.js',
    '/bayanihan/components/sidebar.css',
    '/bayanihan/js/rdanaLog.js',
    '/bayanihan/css/rdanaLog.css',
    '/bayanihan/assets/images/user.jpg',
    '/bayanihan/pages/profile.js', // Fixed typo, now with base path
    // Add other assets if they are referenced directly without /bayanihan/ in the HTML,
    // but ultimately resolve with /bayanihan/ due to Vite's base.
    // Example: If you have css/reports.css and js/reportsverification.js mentioned in error logs
    '/bayanihan/css/reports.css', 
    '/bayanihan/js/reportsverification.js', 
    '/bayanihan/pages/reportsVerification.html',
    '/bayanihan/pages/dashboard.html',
    '/bayanihan/pages/activation.html',
    '/bayanihan/pages/inkind.html',
    '/bayanihan/pages/monetary.html',
    '/bayanihan/pages/rdana.html',
    '/bayanihan/pages/callfordonations.html',
    '/bayanihan/pages/reliefsRequest.html',
    '/bayanihan/pages/reliefsLog.html',
    '/bayanihan/pages/reportsSubmission.html',
    '/bayanihan/pages/reportsSummary.html',
    '/bayanihan/pages/reportsVerification.html',
    '/bayanihan/pages/volunteergroupmanagement.html'
];