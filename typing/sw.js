/* 서비스워커 — network-first + 오프라인 + 업데이트 자동 적용 (귀화앱과 동일 방식)
   배포 시 CACHE 숫자만 올리면 다음 접속 때 모든 기기가 자동 갱신됩니다. */
const CACHE = 'typing-v9';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './hangul.js',
  './data.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

let isUpdate = false;

self.addEventListener('install', (e) => {
  isUpdate = !!self.registration.active;
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    if (isUpdate) {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) { try { c.navigate(c.url); } catch (err) {} }
    }
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((c) => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
