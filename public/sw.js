// Service Worker para DaveFit - Offline support y caching
const CACHE_NAME = 'davefit-v1';
const STATIC_CACHE = 'davefit-static-v1';
const DYNAMIC_CACHE = 'davefit-dynamic-v1';

// Recursos estáticos a cachear en install
const STATIC_ASSETS = [
  '/',
  '/davefitIMG.ico',
  '/favicon.ico',
  '/favicon.svg',
  '/sitemap-index.xml'
];

// Instalación: cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && !cacheName.startsWith(CACHE_NAME)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de caching: CacheFirst para estáticos, NetworkFirst para API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear requests no-GET
  if (request.method !== 'GET') return;

  // Estrategia 1: API requests - Network First (con fallback a cache)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('insforge')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respuestas exitosas
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback para API failures
            return new Response(JSON.stringify({ error: 'Offline - no cached data' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Estrategia 2: Static assets (CSS, JS, fonts, images) - Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.match(/\.(css|js|woff2|ttf|png|jpg|jpeg|gif|svg|webp)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          // Cachear nuevas respuestas
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Estrategia 3: Páginas HTML - Network First (para contenido fresco)
  if (request.destination === 'document' || request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear páginas exitosas
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback a offline page si existe
            return caches.match('/offline.html').then((offlinePage) => {
              return offlinePage || new Response('Offline - no hay conexión', { status: 503, statusText: 'Service Unavailable' });
            });
          });
        })
    );
    return;
  }

  // Para otros requests, usar fetch por defecto
  event.respondWith(fetch(request));
});

// Mensajes del service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});
