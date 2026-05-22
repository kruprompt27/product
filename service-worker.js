/**
 * Service Worker - จัดการสินค้า PWA
 * Version: 1.0.0
 */
const CACHE_VERSION = 'krupromsorn-product-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}-cache`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/product/',
  '/product/index.html',
  '/product/manifest.json',
  '/product/icon-192.png',
  '/product/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[Product SW] Precache failed:', err))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // ข้าม Apps Script (ต้อง live)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => {
        if (request.destination === 'document') {
          return caches.match('/product/index.html');
        }
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => event.ports[0]?.postMessage({ success: true }))
    );
  }
});
