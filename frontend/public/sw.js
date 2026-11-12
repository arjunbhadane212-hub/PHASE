/* Phase service worker — push notifications only (no offline caching, so a
   deploy is never hidden behind a stale cache). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Phase';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.tag || 'phase',
    renotify: true,
    data: { url: data.url || '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/dashboard', self.location.origin).href;
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if (c.url.startsWith(self.location.origin)) {
        await c.focus();
        if ('navigate' in c) { try { await c.navigate(target); } catch (e) { /* cross-origin guard */ } }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

// Browser rotated the subscription: re-subscribe and let the app re-save it on
// next open (the app calls syncPushSubscription on load).
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const old = event.oldSubscription;
      if (old && old.options) await self.registration.pushManager.subscribe(old.options);
    } catch (e) { /* the app will re-subscribe on next open */ }
  })());
});
