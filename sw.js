// Service Worker for Dora Fares Al Shamal — v3.1 (network-first)
// الاستراتيجية: الشبكة أولًا دائمًا — الكاش احتياطي فقط عند انقطاع النت
const CACHE_NAME = 'dora-cache-v3.1';
const OFFLINE_FALLBACKS = [
  '/index.html',
  '/manifest.json',
  '/logo.png'
];

// التثبيت: لا نحتجز أي نسخ قديمة
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) { return cache.addAll(OFFLINE_FALLBACKS); })
      .catch(function() {})
  );
  self.skipWaiting();
});

// التفعيل: حذف كل الكاشات القديمة فورًا (وداعًا للنسخ القديمة)
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
    }).then(function() { return self.clients.claim(); })
  );
});

// الجلب: الشبكة أولًا — لو نجحت نحدّث الكاش، لو فشلت (أوفلاين) نرجع للكاش
self.addEventListener('fetch', function(event) {
  // نتجاهل طلبات غير GET وطلبات الدومينات الخارجية (Supabase وغيرها)
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // نخزن نسخة من الصفحات والملفات الناجحة فقط
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        }
        return response;
      })
      .catch(function() {
        // أوفلاين: نرجع للكاش — وللصفحات نرجع للرئيسية كملاذ أخير
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
          return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        });
      })
  );
});
