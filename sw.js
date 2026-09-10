// 서비스워커 : 오프라인 캐시
// 캐시를 3개로 분리합니다.
//  - shell : HTML/CSS/JS 앱 코드 (네트워크 우선, 온라인이면 항상 최신)
//  - asset : 이미지/아이콘 (캐시 우선)
//  - cdn   : ionicons, 웹폰트 (런타임 캐시 우선)
const SHELL_CACHE = 'momemo-shell-v2';
const ASSET_CACHE = 'momemo-asset-v2';
const CDN_CACHE = 'momemo-cdn-v2';

// 앱 셸 : 코드 파일. 네트워크 우선으로 제공합니다.
const shellUrls = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/js/info.js',
  '/js/greeting.js',
  '/js/clock.js',
  '/js/calen.js',
  '/js/quotes.js',
  '/js/background.js',
  '/js/todo.js',
  '/js/fullscreen.js',
  '/js/timer.js',
  '/js/analog.js',
  '/js/scoreboard.js',
  '/js/chalk.js',
  '/js/calendar.js',
  '/js/wakelock.js',
  '/js/music.js',
  '/js/version.js',
  '/js/pwa.js',
];

// 이미지/아이콘 : 캐시 우선으로 제공합니다.
// 배경화면은 js/background.js 의 images[] 와 동일하게 유지합니다.
const assetUrls = [
  '/favicon.ico',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-152x152a.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/img/bokeh.jpg',
  '/img/clockface0.svg',
  '/img/clockface1.svg',
  '/img/clockface2.svg',
  '/img/00-solarsystem.png',
  '/img/03-schoolbag.jpg',
  '/img/04-spring.jpg',
  '/img/aibook.jpg',
  '/img/rain.jpg',
  '/img/09-forest.jpg',
  '/img/tulips_y.jpg',
  '/img/tulips_w.jpg',
  '/img/leaves.jpg',
  '/img/art.jpg',
  '/img/geo.png',
  '/img/90-keyboard.jpg',
  '/img/gwanghwa.jpg',
  '/img/dokdo.jpg',
];

// 런타임에 캐시 우선으로 저장할 외부(CDN) 오리진입니다.
const cdnHosts = [
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

const cacheWhitelist = [SHELL_CACHE, ASSET_CACHE, CDN_CACHE];

// 개별 add 를 allSettled 로 감싸, 한 파일이 404 여도 설치가 진행되도록 합니다.
function addAllSettled(cache, urls) {
  return Promise.allSettled(urls.map((url) => cache.add(url))).then((results) => {
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.warn('[sw] cache add failed:', urls[i], result.reason);
      }
    });
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => addAllSettled(cache, shellUrls)),
      caches.open(ASSET_CACHE).then((cache) => addAllSettled(cache, assetUrls)),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선 : 성공하면 캐시를 갱신하고, 실패하면 캐시로 폴백합니다.
function networkFirst(request, cacheName) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() =>
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        // 내비게이션 요청은 index.html 로 폴백합니다.
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return Response.error();
      })
    );
}

// 캐시 우선 : 캐시에 있으면 즉시 반환하고, 없으면 받아와 캐시에 담습니다.
function cacheFirst(request, cacheName) {
  return caches.match(request).then((cached) => {
    if (cached) {
      return cached;
    }
    return fetch(request).then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        const clone = response.clone();
        caches.open(cacheName).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // GET 이외(POST 등)는 가로채지 않습니다.
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 외부 오리진 처리
  if (url.origin !== self.location.origin) {
    // ionicons, 웹폰트만 캐시하고 나머지(YouTube, Analytics 등)는 통과시킵니다.
    if (cdnHosts.indexOf(url.hostname) !== -1) {
      event.respondWith(cacheFirst(request, CDN_CACHE));
    }
    return;
  }

  // 같은 오리진 : 이미지/아이콘은 캐시 우선, 나머지 코드는 네트워크 우선
  if (url.pathname.startsWith('/img/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  } else {
    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});
