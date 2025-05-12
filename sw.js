const CACHE_NAME = 'my-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/analog.js',
  '/js/backgrounds.js',
  '/js/clock.js',
  '/js/calen.js',
  '/js/calendar.js',
  '/js/chalk.js',
  '/js/fullscreen.js',
  '/js/greeting.js',
  '/js/quotes.js',
  '/js/scoreboard.js',
  '/js/timer.js',
  '/js/todo.js',
  '/js/wakelock.js',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

