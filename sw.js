// Работа без интернета: хранит копию страницы и значков.
// Обычный запуск — сразу из копии (и тихо обновляем её из сети);
// проверка обновления (?upd=…) всегда идёт в сеть; переход на новую сборку (?v=…) — из сети с запасным вариантом из копии.
const CACHE = 'graph-calc-v2';
const FILES = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function fromNet(cache) {
  const r = await fetch('./', { cache: 'no-store' });
  if (r && r.ok) await cache.put('./', r.clone());
  return r;
}
async function page(e, fresh) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match('./');
  if (hit && !fresh) {
    e.waitUntil(fromNet(cache).catch(() => {}));
    return hit;
  }
  try {
    const r = await fromNet(cache);
    if (r && r.ok) return r;
    throw new Error('bad response');
  } catch (err) {
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.searchParams.has('upd')) return;
  const scope = new URL('./', self.location.href).pathname;
  const isPage = req.mode === 'navigate' || url.pathname === scope || url.pathname === scope + 'index.html';
  if (isPage) { e.respondWith(page(e, url.searchParams.has('v'))); return; }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    if (r && r.ok && url.pathname.startsWith(scope)) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
