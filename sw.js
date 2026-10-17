const CACHE = 'worddeck-v4';

// Оболочка приложения. Имена файлов должны совпадать с реальными,
// иначе addAll упадёт целиком и service worker не установится.
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
  './icon512maskable.png',
  './assets/beaver-thumbsup.png',
  './assets/beaver-arms-crossed.png',
  './assets/beaver-teacher.png',
  './assets/beaver-wave.png',
  './assets/beaver-laptop.png',
  './assets/beaver-thinking.png',
  './assets/beaver-pointing.png',
  './assets/beaver-cheer.png',
  './assets/beaver-backpack.png',
  './assets/beaver-pencil.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll падает от одного отсутствующего файла — кладём по одному
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(err => console.warn('skip', u, err)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Gemini, Supabase и авторизация — всегда в сеть, кэшировать нельзя
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('accounts.google.com')) return;

  // HTML — сначала сеть, чтобы обновление приложения доезжало сразу
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // остальное — сначала кэш
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request))
  );
});
