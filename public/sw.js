const CACHE = 'meal-list-boundaries-shell-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/offline.css',
  '/manifest.webmanifest',
  '/legal.css',
  '/robots.txt',
  '/icons/leaf.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/boundary-field-guide-640.webp',
  '/assets/boundary-field-guide-1024.webp',
  '/assets/boundary-field-guide-640.avif',
  '/assets/boundary-field-guide-1024.avif',
  '/assets/boundary-field-guide-1024.jpg',
  '/privacy/',
  '/terms/'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    const shell = await fetch('/index.html');
    const html = await shell.clone().text();
    await cache.put('/index.html', shell);
    const discovered = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
      .map((match) => match[1])
      .filter((path) => path.startsWith('/') && !path.startsWith('//'));
    await cache.addAll([...new Set(discovered)]);
    const stylesheets = discovered.filter((path) => path.endsWith('.css'));
    const fontAssets = (await Promise.all(stylesheets.map(async (path) => {
      const stylesheet = await fetch(path);
      const css = await stylesheet.text();
      return [...css.matchAll(/url\((['"]?)(\/[^)'"?]+)\1\)/g)].map((match) => match[2]);
    }))).flat();
    await cache.addAll([...new Set(fontAssets)]);
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(async () => (await caches.match(event.request)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }

  event.respondWith(caches.match(event.request, { ignoreVary: true }).then((cached) => cached || fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    }
    return response;
  })));
});
