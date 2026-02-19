const CACHE_NAME = 'ces-live-v1'
const OFFLINE_URL = '/offline.html'

// Install: pre-cache offline page
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first for navigations, fallback to offline page
self.addEventListener('fetch', (event) => {
  // Only handle navigation requests (page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    )
  }
})

// ─── Push Notifications ───

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

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return clients.openWindow(url)
    })
  )
})
