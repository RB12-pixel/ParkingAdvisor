self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installato');
});

self.addEventListener('fetch', (e) => {
  // Lasciamo gestire le richieste di rete al browser
  e.respondWith(fetch(e.request));
});
