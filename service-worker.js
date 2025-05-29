const CACHE_NAME = 'bayanihan-cache-v2'; // Make sure this is still defined at the top

self.addEventListener('fetch', (event) => {
    const requestUrl = new URL(event.request.url);

    // --- CRITICAL: More Comprehensive Bypass for Vite Development Server ---
    // In development, Vite typically runs on localhost:port (e.g., localhost:5173).
    // We need to bypass the service worker for ANYTHING served by Vite during dev.
    // In a production build, your service worker will then take over for caching.

    // Get the origin of the current page where the service worker is running.
    // In development, this will be your Vite dev server's origin (e.g., 'http://localhost:5173').
    const devServerOrigin = self.location.origin;

    // Check if the request is coming from the same origin as the development server.
    if (requestUrl.origin === devServerOrigin) {
        // You might need to refine this condition based on your exact Vite setup
        // For example, if you always use a specific port for Vite, you can add that:
        // if (requestUrl.hostname === 'localhost' && requestUrl.port === '5173') {

        // For simplicity, during development, if it's the same origin, just bypass the service worker.
        // This is safe because Vite's dev server handles caching and HMR for these assets.
        // Add console.log to see if this bypass rule is being hit for your files.
        console.log('Bypassing cache for Vite development server request:', event.request.url);
        return; // Let the browser handle it directly (which will go to Vite)
    }


    // --- Existing bypass rules for Firebase, EmailJS, emulator, and non-GET requests ---
    // Keep this section as it is. It's correctly handling external APIs and non-GET requests.
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

    // --- Your existing caching logic for production assets ---
    // This part will only run if the request was NOT bypassed by the above rules.
    // This is good for your production assets (e.g., when deployed to /bayanihan/).
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
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/bayanihan/index.html');
                        }
                        if (event.request.url.endsWith('.jpg') || event.request.url.endsWith('.png')) {
                            return caches.match('/bayanihan/assets/images/user.jpg');
                        }
                        throw error;
                    });
            })
    );
});




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

