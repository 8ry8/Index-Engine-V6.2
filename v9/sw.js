/* Static-shell only. User documents, IndexedDB, queue exports and API responses are never cached. */
'use strict';
const CACHE = 'efnai-v9.1.0.1-shell-v1';
const SHELL = ['./index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('efnai-v9.1.0.1-shell-') && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  const isShellAsset = SHELL.some(path => url.pathname.endsWith(path.replace('./', '/')));
  const isInScopeNavigation = request.mode === 'navigate' && url.pathname.startsWith(scopePath);
  if (!isShellAsset && !isInScopeNavigation) return;
  event.respondWith((async () => {
    if (request.mode === 'navigate') {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          await cache.put('./index.html', fresh.clone());
        }
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    }
    return (await caches.match(request)) || fetch(request);
  })());
});
