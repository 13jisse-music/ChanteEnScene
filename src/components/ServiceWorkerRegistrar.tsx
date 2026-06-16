'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const host = window.location.hostname
    // En repetition locale (localhost, reseau prive, tunnel), on NE met PAS en cache :
    // on desinscrit le Service Worker existant et on vide les caches, pour toujours
    // servir le code frais pendant les tests. En prod (chantenscene.fr), comportement normal.
    const isLocalTest =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      host.endsWith('.trycloudflare.com')

    if (isLocalTest) {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
      if ('caches' in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - not critical
    })
  }, [])

  return null
}
