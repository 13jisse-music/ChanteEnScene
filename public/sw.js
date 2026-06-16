const CACHE_NAME = 'ces-live-v2'
const OFFLINE_URL = '/offline.html'

const host = self.location.hostname
const IS_LOCAL =
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host.startsWith('192.168.') ||
  host.startsWith('10.') ||
  host.endsWith('.trycloudflare.com')

if (IS_LOCAL) {
  // Repetition locale : AUCUN cache. Le SW s'auto-desinscrit, vide les caches et
  // recharge les pages ouvertes pour toujours servir le code frais pendant les tests.
  self.addEventListener('install', () => self.skipWaiting())
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
        await self.registration.unregister()
        const windowClients = await self.clients.matchAll({ type: 'window' })
        windowClients.forEach((c) => c.navigate(c.url))
      })()
    )
  })
} else {
  // Production : comportement normal (network-first navigations + page offline).
  self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL])))
    self.skipWaiting()
  })

  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    )
    self.clients.claim()
  })

  self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
    }
  })
}

// ─── Push Notifications (inchange, actif en prod) ───

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'ChanteEnScene', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/images/pwa-icon-192.png',
    badge: payload.badge || '/images/pwa-badge-96.png',
    tag: payload.tag || 'ces-default',
    data: { url: payload.url || '/', ...payload.data },
    vibrate: [200, 100, 200],
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'ChanteEnScene', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification.data?.url || '/'
  // Always use absolute URL so the browser recognizes it's in PWA scope
  const url = rawUrl.startsWith('http') ? rawUrl : new URL(rawUrl, self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Try to find an existing PWA window and navigate it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // No existing window — openWindow with absolute URL opens the PWA if installed
      return clients.openWindow(url)
    })
  )
})
