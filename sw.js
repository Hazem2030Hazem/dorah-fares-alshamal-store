const CACHE_NAME = 'dora-fares-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service_barcode.html',
  '/service_cameras.html',
  '/service_maintenance.html',
  '/service_network.html',
  '/service_pos.html',
  '/service_printing.html',
  '/services.html',
  '/about.html',
  '/contact.html',
  '/sw.js',
  '/sitemap.xml'
];

// Install - cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Cache opened');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(function(err) {
        console.log('[SW] Cache failed:', err);
      })
  );
  self.skipWaiting();
});

// Fetch - serve from cache or network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external image APIs that might fail
  const url = new URL(event.request.url);
  if (url.hostname.includes('placehold.co') || 
      url.hostname.includes('unsplash.com') ||
      url.hostname.includes('picsum.photos')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(function(networkResponse) {
            if (!networkResponse || networkResponse.status !== 200) {
             // السطر 56-72 المصلح:
return fetch(event.request)
    .then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
        }
        
        const responseClone = networkResponse.clone();
        
        caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
        });
        
        return networkResponse;
    })
    .catch(function() {
        return caches.match('/index.html');
    });
// Activate - clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
