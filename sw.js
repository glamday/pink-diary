const C = 'notatky-v5';
const FONTS = 'notatky-fonts';
const ASSETS = ['./', 'index.html', 'life.css', 'glam.css', 'life.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== C && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Спершу мережа (щоб оновлення приходили одразу), без мережі — з кешу.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Шрифти: спершу з кешу, щоб рожевий стиль працював і без інтернету.
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(new URL(req.url).hostname)) {
    e.respondWith(
      // У кеш шрифти кладе сама сторінка (warmFonts у life.js); тут лише віддаємо їх.
      caches.open(FONTS).then(c => c.match(req, { ignoreVary: true })).then(hit => hit || fetch(req))
    );
    return;
  }
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(C).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(list => (list[0] ? list[0].focus() : self.clients.openWindow('./')))
  );
});
